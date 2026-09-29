import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  asyncHandler,
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../lib/http';
import {
  blindIndex,
  decryptField,
  encryptField,
  randomToken,
  searchTokenFor,
  sha256,
  tokenizeForSearch,
} from '../lib/crypto';
import { hashSecret } from '../lib/argon';
import { requireAdmin, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  adminCreateSchema,
  adminUpdateSchema,
  alertUpdateSchema,
  chatMessageSchema,
  userRegisterSchema,
  userUpdateSchema,
} from '../schemas';
import { buildUserData, toUserDTO } from '../services/users';
import { recordAudit } from '../services/audit';
import { emitToChat } from '../services/realtime';
import { revokeAllSessions } from '../services/session';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const activeStatuses = ['NOVO', 'EM_ATENDIMENTO', 'ENCAMINHADO'] as const;

    const [alertasAtivos, alertasComArma, totalCadastros, chatsAbertos, porTipo, porStatus] =
      await Promise.all([
        prisma.alert.count({ where: { status: { in: activeStatuses as never } } }),
        prisma.alert.count({
          where: { status: { in: activeStatuses as never }, armaPresente: true },
        }),
        prisma.user.count({ where: { excluidoEm: null } }),
        prisma.chatSession.count({ where: { NOT: { status: 'ENCERRADA' } } }),
        prisma.user.groupBy({
          by: ['tipoViolenciaBidx'],
          where: { excluidoEm: null },
          _count: { _all: true },
        }),
        prisma.alert.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);

    const { resolveTipoByBidx } = await import('../lib/labels');
    const graficoTipo = porTipo.map((row) => ({
      tipo: resolveTipoByBidx(row.tipoViolenciaBidx),
      total: row._count._all,
    }));

    const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    const recent = await prisma.alert.findMany({
      where: { criadoEm: { gte: since } },
      select: { criadoEm: true },
    });
    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const alert of recent) {
      const key = alert.criadoEm.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    res.set('Cache-Control', 'no-store');
    res.json({
      alertasAtivos,
      alertasComArma,
      totalCadastros,
      chatsAbertos,
      graficoTipo,
      graficoStatus: porStatus.map((s) => ({ status: s.status, total: s._count._all })),
      graficoPeriodo: [...byDay.entries()].map(([dia, total]) => ({ dia, total })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Administradores (somente Super Admin)
// ---------------------------------------------------------------------------

adminRouter.get(
  '/admins',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (_req, res) => {
    const admins = await prisma.admin.findMany({
      where: { excluidoEm: null },
      orderBy: { criadoEm: 'asc' },
    });
    res.json(
      admins.map((a) => ({
        id: a.id,
        nome: a.nome,
        email: a.email,
        perfil: a.perfil,
        ativo: a.ativo,
        totpHabilitado: a.totpHabilitado,
        precisaTrocarSenha: a.precisaTrocarSenha,
        ultimoLogin: a.ultimoLogin?.toISOString() ?? null,
        criadoEm: a.criadoEm.toISOString(),
      })),
    );
  }),
);

adminRouter.post(
  '/admins',
  requireRole('SUPER_ADMIN'),
  validateBody(adminCreateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof adminCreateSchema>;
    const email = data.email.toLowerCase();
    const existing = await prisma.admin.findFirst({
      where: { email, excluidoEm: null },
      select: { id: true },
    });
    if (existing) throw conflict('Já existe um administrador com este e-mail.');

    const inviteToken = randomToken(32);
    const unusable = await hashSecret(randomToken(24));
    const admin = await prisma.admin.create({
      data: {
        nome: data.nome,
        email,
        perfil: data.perfil,
        senhaHash: unusable,
        ativo: true,
        precisaTrocarSenha: true,
        primeiroAcessoTokenHash: sha256(inviteToken),
        primeiroAcessoExpira: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ADMIN_CRIADO',
      entidade: 'Admin',
      entidadeId: admin.id,
      req,
      detalhes: { perfil: admin.perfil },
    });
    res.status(201).json({
      admin: { id: admin.id, nome: admin.nome, email: admin.email, perfil: admin.perfil },
      convite: {
        link: `${process.env.APP_URL ?? 'http://localhost:5173'}/admin/primeiro-acesso?token=${inviteToken}`,
        expiraEmHoras: 48,
        observacao:
          'Em produção este link é enviado por e-mail. O acesso exige troca de senha e matrícula do 2FA.',
      },
    });
  }),
);

adminRouter.put(
  '/admins/:id',
  requireRole('SUPER_ADMIN'),
  validateBody(adminUpdateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof adminUpdateSchema>;
    if (req.params.id === req.auth!.sub && data.ativo === false) {
      throw badRequest('Você não pode desativar a própria conta.');
    }
    const admin = await prisma.admin.update({
      where: { id: req.params.id },
      data,
    });
    if (data.ativo === false) await revokeAllSessions('admin', admin.id);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ADMIN_ATUALIZADO',
      entidade: 'Admin',
      entidadeId: admin.id,
      req,
      detalhes: data as Record<string, unknown>,
    });
    res.json({ ok: true });
  }),
);

