import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, notFound } from '../lib/http';
import { decryptField, encryptField, randomToken } from '../lib/crypto';
import { publicLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { chatMessageSchema } from '../schemas';
import { emitToAdmins, emitToChat } from '../services/realtime';
import { env } from '../config/env';

export const chatRouter = Router();

const WELCOME =
  'Olá, você está em um ambiente seguro e anônimo. Como posso ajudar você hoje?';

function messageDTO(m: {
  id: string;
  remetente: string;
  conteudoCriptografado: string;
  criadoEm: Date;
}) {
  return {
    id: m.id,
    remetente: m.remetente,
    conteudo: decryptField(m.conteudoCriptografado) ?? '',
    criadoEm: m.criadoEm.toISOString(),
  };
}

// Cria uma sessao anonima. Nao armazena IP nem qualquer identificador da pessoa.
chatRouter.post(
  '/sessions',
  publicLimiter,
  asyncHandler(async (_req, res) => {
    const token = randomToken(32);
    const session = await prisma.chatSession.create({
      data: { tokenAnonimo: token },
    });
    const welcome = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        remetente: 'SISTEMA',
        conteudoCriptografado: encryptField(WELCOME) as string,
      },
    });
    res.status(201).json({
      token,
      status: session.status,
      retencaoHoras: env.ANON_CHAT_TTL_HOURS,
      messages: [messageDTO(welcome)],
    });
  }),
);

chatRouter.get(
  '/sessions/:token',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.findUnique({
      where: { tokenAnonimo: req.params.token },
      include: { messages: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!session) throw notFound('Conversa não encontrada ou já apagada.');
    res.set('Cache-Control', 'no-store');
    res.json({
      token: session.tokenAnonimo,
      status: session.status,
      retencaoHoras: env.ANON_CHAT_TTL_HOURS,
      messages: session.messages.map(messageDTO),
    });
  }),
);

chatRouter.post(
  '/sessions/:token/messages',
  publicLimiter,
  validateBody(chatMessageSchema),
  asyncHandler(async (req, res) => {
    const { conteudo } = req.body as { conteudo: string };
    const session = await prisma.chatSession.findUnique({
      where: { tokenAnonimo: req.params.token },
    });
    if (!session) throw notFound('Conversa não encontrada ou já apagada.');
    if (session.status === 'ENCERRADA') {
      throw notFound('Esta conversa foi encerrada.');
    }
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        remetente: 'USUARIA',
        conteudoCriptografado: encryptField(conteudo) as string,
      },
    });
    const dto = messageDTO(message);
    emitToChat(session.tokenAnonimo, 'chat:message', dto);
    emitToAdmins('chat:message', {
      sessionId: session.id,
      token: session.tokenAnonimo,
      ...dto,
    });
    res.status(201).json(dto);
  }),
);

// Encerrar e apagar a conversa imediatamente.
chatRouter.post(
  '/sessions/:token/close',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.findUnique({
      where: { tokenAnonimo: req.params.token },
    });
    if (!session) {
      res.status(204).end();
      return;
    }
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { sessionId: session.id } }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: { status: 'ENCERRADA', encerradoEm: new Date() },
      }),
    ]);
    emitToAdmins('chat:closed', { sessionId: session.id });
    res.status(204).end();
  }),
);
