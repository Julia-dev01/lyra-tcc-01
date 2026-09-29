import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { env, isProd } from '../config/env';
import { randomToken, sha256 } from '../lib/crypto';
import {
  adminAccessTtl,
  signAccessToken,
  userAccessTtl,
  type TokenType,
} from '../lib/tokens';
import { unauthorized } from '../lib/http';
import {
  ADMIN_ACCESS_COOKIE,
  USER_ACCESS_COOKIE,
} from '../middleware/auth';

const USER_REFRESH_COOKIE = 'as_user_rt';
const ADMIN_REFRESH_COOKIE = 'as_admin_rt';

const ACCESS_TTL_MS: Record<TokenType, number> = {
  user: 5 * 60 * 1000,
  admin: 15 * 60 * 1000,
};

// Tempo maximo de inatividade antes de invalidar a sessao.
export const IDLE_LIMIT_MS: Record<TokenType, number> = {
  user: 5 * 60 * 1000,
  admin: 15 * 60 * 1000,
};

function refreshCookieName(type: TokenType) {
  return type === 'user' ? USER_REFRESH_COOKIE : ADMIN_REFRESH_COOKIE;
}

function accessCookieName(type: TokenType) {
  return type === 'user' ? USER_ACCESS_COOKIE : ADMIN_ACCESS_COOKIE;
}

function baseCookie() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/',
  };
}

export async function issueSession(
  type: TokenType,
  ownerId: string,
  res: Response,
  meta: { perfil?: string; userAgent?: string },
) {
  const refreshToken = randomToken(48);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const session = await prisma.session.create({
    data: {
      ownerType: type === 'user' ? 'USER' : 'ADMIN',
      userId: type === 'user' ? ownerId : null,
      adminId: type === 'admin' ? ownerId : null,
      refreshHash: sha256(refreshToken),
      userAgent: meta.userAgent?.slice(0, 200),
      expiresAt,
    },
  });

  const accessToken = signAccessToken(
    { sub: ownerId, typ: type, sid: session.id, perfil: meta.perfil, scope: 'full' },
    type === 'user' ? userAccessTtl() : adminAccessTtl(),
  );

  res.cookie(accessCookieName(type), accessToken, {
    ...baseCookie(),
    maxAge: ACCESS_TTL_MS[type],
  });
  res.cookie(refreshCookieName(type), refreshToken, {
    ...baseCookie(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  return { session, accessToken, refreshToken };
}

export async function rotateSession(
  type: TokenType,
  refreshToken: string,
  res: Response,
  meta: { perfil?: string; userAgent?: string },
) {
  const hash = sha256(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshHash: hash } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw unauthorized('Sessao expirada. Entre novamente.');
  }
  if (session.ownerType !== (type === 'user' ? 'USER' : 'ADMIN')) {
    throw unauthorized('Sessao incompativel');
  }
  // Expiracao por inatividade.
  if (Date.now() - session.lastUsedAt.getTime() > IDLE_LIMIT_MS[type]) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Sessao expirada por inatividade.');
  }

  const ownerId = type === 'user' ? session.userId : session.adminId;
  if (!ownerId) throw unauthorized('Sessao invalida');

  const newRefresh = randomToken(48);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshHash: sha256(newRefresh),
      lastUsedAt: new Date(),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 200) ?? session.userAgent,
    },
  });

  const accessToken = signAccessToken(
    {
      sub: ownerId,
      typ: type,
      sid: updated.id,
      perfil: meta.perfil,
      scope: 'full',
    },
    type === 'user' ? userAccessTtl() : adminAccessTtl(),
  );

  res.cookie(accessCookieName(type), accessToken, {
    ...baseCookie(),
    maxAge: ACCESS_TTL_MS[type],
  });
  res.cookie(refreshCookieName(type), newRefresh, {
    ...baseCookie(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  return { accessToken };
}

export function readRefreshToken(req: Request, type: TokenType): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[refreshCookieName(type)] ?? null;
}

export function clearSessionCookies(res: Response, type: TokenType) {
  res.clearCookie(accessCookieName(type), baseCookie());
  res.clearCookie(refreshCookieName(type), baseCookie());
}

export async function revokeSessionById(sessionId: string) {
  await prisma.session
    .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function revokeAllSessions(type: TokenType, ownerId: string) {
  await prisma.session.updateMany({
    where: {
      ownerType: type === 'user' ? 'USER' : 'ADMIN',
      ...(type === 'user' ? { userId: ownerId } : { adminId: ownerId }),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
