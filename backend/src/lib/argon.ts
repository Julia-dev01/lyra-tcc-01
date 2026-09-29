import { hash, verify, Algorithm } from '@node-rs/argon2';

// Argon2id com parametros alinhados ao OWASP (19 MiB, t=2, p=1).
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashSecret(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTIONS);
}

export async function verifySecret(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain, ARGON_OPTIONS);
  } catch {
    return false;
  }
}
