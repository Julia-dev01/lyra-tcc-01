import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  asyncHandler,
  badRequest,
  forbidden,
  tooMany,
  unauthorized,
} from '../lib/http';
import { decryptField, encryptField, sha256 } from '../lib/crypto';
import { hashSecret, verifySecret } from '../lib/argon';
import {
  signPendingAdminToken,
  verifyPendingAdminToken,
} from '../lib/tokens';
import { requireAdmin } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { adminFirstAccessSchema, changePasswordSchema, totpVerifySchema } from '../schemas';
import {
  clearSessionCookies,
  issueSession,
  readRefreshToken,
  revokeAllSessions,
  rotateSession,
} from '../services/session';
import {
  generateTotpSecret,
  totpKeyUri,
  totpQrDataUrl,
  verifyTotp,
} from '../services/totp';
import { recordAudit } from '../services/audit';
import { adminLoginSchema } from '../schemas';

export const adminAuthRouter = Router();

const LOCK_THRESHOLD = 5;
const LOCK_MS = 15 * 60 * 1000;

function publicAdmin(admin: {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  totpHabilitado: boolean;
  precisaTrocarSenha: boolean;
  ultimoLogin: Date | null;
}) {
  return {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    perfil: admin.perfil,
    totpHabilitado: admin.totpHabilitado,
    precisaTrocarSenha: admin.precisaTrocarSenha,
    ultimoLogin: admin.ultimoLogin?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Login em etapas: senha -> (troca obrigatoria) -> matricula 2FA -> codigo 2FA
// ---------------------------------------------------------------------------

adminAuthRouter.post(
  '/login',
  authLimiter,
  validateBody(adminLoginSchema),
  asyncHandler(async (req, res) => {
    const { email, senha, codigoTotp } = req.body as z.infer<typeof adminLoginSchema>;
    const admin = await prisma.admin.findFirst({
      where: { email: email.toLowerCase(), excluidoEm: null },
    });
    if (!admin) throw unauthorized('E-mail ou senha inválidos.');
    if (!admin.ativo) throw forbidden('Conta desativada. Procure o Super Admin.');
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw tooMany('Conta temporariamente bloqueada. Tente novamente mais tarde.');
    }

    const ok = await verifySecret(admin.senhaHash, senha);
    if (!ok) {
      const failures = admin.loginFailures + 1;
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          loginFailures: failures,
          lockedUntil: failures >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_MS) : null,
        },
      });
      throw unauthorized('E-mail ou senha inválidos.');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { loginFailures: 0, lockedUntil: null },
    });

    if (admin.precisaTrocarSenha) {
      res.json({ step: 'change-password', pendingToken: signPendingAdminToken(admin.id) });
      return;
    }

    if (!admin.totpHabilitado) {
      res.json({ step: 'enroll-totp', pendingToken: signPendingAdminToken(admin.id) });
      return;
    }

    if (!codigoTotp) {
      res.json({ step: 'totp', pendingToken: signPendingAdminToken(admin.id) });
      return;
    }

    const secret = decryptField(admin.totpSecretEnc);
    if (!secret || !verifyTotp(codigoTotp, secret)) {
      throw unauthorized('Código de verificação inválido.');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { ultimoLogin: new Date() },
    });
    await issueSession('admin', admin.id, res, {
      perfil: admin.perfil,
      userAgent: req.get('user-agent'),
    });
    await recordAudit({
      adminId: admin.id,
      acao: 'LOGIN',
      entidade: 'Admin',
      entidadeId: admin.id,
      req,
    });
    res.json({ step: 'done', admin: publicAdmin(admin) });
  }),
);

// Troca de senha obrigatoria (primeiro acesso) usando o token pendente.
adminAuthRouter.post(
  '/change-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body as { pendingToken?: string } & Record<string, unknown>;
    const adminId = verifyPendingAdminToken(String(body.pendingToken ?? ''));
    if (!adminId) throw unauthorized('Token expirado. Faça login novamente.');

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest('Dados inválidos.', parsed.error.flatten().fieldErrors);
    }
    const { novaSenha } = parsed.data;
    const senhaHash = await hashSecret(novaSenha);
    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: { senhaHash, precisaTrocarSenha: false },
    });
    await revokeAllSessions('admin', adminId);
    await recordAudit({
      adminId,
      acao: 'TROCA_SENHA',
      entidade: 'Admin',
      entidadeId: adminId,
      req,
    });

    if (!admin.totpHabilitado) {
      res.json({ step: 'enroll-totp', pendingToken: signPendingAdminToken(adminId) });
      return;
    }
    res.json({ step: 'totp', pendingToken: signPendingAdminToken(adminId) });
  }),
);

// Troca de senha voluntaria por administrador autenticado.
adminAuthRouter.post(
  '/me/password',
  requireAdmin,
  authLimiter,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const adminId = req.auth!.sub;
    const { senhaAtual, novaSenha } = req.body as z.infer<typeof changePasswordSchema>;
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    if (!senhaAtual || !(await verifySecret(admin.senhaHash, senhaAtual))) {
      throw unauthorized('Senha atual incorreta.');
    }
    await prisma.admin.update({
      where: { id: adminId },
      data: { senhaHash: await hashSecret(novaSenha) },
    });
    await recordAudit({
      adminId,
      acao: 'TROCA_SENHA',
      entidade: 'Admin',
      entidadeId: adminId,
      req,
    });
    res.json({ ok: true });
  }),
);