adminRouter.post(
  '/admins/:id/reset-password',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const inviteToken = randomToken(32);
    const admin = await prisma.admin.update({
      where: { id: req.params.id },
      data: {
        precisaTrocarSenha: true,
        primeiroAcessoTokenHash: sha256(inviteToken),
        primeiroAcessoExpira: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    await revokeAllSessions('admin', admin.id);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ADMIN_RESET_SENHA',
      entidade: 'Admin',
      entidadeId: admin.id,
      req,
    });
    res.json({
      link: `${process.env.APP_URL ?? 'http://localhost:5173'}/admin/primeiro-acesso?token=${inviteToken}`,
      expiraEmHoras: 48,
    });
  }),
);

adminRouter.delete(
  '/admins/:id',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.auth!.sub) {
      throw badRequest('Você não pode excluir a própria conta.');
    }
    await prisma.admin.update({
      where: { id: req.params.id },
      data: { excluidoEm: new Date(), ativo: false },
    });
    await revokeAllSessions('admin', req.params.id);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ADMIN_EXCLUIDO',
      entidade: 'Admin',
      entidadeId: req.params.id,
      req,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Usuarias
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  tipo: z.string().trim().optional(),
  arquivadas: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const arquivadas = query.arquivadas === 'true';

    const where: Record<string, unknown> = {
      excluidoEm: arquivadas ? { not: null } : null,
    };
    if (query.tipo) {
      where.tipoViolenciaBidx = blindIndex(query.tipo);
    }
    if (query.search) {
      const token = searchTokenFor(query.search);
      where.OR = [
        ...(token ? [{ searchTokens: { has: token } }] : []),
        { contatoBidx: blindIndex(query.search) },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { emergencyContacts: { where: { excluidoEm: null } } },
      }),
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      total,
      page: query.page,
      pageSize: query.pageSize,
      users: users.map(toUserDTO),
    });
  }),
);

adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        emergencyContacts: { where: { excluidoEm: null } },
        alerts: { orderBy: { criadoEm: 'desc' }, take: 20 },
      },
    });
    if (!user) throw notFound('Usuária não encontrada');
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'VISUALIZAR_USUARIA',
      entidade: 'User',
      entidadeId: user.id,
      req,
    });
    res.set('Cache-Control', 'no-store');
    res.json({
      user: toUserDTO(user),
      alertas: user.alerts.map((a) => ({
        id: a.id,
        status: a.status,
        prioridade: a.prioridade,
        armaPresente: a.armaPresente,
        criadoEm: a.criadoEm.toISOString(),
      })),
    });
  }),
);

// Cadastro manual (atendimento por telefone ou presencial).
adminRouter.post(
  '/users',
  validateBody(userRegisterSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof userRegisterSchema>;
    const contatoBidx = blindIndex(payload.contato);
    const existing = await prisma.user.findFirst({
      where: { contatoBidx, excluidoEm: null },
      select: { id: true },
    });
    if (existing) throw conflict('Já existe um cadastro com este contato.');

    const user = await prisma.user.create({
      data: buildUserData(
        {
          nomeCompleto: payload.nomeCompleto,
          apelido: payload.apelido ?? null,
          contato: payload.contato,
          endereco: payload.endereco,
          tipoViolencia: payload.tipoViolencia,
          agressorArma: payload.agressorArma,
          consentimentoLgpd: true,
          contatos: payload.contatos,
        },
        await hashSecret(payload.secret),
      ),
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CADASTRO_MANUAL_USUARIA',
      entidade: 'User',
      entidadeId: user.id,
      req,
    });
    res.status(201).json({ user: toUserDTO(user) });
  }),
);

