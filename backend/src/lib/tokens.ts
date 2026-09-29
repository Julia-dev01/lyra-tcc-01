import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenType = 'user' | 'admin';

export interface AccessPayload {
  sub: string;
  typ: TokenType;
  sid: string;
  perfil?: string;
  scope?: string;
}

export function signAccessToken(payload: AccessPayload, ttl: string): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ttl } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessPayload;
  } catch {
    return null;
  }
}

export function userAccessTtl(): string {
  return env.ACCESS_TOKEN_TTL_USER;
}

export function adminAccessTtl(): string {
  return env.ACCESS_TOKEN_TTL_ADMIN;
}

// Token curto usado entre as etapas do login administrativo (troca de senha,
// matricula e verificacao do 2FA). Nao concede acesso a API por si so.
export function signPendingAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, typ: 'admin-pending' }, env.JWT_SECRET, {
    expiresIn: '10m',
  } as jwt.SignOptions);
}

export function verifyPendingAdminToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; typ: string };
    if (payload.typ !== 'admin-pending') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
