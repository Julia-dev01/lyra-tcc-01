import rateLimit from 'express-rate-limit';
import { isProd } from '../config/env';

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  // Nunca registrar dados sensiveis: apenas a mensagem generica.
  message: { error: 'too_many_requests', message: 'Muitas requisicoes. Aguarde um instante.' },
};

// Limite geral da API.
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: isProd ? 180 : 1000,
});

// Login/2FA/registro: janela curta e limite baixo.
export const authLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: isProd ? 12 : 100,
});

// Rotas publicas de conteudo/chat anonimo.
export const publicLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: isProd ? 60 : 500,
});

// Alertas: evita disparo em massa acidental/abusivo.
export const alertLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: isProd ? 10 : 100,
});
