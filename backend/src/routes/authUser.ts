import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, tooMany, unauthorized } from '../lib/http';
import { blindIndex, randomToken } from '../lib/crypto';
import { hashSecret, verifySecret } from '../lib/argon';
import { validateBody } from '../middleware/validate';
import { userLoginSchema, publicRegisterSchema } from '../schemas';
import { requireUser } from '../middleware/auth';
import {
  clearSessionCookies,
  issueSession,
  readRefreshToken,
  revokeSessionById,
  rotateSession,
} from '../services/session';
import { authLimiter } from '../middleware/rateLimit';
import { buildUserData, toUserDTO } from '../services/users';
import { z } from 'zod';

export const authUserRouter = Router();

const LOCK_THRESHOLD = 5;
const LOCK_MS = 15 * 60 * 1000;

authUserRouter.post(
  '/register',
  authLimiter,
  validateBody(publicRegisterSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof publicRegisterSchema>;
    const sessionToken = randomToken(24);
    const contato = `sessao-${sessionToken}@anon.local`;
    const pinHash = await hashSecret(sessionToken);

    const user = await prisma.user.create({
      data: buildUserData(
        {
          nomeCompleto: payload.nomeCompleto,
          apelido: null,
          contato,
          endereco: payload.endereco,
          tipoViolencia: payload.tipoViolencia,
          agressorArma: payload.agressorArma,
          consentimentoLgpd: true,
          contatos:
            payload.temFamiliar === 'SIM' && payload.telefoneFamiliar
              ? [{
                  nome: 'Familiar de emergência',
                  telefone: payload.telefoneFamiliar,
                  tipo: 'FAMILIAR',
                }]
              : undefined,
        },
        pinHash,
      ),
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });

    await issueSession('user', user.id, res, { userAgent: req.get('user-agent') });
    res.status(201).json({ user: toUserDTO(user), temFamiliar: payload.temFamiliar });
  }),
);

authUserRouter.post(
  '/login',
  authLimiter,
  validateBody(userLoginSchema),
  asyncHandler(async (req, res) => {
    const { contato, secret } = req.body as z.infer<typeof userLoginSchema>;
    const user = await prisma.user.findFirst({
      where: { contatoBidx: blindIndex(contato), excluidoEm: null },
    });

    if (!user) throw unauthorized('Contato ou PIN inválidos.');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw tooMany('Conta temporariamente bloqueada. Tente novamente mais tarde.');
    }

    const ok = await verifySecret(user.pinHash, secret);
    if (!ok) {
      const failures = user.loginFailures + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginFailures: failures,
          lockedUntil:
            failures >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_MS) : null,
        },
      });
      throw unauthorized('Contato ou PIN inválidos.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailures: 0, lockedUntil: null },
    });
    await issueSession('user', user.id, res, { userAgent: req.get('user-agent') });
    res.json({ user: toUserDTO(user) });
  }),
);

authUserRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'user');
    if (req.auth?.sid) {
      await revokeSessionById(req.auth.sid);
    } else if (refresh) {
      const { sha256 } = await import('../lib/crypto');
      await prisma.session.updateMany({
        where: { refreshHash: sha256(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookies(res, 'user');
    res.status(204).end();
  }),
);

// Saída rápida: invalida a sessao no servidor e limpa cookies.
authUserRouter.post(
  '/quick-exit',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'user');
    if (refresh) {
      const { sha256 } = await import('../lib/crypto');
      await prisma.session.updateMany({
        where: { refreshHash: sha256(refresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookies(res, 'user');
    res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.status(204).end();
  }),
);

authUserRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refresh = readRefreshToken(req, 'user');
    if (!refresh) throw unauthorized();
    const { accessToken } = await rotateSession('user', refresh, res, {
      userAgent: req.get('user-agent'),
    });
    res.json({ ok: true, accessToken: accessToken.slice(0, 8) + '...' });
  }),
);

authUserRouter.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.auth!.sub, excluidoEm: null },
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    if (!user) throw unauthorized();
    res.set('Cache-Control', 'no-store');
    res.json({ user: toUserDTO(user) });
  }),
);