// Matricula do 2FA: gera segredo (guardado cifrado, ainda inativo) e QR Code.
adminAuthRouter.post(
  '/totp/setup',
  authLimiter,
  asyncHandler(async (req, res) => {
    const adminId = verifyPendingAdminToken(String((req.body as { pendingToken?: string }).pendingToken ?? ''));
    if (!adminId) throw unauthorized('Token expirado. Faça login novamente.');
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || admin.excluidoEm) throw unauthorized();

    const secret = generateTotpSecret();
    await prisma.admin.update({
      where: { id: adminId },
      data: { totpSecretEnc: encryptField(secret), totpHabilitado: false },
    });
    res.json({
      secret,
      otpauth: totpKeyUri(admin.email, secret),
      qrDataUrl: await totpQrDataUrl(admin.email, secret),
    });
  }),
);

adminAuthRouter.post(
  '/totp/confirm',
  authLimiter,
  validateBody(totpVerifySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { codigoTotp: string; pendingToken?: string };
    const adminId = verifyPendingAdminToken(String(body.pendingToken ?? ''));
    if (!adminId) throw unauthorized('Token expirado. Faça login novamente.');
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw unauthorized();
    const secret = decryptField(admin.totpSecretEnc);
    if (!secret || !verifyTotp(body.codigoTotp, secret)) {
      throw unauthorized('Código de verificação inválido.');
    }
    await prisma.admin.update({
      where: { id: adminId },
      data: { totpHabilitado: true, ultimoLogin: new Date() },
    });
    await issueSession('admin', adminId, res, {
      perfil: admin.perfil,
      userAgent: req.get('user-agent'),
    });
    await recordAudit({
      adminId,
      acao: 'TOTP_ATIVADO',
      entidade: 'Admin',
      entidadeId: adminId,
      req,
    });
    res.json({ step: 'done', admin: publicAdmin({ ...admin, totpHabilitado: true }) });
  }),
);

adminAuthRouter.post(
  '/verify-2fa',
  authLimiter,
  validateBody(totpVerifySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { codigoTotp: string; pendingToken?: string };
    const adminId = verifyPendingAdminToken(String(body.pendingToken ?? ''));
    if (!adminId) throw unauthorized('Token expirado. Faça login novamente.');
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.totpHabilitado) throw unauthorized();
    const secret = decryptField(admin.totpSecretEnc);
    if (!secret || !verifyTotp(body.codigoTotp, secret)) {
      throw unauthorized('Código de verificação inválido.');
    }
    await prisma.admin.update({
      where: { id: adminId },
      data: { ultimoLogin: new Date() },
    });
    await issueSession('admin', adminId, res, {
      perfil: admin.perfil,
      userAgent: req.get('user-agent'),
    });
    await recordAudit({
      adminId,
      acao: 'LOGIN_2FA',
      entidade: 'Admin',
      entidadeId: adminId,
      req,
    });
    res.json({ step: 'done', admin: publicAdmin(admin) });
  }),
);

// Primeiro acesso por convite (token enviado por e-mail).
adminAuthRouter.post(
  '/first-access',
  authLimiter,
  validateBody(adminFirstAccessSchema),
  asyncHandler(async (req, res) => {
    const { token, novaSenha } = req.body as z.infer<typeof adminFirstAccessSchema>;
    const tokenHash = sha256(token);
    const admin = await prisma.admin.findFirst({
      where: {
        primeiroAcessoTokenHash: tokenHash,
        excluidoEm: null,
        primeiroAcessoExpira: { gt: new Date() },
      },
    });
    if (!admin) throw unauthorized('Convite inválido ou expirado.');
    const senhaHash = await hashSecret(novaSenha);
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        senhaHash,
        precisaTrocarSenha: false,
        primeiroAcessoTokenHash: null,
        primeiroAcessoExpira: null,
        ativo: true,
      },
    });
    await recordAudit({
      adminId: admin.id,
      acao: 'PRIMEIRO_ACESSO',
      entidade: 'Admin',
      entidadeId: admin.id,
      req,
    });
    res.json({ step: 'enroll-totp', pendingToken: signPendingAdminToken(admin.id) });
  }),
);

// ---------------------------------------------------------------------------
// Sessao administrativa
// ---------------------------------------------------------------------------

adminAuthRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'admin');
    if (refresh) {
      await prisma.session.updateMany({
        where: { refreshHash: sha256(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookies(res, 'admin');
    res.status(204).end();
  }),
);

adminAuthRouter.post(
  '/quick-exit',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'admin');
    if (refresh) {
      await prisma.session.updateMany({
        where: { refreshHash: sha256(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookies(res, 'admin');
    res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.status(204).end();
  }),
);

adminAuthRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'admin');
    if (!refresh) throw unauthorized();
    await rotateSession('admin', refresh, res, { userAgent: req.get('user-agent') });
    res.json({ ok: true });
  }),
);

adminAuthRouter.get(
  '/me',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.auth!.sub } });
    if (!admin || admin.excluidoEm) throw unauthorized();
    res.set('Cache-Control', 'no-store');
    res.json({ admin: publicAdmin(admin) });
  }),
);
