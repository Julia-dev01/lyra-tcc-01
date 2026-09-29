import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { publicLimiter } from '../middleware/rateLimit';
import { createCaptcha } from '../services/captcha';

export const publicRouter = Router();

// Usado pelo frontend no boot (tambem inicializa o cookie CSRF).
publicRouter.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', service: 'alerta-segura', time: new Date().toISOString() });
});

publicRouter.get('/captcha', publicLimiter, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(createCaptcha());
});

// Telefones de emergencia (conteudo publico estatico).
publicRouter.get('/emergency-numbers', (_req, res) => {
  res.json([
    { numero: '190', nome: 'Polícia Militar', descricao: 'Emergência policial' },
    { numero: '192', nome: 'SAMU', descricao: 'Ambulância / urgência médica' },
    { numero: '193', nome: 'Bombeiros', descricao: 'Corpo de Bombeiros' },
    { numero: '180', nome: 'Central de Atendimento à Mulher', descricao: 'Orientação e denúncia' },
    { numero: '100', nome: 'Direitos Humanos', descricao: 'Denúncias de violações' },
  ]);
});

publicRouter.get(
  '/content/ngos',
  publicLimiter,
  asyncHandler(async (_req, res) => {
    const ngos = await prisma.ngo.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
    res.set('Cache-Control', 'no-store');
    res.json(ngos);
  }),
);

publicRouter.get(
  '/content/pages',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
    const pages = await prisma.contentPage.findMany({
      where: {
        publicado: true,
        ...(tipo ? { tipo: tipo as never } : {}),
      },
      orderBy: [{ ordem: 'asc' }, { titulo: 'asc' }],
    });
    res.set('Cache-Control', 'no-store');
    res.json(pages);
  }),
);
