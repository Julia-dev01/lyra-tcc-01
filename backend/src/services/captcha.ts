import { randomToken } from '../lib/crypto';

// CAPTCHA discreto: desafio aritmetico simples, sem rastreadores de terceiros.
// Mantido em memoria (suficiente para uma instancia). Em cluster, usar Redis.
interface Entry {
  answer: number;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;

export interface CaptchaChallenge {
  id: string;
  pergunta: string;
}

export function createCaptcha(): CaptchaChallenge {
  cleanup();
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  const somar = Math.random() > 0.5;
  const answer = somar ? a + b : Math.max(a, b) - Math.min(a, b);
  const id = randomToken(16);
  store.set(id, { answer, expiresAt: Date.now() + TTL_MS });
  return { id, pergunta: somar ? `Quanto é ${a} + ${b}?` : `Quanto é ${a} − ${b}?` };
}

export function verifyCaptcha(id: string, answer: string): boolean {
  const entry = store.get(id);
  if (!entry) return false;
  store.delete(id);
  if (entry.expiresAt < Date.now()) return false;
  return Number(answer) === entry.answer;
}

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store) {
    if (value.expiresAt < now) store.delete(key);
  }
}