adminRouter.put(
  '/users/:id',
  validateBody(userUpdateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof userUpdateSchema>;
    const id = req.params.id;
    const update: Record<string, unknown> = {};
    if (data.nomeCompleto !== undefined || data.apelido !== undefined) {
      const current = await prisma.user.findUniqueOrThrow({ where: { id } });
      const nome = data.nomeCompleto ?? decryptField(current.nomeCompletoEnc) ?? '';
      const apelido =
        data.apelido !== undefined
          ? data.apelido
          : decryptField(current.apelidoEnc);
      if (data.nomeCompleto !== undefined) update.nomeCompletoEnc = encryptField(nome);
      if (data.apelido !== undefined) update.apelidoEnc = encryptField(apelido);
      update.searchTokens = tokenizeForSearch(nome, apelido);
    }
    if (data.contato !== undefined) {
      update.contatoEnc = encryptField(data.contato);
      update.contatoBidx = blindIndex(data.contato);
    }
    if (data.endereco !== undefined) update.enderecoEnc = encryptField(data.endereco);
    if (data.tipoViolencia !== undefined) {
      update.tipoViolenciaEnc = encryptField(data.tipoViolencia);
      update.tipoViolenciaBidx = blindIndex(data.tipoViolencia);
    }
    if (data.agressorArma !== undefined) {
      update.agressorArmaEnc = encryptField(data.agressorArma);
      update.agressorArmaBidx = blindIndex(data.agressorArma);
    }
    const user = await prisma.user.update({
      where: { id },
      data: update,
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'USUARIA_ATUALIZADA',
      entidade: 'User',
      entidadeId: id,
      req,
    });
    res.json({ user: toUserDTO(user) });
  }),
);

adminRouter.post(
  '/users/:id/archive',
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { excluidoEm: new Date() },
    });
    await revokeAllSessions('user', req.params.id);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'USUARIA_ARQUIVADA',
      entidade: 'User',
      entidadeId: req.params.id,
      req,
    });
    res.status(204).end();
  }),
);

adminRouter.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await prisma.$transaction([
      prisma.emergencyContact.updateMany({
        where: { userId: id },
        data: { excluidoEm: new Date() },
      }),
      prisma.user.update({
        where: { id },
        data: {
          nomeCompletoEnc: encryptField('Titular excluído (LGPD)') as string,
          apelidoEnc: null,
          contatoEnc: encryptField(`excluido-${id}@anon`) as string,
          contatoBidx: blindIndex(`excluido-${id}`),
          searchTokens: [],
          enderecoEnc: encryptField('Removido por solicitação (LGPD)') as string,
          excluidoEm: new Date(),
          consentimentoLgpd: false,
        },
      }),
    ]);
    await revokeAllSessions('user', id);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'LGPD_EXCLUSAO_USUARIA',
      entidade: 'User',
      entidadeId: id,
      req,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

adminRouter.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const prioridade =
      typeof req.query.prioridade === 'string' ? req.query.prioridade : undefined;
    const alerts = await prisma.alert.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(prioridade ? { prioridade: prioridade as never } : {}),
      },
      orderBy: [{ prioridade: 'asc' }, { criadoEm: 'desc' }],
      take: 200,
      include: { user: true, dispatches: true },
    });
    res.set('Cache-Control', 'no-store');
    res.json(
      alerts.map((a) => ({
        id: a.id,
        status: a.status,
        prioridade: a.prioridade,
        armaPresente: a.armaPresente,
        latitude: a.latitude,
        longitude: a.longitude,
        encaminhadoPara: a.encaminhadoPara,
        notas: a.notas,
        criadoEm: a.criadoEm.toISOString(),
        usuaria: {
          id: a.userId,
          nome: decryptField(a.user.nomeCompletoEnc) ?? '',
          contato: decryptField(a.user.contatoEnc) ?? '',
          tipoViolencia: decryptField(a.user.tipoViolenciaEnc) ?? '',
        },
        notificacoes: a.dispatches.length,
      })),
    );
  }),
);

