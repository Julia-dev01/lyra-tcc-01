import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http';
import { isProd } from '../config/env';

// Tratador final de erros. Nunca expoe stack traces nem dados sensiveis.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'Dados invalidos.',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'conflict',
        message: 'Registro ja existente.',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'not_found',
        message: 'Recurso nao encontrado.',
      });
    }
  }

  // Log interno sem dados sensiveis (apenas nome/tipo do erro).
  const name = err instanceof Error ? err.name : 'UnknownError';
  console.error(`[error] ${name}`);
  return res.status(500).json({
    error: 'internal_error',
    message: isProd
      ? 'Erro interno. Tente novamente.'
      : err instanceof Error
        ? err.message
        : 'Erro interno',
  });
}
