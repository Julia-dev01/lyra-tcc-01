import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

export function emitToAdmins(event: string, payload: unknown) {
  io?.to('admins').emit(event, payload);
}

export function emitToChat(chatToken: string, event: string, payload: unknown) {
  io?.to(`chat:${chatToken}`).emit(event, payload);
}
