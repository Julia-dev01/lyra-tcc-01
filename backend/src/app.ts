import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env';
import { csrfProtection } from './middleware/csrf';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { publicRouter } from './routes/public';
import { authUserRouter } from './routes/authUser';
import { usersRouter } from './routes/users';
import { alertsRouter } from './routes/alerts';
import { chatRouter } from './routes/chat';
import { adminAuthRouter } from './routes/adminAuth';
import { adminRouter } from './routes/admin';
import { contentAdminRouter } from './routes/contentAdmin';
import { reportsRouter } from './routes/reports';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // HTTPS/HSTS + cabecalhos de seguranca.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    const allowed =
      origin === env.APP_URL ||
      origin.endsWith('.monkeycode-ai.live') ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    cb(null, allowed);
  };

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-csrf-token'],
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));

  // Nenhum dado sensivel em cache.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(csrfProtection);
  app.use('/api', apiLimiter);

  app.use('/api', publicRouter);
  app.use('/api/auth', authUserRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin', contentAdminRouter);
  app.use('/api/admin/reports', reportsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Rota nao encontrada.' });
  });

  app.use(errorHandler);
  return app;
}
