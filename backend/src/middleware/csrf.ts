import type { NextFunction, Request, Response } from 'express';
import { randomToken } from '../lib/crypto';
import { forbidden } from '../lib/http';
import { isProd } from '../config/env';

export const CSRF_COOKIE = 'as_csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit cookie + SameSite=Strict (defesa em profundidade).
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  let token = cookies[CSRF_COOKIE];

  if (!token) {
    token = randomToken(24);
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
    });
  }

  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    res.locals.csrfToken = token;
    return next();
  }

  // A saida rapida precisa funcionar mesmo com a sessao ja expirada.
  if (req.originalUrl.includes('/quick-exit')) {
    return next();
  }

  const header = req.get('x-csrf-token');
  if (!header || header !== token) {
    return next(forbidden('Falha na validacao CSRF'));
  }
  return next();
}
