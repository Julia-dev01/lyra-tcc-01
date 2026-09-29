import crypto from 'node:crypto';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// AES-256-GCM (criptografia em repouso)
// Formato do payload: v1.<iv_b64>.<tag_b64>.<ciphertext_b64>
// ---------------------------------------------------------------------------

const KEY = crypto.createHash('sha256').update(env.CRYPTO_KEY).digest();
const BLIND_KEY = crypto.createHash('sha256').update(env.BLIND_INDEX_KEY).digest();

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv, {
    authTagLength: 16,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptField(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    // Valor legado/nao cifrado: retorna como esta (nao deve ocorrer em producao).
    return payload;
  }
  try {
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const data = Buffer.from(parts[3], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  } catch {
    // Nao logar conteudo; apenas sinalizar falha de integridade.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Blind index (HMAC-SHA256) - permite busca/estatistica sobre dado cifrado
// sem revelar o valor. Nao e reversivel.
// ---------------------------------------------------------------------------

export function blindIndex(value: string): string {
  return crypto
    .createHmac('sha256', BLIND_KEY)
    .update(value.trim().toLowerCase())
    .digest('hex');
}

// Tokens de busca (nome/apelido): normaliza acentos e gera HMAC por palavra.
export function tokenizeForSearch(...values: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    for (const token of normalized.split(/[^a-z0-9]+/)) {
      if (token.length >= 2) tokens.add(blindIndex(token));
    }
  }
  return [...tokens];
}

export function searchTokenFor(query: string): string | null {
  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const first = normalized.split(/[^a-z0-9]+/).filter((t) => t.length >= 2)[0];
  return first ? blindIndex(first) : null;
}

// ---------------------------------------------------------------------------
// Tokens opacos (sessoes, tokens anonimos, convites)
// ---------------------------------------------------------------------------

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function maskContact(value: string): string {
  if (!value) return '***';
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    const head = user.slice(0, 2);
    return `${head}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return `***${digits.slice(-4)}`;
}
