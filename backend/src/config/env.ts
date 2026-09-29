import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  CRYPTO_KEY: z.string().min(1, 'CRYPTO_KEY e obrigatoria'),
  BLIND_INDEX_KEY: z.string().min(1, 'BLIND_INDEX_KEY e obrigatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET muito curta'),
  ACCESS_TOKEN_TTL_USER: z.string().default('5m'),
  ACCESS_TOKEN_TTL_ADMIN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  TOTP_ISSUER: z.string().default('AlertaSegura'),
  SUPER_ADMIN_NAME: z.string().default('Administrador Inicial'),
  SUPER_ADMIN_EMAIL: z.string().email().default('superadmin@alertasegura.local'),
  SUPER_ADMIN_PASSWORD: z.string().default('AlertaSegura#2026'),
  ALERT_DISPATCHER: z.enum(['simulated', 'twilio']).default('simulated'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  ANON_CHAT_TTL_HOURS: z.coerce.number().default(48),
  REDIS_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Nunca imprimir valores do ambiente, apenas os nomes dos campos invalidos.
  const fields = Object.keys(parsed.error.flatten().fieldErrors).join(', ');
  console.error(`[config] Variaveis de ambiente invalidas: ${fields}`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