adminRouter.put(
  '/alerts/:id',
  validateBody(alertUpdateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof alertUpdateSchema>;
    const existing = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Alerta não encontrado');

    const alert = await prisma.alert.update({
      where: { id: existing.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.encaminhadoPara !== undefined
          ? { encaminhadoPara: data.encaminhadoPara }
          : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {}),
        ...(data.status === 'EM_ATENDIMENTO' && !existing.atendidoPorId
          ? { atendidoPorId: req.auth!.sub }
          : {}),
      },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ALERTA_ATUALIZADO',
      entidade: 'Alert',
      entidadeId: alert.id,
      req,
      detalhes: data as Record<string, unknown>,
    });
    res.json({ ok: true, status: alert.status });
  }),
);

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

adminRouter.get(
  '/chats',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { atualizadoEm: 'desc' },
      take: 100,
      include: {
        admin: { select: { id: true, nome: true } },
        _count: { select: { messages: true } },
      },
    });
    res.set('Cache-Control', 'no-store');
    res.json(
      sessions.map((s) => ({
        id: s.id,
        token: s.tokenAnonimo,
        status: s.status,
        admin: s.admin?.nome ?? null,
        mensagens: s._count.messages,
        criadoEm: s.criadoEm.toISOString(),
        encerradoEm: s.encerradoEm?.toISOString() ?? null,
      })),
    );
  }),
);

adminRouter.get(
  '/chats/:id/messages',
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!session) throw notFound('Conversa não encontrada');
    res.set('Cache-Control', 'no-store');
    res.json({
      id: session.id,
      status: session.status,
      messages: session.messages.map((m) => ({
        id: m.id,
        remetente: m.remetente,
        conteudo: decryptField(m.conteudoCriptografado) ?? '',
        criadoEm: m.criadoEm.toISOString(),
      })),
    });
  }),
);

adminRouter.post(
  '/chats/:id/messages',
  validateBody(chatMessageSchema),
  asyncHandler(async (req, res) => {
    const { conteudo } = req.body as { conteudo: string };
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw notFound('Conversa não encontrada');
    if (session.status === 'ENCERRADA') throw badRequest('Conversa já encerrada.');

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        remetente: 'ESPECIALISTA',
        conteudoCriptografado: encryptField(conteudo) as string,
      },
    });
    if (!session.adminId) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { adminId: req.auth!.sub, status: 'EM_ATENDIMENTO' },
      });
    }
    const dto = {
      id: message.id,
      remetente: message.remetente,
      conteudo,
      criadoEm: message.criadoEm.toISOString(),
    };
    emitToChat(session.tokenAnonimo, 'chat:message', dto);
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CHAT_RESPOSTA',
      entidade: 'ChatSession',
      entidadeId: session.id,
      req,
    });
    res.status(201).json(dto);
  }),
);

adminRouter.post(
  '/chats/:id/close',
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw notFound('Conversa não encontrada');
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { sessionId: session.id } }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: { status: 'ENCERRADA', encerradoEm: new Date() },
      }),
    ]);
    emitToChat(session.tokenAnonimo, 'chat:closed', {});
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CHAT_ENCERRADO',
      entidade: 'ChatSession',
      entidadeId: session.id,
      req,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Auditoria (somente Super Admin)
// ---------------------------------------------------------------------------

adminRouter.get(
  '/audit',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 50;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { criadoEm: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { admin: { select: { nome: true, email: true } } },
      }),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
      total,
      page,
      pageSize,
      logs: logs.map((l) => ({
        id: l.id,
        admin: l.admin?.nome ?? 'Sistema',
        acao: l.acao,
        entidade: l.entidade,
        entidadeId: l.entidadeId,
        ip: l.ip,
        criadoEm: l.criadoEm.toISOString(),
      })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Configuracoes
// ---------------------------------------------------------------------------

adminRouter.get(
  '/settings',
  requireRole('SUPER_ADMIN', 'MODERADOR'),
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany();
    res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  }),
);

adminRouter.put(
  '/settings',
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, string>);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CONFIGURACOES_ATUALIZADAS',
      entidade: 'Setting',
      req,
      detalhes: { chaves: entries.map(([k]) => k) },
    });
    res.json({ ok: true });
  }),
);
