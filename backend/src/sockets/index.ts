import type { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/tokens';
import { decryptField } from '../lib/crypto';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

// Tempo real do chat anonimo e dos alertas administrativos.
export function registerSockets(io: Server) {
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const adminToken = cookies['as_admin_at'];
      if (adminToken) {
        const payload = verifyAccessToken(adminToken);
        if (payload?.typ === 'admin') {
          const session = await prisma.session.findUnique({ where: { id: payload.sid } });
          const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
          if (session && !session.revokedAt && admin?.ativo && !admin.excluidoEm) {
            socket.data.adminId = admin.id;
            socket.data.perfil = admin.perfil;
            return next();
          }
        }
      }
      // Sem sessao administrativa: conexao anonima (chat). Validada ao entrar na sala.
      return next();
    } catch {
      return next();
    }
  });

  io.on('connection', (socket: Socket) => {
    if (socket.data.adminId) {
      socket.join('admins');
    }

    // Entra numa sala de conversa anonima.
    socket.on('chat:join', async (payload: { token?: string }) => {
      const token = payload?.token;
      if (!token || typeof token !== 'string') return;
      const session = await prisma.chatSession.findUnique({
        where: { tokenAnonimo: token },
        select: { id: true, status: true },
      });
      if (!session || session.status === 'ENCERRADA') {
        socket.emit('chat:closed', {});
        return;
      }
      socket.join(`chat:${token}`);
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { criadoEm: 'asc' },
      });
      socket.emit(
        'chat:history',
        messages.map((m) => ({
          id: m.id,
          remetente: m.remetente,
          conteudo: decryptField(m.conteudoCriptografado) ?? '',
          criadoEm: m.criadoEm.toISOString(),
        })),
      );
    });

    // Administrador entra na sala de uma conversa para responder em tempo real.
    socket.on('admin:join-chat', async (payload: { sessionId?: string }) => {
      if (!socket.data.adminId || !payload?.sessionId) return;
      const session = await prisma.chatSession.findUnique({
        where: { id: payload.sessionId },
        select: { tokenAnonimo: true },
      });
      if (session) socket.join(`chat:${session.tokenAnonimo}`);
    });
  });
}
