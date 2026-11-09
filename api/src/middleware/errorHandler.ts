import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { AppError, notFound } from '../lib/http';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found.`));
};

const PRISMA_ERRORS: Record<string, AppError> = {
  P2002: new AppError(409, 'That value is already in use.'),
  P2003: new AppError(409, 'This record is still referenced elsewhere and cannot be changed that way.'),
  P2025: new AppError(404, 'Not found.'),
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const known = error instanceof Prisma.PrismaClientKnownRequestError ? PRISMA_ERRORS[error.code] : undefined;
  const handled = error instanceof AppError ? error : known;
  if (handled) {
    return res.status(handled.status).json({ error: { message: handled.message, code: handled.code, details: handled.details } });
  }
  if (error instanceof MulterError) {
    return res.status(400).json({ error: { message: error.message } });
  }
  if (env.NODE_ENV !== 'test') console.error(error);
  res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } });
};
