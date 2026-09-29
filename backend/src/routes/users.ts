import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, conflict, notFound } from '../lib/http';
import { blindIndex, decryptField, encryptField, tokenizeForSearch } from '../lib/crypto';
import { hashSecret } from '../lib/argon';
import { requireUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { emergencyContactInput, userUpdateSchema } from '../schemas';
import { toUserDTO } from '../services/users';
import { revokeAllSessions } from '../services/session';
import { recordAudit } from '../services/audit';

export const usersRouter = Router();

usersRouter.use(requireUser);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.auth!.sub, excluidoEm: null },
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    if (!user) throw notFound('Cadastro não encontrado');
    res.set('Cache-Control', 'no-store');
    res.json({ user: toUserDTO(user) });
  }),
);

usersRouter.put(
  '/me',
  validateBody(userUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = req.auth!.sub;
    const data = req.body as import('zod').infer<typeof userUpdateSchema>;

    const update: Record<string, unknown> = {};
    if (data.nomeCompleto !== undefined || data.apelido !== undefined) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      const nome = data.nomeCompleto ?? toUserDTO(user).nomeCompleto;
      const apelido = data.apelido !== undefined ? data.apelido : undefined;
      if (data.nomeCompleto !== undefined) update.nomeCompletoEnc = encryptField(nome);
      if (apelido !== undefined) update.apelidoEnc = encryptField(apelido);
      update.searchTokens = tokenizeForSearch(
        nome,
        apelido !== undefined ? apelido : null,
      );
    }
    if (data.contato !== undefined) {
      const contatoBidx = blindIndex(data.contato);
      const existing = await prisma.user.findFirst({
        where: { contatoBidx, excluidoEm: null, NOT: { id } },
        select: { id: true },
      });
      if (existing) throw conflict('Este contato já está em uso.');
      update.contatoEnc = encryptField(data.contato);
      update.contatoBidx = contatoBidx;
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
    if (data.secret !== undefined) {
      update.pinHash = await hashSecret(data.secret);
    }

    const user = await prisma.user.update({
      where: { id },
      data: update,
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    res.json({ user: toUserDTO(user) });
  }),
);

// Direito de exclusao (LGPD): soft delete + anonimizacao irreversivel.
usersRouter.delete(
  '/me',
  asyncHandler(async (req, res) => {
    const id = req.auth!.sub;
    await prisma.$transaction([
      prisma.emergencyContact.updateMany({
        where: { userId: id },
        data: { excluidoEm: new Date() },
      }),
      prisma.user.update({
        where: { id },
        data: {
          nomeCompletoEnc: encryptField('Titular excluído') as string,
          apelidoEnc: null,
          contatoEnc: encryptField(`excluido-${id}@anon`) as string,
          contatoBidx: blindIndex(`excluido-${id}`),
          searchTokens: [],
          enderecoEnc: encryptField('Removido a pedido da titular') as string,
          excluidoEm: new Date(),
          consentimentoLgpd: false,
        },
      }),
    ]);
    await revokeAllSessions('user', id);
    await recordAudit({
      acao: 'LGPD_EXCLUSAO_USUARIA',
      entidade: 'User',
      entidadeId: id,
      req,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Contatos de emergencia
// ---------------------------------------------------------------------------

usersRouter.get(
  '/me/contacts',
  asyncHandler(async (req, res) => {
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.auth!.sub, excluidoEm: null },
      orderBy: { criadoEm: 'asc' },
    });
    res.set('Cache-Control', 'no-store');
    res.json(
      contacts.map((c) => ({
        id: c.id,
        nome: decryptField(c.nomeEnc) ?? '',
        telefone: decryptField(c.telefoneEnc) ?? '',
        tipo: c.tipo,
      })),
    );
  }),
);

usersRouter.post(
  '/me/contacts',
  validateBody(emergencyContactInput),
  asyncHandler(async (req, res) => {
    const data = req.body as import('zod').infer<typeof emergencyContactInput>;
    const contact = await prisma.emergencyContact.create({
      data: {
        userId: req.auth!.sub,
        nomeEnc: encryptField(data.nome) as string,
        telefoneEnc: encryptField(data.telefone) as string,
        tipo: data.tipo,
      },
    });
    res.status(201).json({
      id: contact.id,
      nome: data.nome,
      telefone: data.telefone,
      tipo: contact.tipo,
    });
  }),
);

usersRouter.put(
  '/me/contacts/:id',
  validateBody(emergencyContactInput),
  asyncHandler(async (req, res) => {
    const data = req.body as import('zod').infer<typeof emergencyContactInput>;
    const existing = await prisma.emergencyContact.findFirst({
      where: { id: req.params.id, userId: req.auth!.sub, excluidoEm: null },
    });
    if (!existing) throw notFound('Contato não encontrado');
    const contact = await prisma.emergencyContact.update({
      where: { id: existing.id },
      data: {
        nomeEnc: encryptField(data.nome) as string,
        telefoneEnc: encryptField(data.telefone) as string,
        tipo: data.tipo,
      },
    });
    res.json({ id: contact.id, nome: data.nome, telefone: data.telefone, tipo: contact.tipo });
  }),
);

usersRouter.delete(
  '/me/contacts/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.emergencyContact.findFirst({
      where: { id: req.params.id, userId: req.auth!.sub, excluidoEm: null },
    });
    if (!existing) throw notFound('Contato não encontrado');
    await prisma.emergencyContact.update({
      where: { id: existing.id },
      data: { excluidoEm: new Date() },
    });
    res.status(204).end();
  }),
);
