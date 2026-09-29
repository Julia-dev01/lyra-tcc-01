import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { forbidden, unauthorized } from '../lib/http';
import { verifyAccessToken, type AccessPayload } from '../lib/tokens';

export const USER_ACCESS_COOKIE = 'as_user_at';
export const ADMIN_ACCESS_COOKIE = 'as_admin_at';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessPayload;
    }
  }
}

function extractToken(req: Request, cookieName: string): string | null {
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookie && cookie[cookieName]) return cookie[cookieName];
  const header = req.get('authorization');
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function authenticate(
  req: Request,
  type: 'user' | 'admin',
): Promise<AccessPayload> {
  const cookieName = type === 'user' ? USER_ACCESS_COOKIE : ADMIN_ACCESS_COOKIE;
  const token = extractToken(req, cookieName);
  if (!token) throw unauthorized();
  const payload = verifyAccessToken(token);
  if (!payload || payload.typ !== type) throw unauthorized('Sessao invalida');

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw unauthorized('Sessao expirada');
  }

  if (type === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { ativo: true, perfil: true, excluidoEm: true },
    });
    if (!admin || !admin.ativo || admin.excluidoEm) {
      throw forbidden('Conta administrativa inativa');
    }
    payload.perfil = admin.perfil;
  }
  return payload;
}

export const requireUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    req.auth = await authenticate(req, 'user');
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    req.auth = await authenticate(req, 'admin');
    next();
  } catch (err) {
    next(err);
  }
};

// RBAC validado sempre no backend, com menor privilegio.
export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.perfil || !roles.includes(req.auth.perfil)) {
      return next(forbidden('Perfil sem permissao para esta acao'));
    }
    return next();
  };

export function clientIp(req: Request): string | undefined {
  // Nao persistimos IP de usuarias; usado apenas em auditoria de administradores.
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip;
}
