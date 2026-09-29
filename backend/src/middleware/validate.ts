import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../lib/http';

export const validateBody =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        badRequest('Dados invalidos.', result.error.flatten().fieldErrors),
      );
    }
    req.body = result.data;
    return next();
  };

export const validateQuery =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        badRequest('Parametros invalidos.', result.error.flatten().fieldErrors),
      );
    }
    // req.query e somente leitura no Express 5; guardamos em res.locals.
    (req as Request & { validQuery?: unknown }).validQuery = result.data;
    return next();
  };
