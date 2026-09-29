import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, notFound } from '../lib/http';
import { requireAdmin, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { contentPageSchema, ngoSchema } from '../schemas';
import { recordAudit } from '../services/audit';

export const contentAdminRouter = Router();

contentAdminRouter.use(requireAdmin, requireRole('SUPER_ADMIN', 'MODERADOR'));

// ---------------------------------------------------------------------------
// ONGs parceiras
// ---------------------------------------------------------------------------

contentAdminRouter.get(
  '/ngos',
  asyncHandler(async (_req, res) => {
    const ngos = await prisma.ngo.findMany({ orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] });
    res.json(ngos);
  }),
);

contentAdminRouter.post(
  '/ngos',
  validateBody(ngoSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof ngoSchema>;
    const ngo = await prisma.ngo.create({ data });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ONG_CRIADA',
      entidade: 'Ngo',
      entidadeId: ngo.id,
      req,
    });
    res.status(201).json(ngo);
  }),
);

contentAdminRouter.put(
  '/ngos/:id',
  validateBody(ngoSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.ngo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('ONG não encontrada');
    const ngo = await prisma.ngo.update({
      where: { id: existing.id },
      data: req.body as z.infer<typeof ngoSchema>,
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ONG_ATUALIZADA',
      entidade: 'Ngo',
      entidadeId: ngo.id,
      req,
    });
    res.json(ngo);
  }),
);

contentAdminRouter.delete(
  '/ngos/:id',
  asyncHandler(async (req, res) => {
    await prisma.ngo.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'ONG_DESATIVADA',
      entidade: 'Ngo',
      entidadeId: req.params.id,
      req,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Orientações (paginas de conteudo)
// ---------------------------------------------------------------------------

contentAdminRouter.get(
  '/content-pages',
  asyncHandler(async (_req, res) => {
    const pages = await prisma.contentPage.findMany({
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }],
    });
    res.json(pages);
  }),
);

contentAdminRouter.post(
  '/content-pages',
  validateBody(contentPageSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof contentPageSchema>;
    const page = await prisma.contentPage.create({ data });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CONTEUDO_CRIADO',
      entidade: 'ContentPage',
      entidadeId: page.id,
      req,
    });
    res.status(201).json(page);
  }),
);

contentAdminRouter.put(
  '/content-pages/:id',
  validateBody(contentPageSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.contentPage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Conteúdo não encontrado');
    const page = await prisma.contentPage.update({
      where: { id: existing.id },
      data: req.body as z.infer<typeof contentPageSchema>,
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CONTEUDO_ATUALIZADO',
      entidade: 'ContentPage',
      entidadeId: page.id,
      req,
    });
    res.json(page);
  }),
);

contentAdminRouter.delete(
  '/content-pages/:id',
  asyncHandler(async (req, res) => {
    await prisma.contentPage.update({
      where: { id: req.params.id },
      data: { publicado: false },
    });
    await recordAudit({
      adminId: req.auth!.sub,
      acao: 'CONTEUDO_DESPUBLICADO',
      entidade: 'ContentPage',
      entidadeId: req.params.id,
      req,
    });
    res.status(204).end();
  }),
);
