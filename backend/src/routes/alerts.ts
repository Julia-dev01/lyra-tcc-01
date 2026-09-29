import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, notFound } from '../lib/http';
import { blindIndex, decryptField, maskContact } from '../lib/crypto';
import { requireUser } from '../middleware/auth';
import { alertLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { alertCreateSchema } from '../schemas';
import { getDispatcher, type Canal } from '../services/alertDispatcher';
import { emitToAdmins } from '../services/realtime';

export const alertsRouter = Router();

const EMERGENCY_NUMBERS = ['190', '180', '100'];

function canalForTipo(tipo: string): Canal {
  if (tipo === 'ONG') return 'WHATSAPP';
  if (tipo === 'POLICIA') return 'SMS';
  return 'SMS';
}

alertsRouter.post(
  '/',
  requireUser,
  alertLimiter,
  validateBody(alertCreateSchema),
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };

    const user = await prisma.user.findFirst({
      where: { id: userId, excluidoEm: null },
      include: { emergencyContacts: { where: { excluidoEm: null } } },
    });
    if (!user) throw notFound('Cadastro não encontrado');

    const armaPresente = user.agressorArmaBidx === blindIndex('SIM');
    const prioridade = armaPresente ? 'ALTA' : 'MEDIA';

    const alert = await prisma.alert.create({
      data: {
        userId,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        armaPresente,
        prioridade: prioridade as never,
        status: 'NOVO',
      },
    });

    const dispatcher = getDispatcher();
    const nome = decryptField(user.nomeCompletoEnc) ?? 'Usuária';
    const contato = decryptField(user.contatoEnc) ?? '';
    const mensagem =
      `Alerta Segura: pedido de ajuda de ${nome}. ` +
      `Contato: ${contato}. Localização: ${
        latitude != null ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'não informada'
      }. Risco com arma: ${armaPresente ? 'SIM' : 'não informado'}.`;

    const targets: Array<{ canal: Canal; destino: string }> = [];
    for (const c of user.emergencyContacts) {
      const destino = decryptField(c.telefoneEnc) ?? '';
      if (destino) targets.push({ canal: canalForTipo(c.tipo), destino });
    }
    for (const numero of EMERGENCY_NUMBERS) {
      targets.push({ canal: 'INTERNAL', destino: numero });
    }

    let notificados = 0;
    for (const target of targets) {
      const result = await dispatcher.send({
        canal: target.canal,
        destino: target.destino,
        mensagem,
      });
      if (result.status !== 'FALHA') notificados += 1;
      await prisma.alertDispatch.create({
        data: {
          alertId: alert.id,
          canal: target.canal,
          destinoMascarado: maskContact(target.destino),
          status: result.status,
          providerRef: result.providerRef ?? null,
        },
      });
    }

    // Notifica administradores conectados em tempo real (sem IP da usuaria).
    emitToAdmins('alert:new', {
      id: alert.id,
      status: alert.status,
      prioridade: alert.prioridade,
      armaPresente,
      latitude: alert.latitude,
      longitude: alert.longitude,
      criadoEm: alert.criadoEm.toISOString(),
      usuaria: nome,
    });

    res.status(201).json({
      alert: {
        id: alert.id,
        status: alert.status,
        prioridade: alert.prioridade,
        armaPresente,
        latitude: alert.latitude,
        longitude: alert.longitude,
        criadoEm: alert.criadoEm.toISOString(),
      },
      contatosNotificados: notificados,
      mensagem: 'Alerta enviado com sucesso! Seus contatos foram notificados.',
    });
  }),
);

alertsRouter.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const alerts = await prisma.alert.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });
    res.set('Cache-Control', 'no-store');
    res.json(
      alerts.map((a) => ({
        id: a.id,
        status: a.status,
        prioridade: a.prioridade,
        armaPresente: a.armaPresente,
        criadoEm: a.criadoEm.toISOString(),
      })),
    );
  }),
);
