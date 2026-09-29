import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, msg, 'bad_request', details);
export const unauthorized = (msg = 'Nao autenticado') =>
  new HttpError(401, msg, 'unauthorized');
export const forbidden = (msg = 'Acesso negado') =>
  new HttpError(403, msg, 'forbidden');
export const notFound = (msg = 'Recurso nao encontrado') =>
  new HttpError(404, msg, 'not_found');
export const conflict = (msg: string) => new HttpError(409, msg, 'conflict');
export const tooMany = (msg = 'Muitas tentativas. Tente novamente mais tarde.') =>
  new HttpError(429, msg, 'rate_limited');

type Handler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

export const asyncHandler =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
