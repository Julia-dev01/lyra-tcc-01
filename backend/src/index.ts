import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { registerSockets } from './sockets';
import { setIo } from './services/realtime';

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed =
          origin === env.APP_URL ||
          origin.endsWith('.monkeycode-ai.live') ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        cb(null, allowed);
      },
      credentials: true,
    },
    maxHttpBufferSize: 1e5,
  });
  setIo(io);
  registerSockets(io);

  // Limpeza periodica das conversas anonimas expiradas (retencao informada).
  const cleanup = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - env.ANON_CHAT_TTL_HOURS * 60 * 60 * 1000);
      const expired = await prisma.chatSession.findMany({
        where: { criadoEm: { lt: cutoff }, NOT: { status: 'ENCERRADA' } },
        select: { id: true },
      });
      if (expired.length === 0) return;
      const ids = expired.map((s) => s.id);
      await prisma.chatMessage.deleteMany({ where: { sessionId: { in: ids } } });
      await prisma.chatSession.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ENCERRADA', encerradoEm: new Date() },
      });
    } catch {
      console.error('[cleanup] falha na limpeza de conversas anonimas');
    }
  }, 60 * 60 * 1000);
  cleanup.unref();

  server.listen(env.PORT, '0.0.0.0', () => {
    console.info(`[alerta-segura] API ouvindo em http://0.0.0.0:${env.PORT}`);
  });

  const shutdown = async () => {
    clearInterval(cleanup);
    io.close();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[alerta-segura] falha ao iniciar:', err instanceof Error ? err.name : 'erro');
  process.exit(1);
});
