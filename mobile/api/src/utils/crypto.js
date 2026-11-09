import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Encripta una contraseña con scrypt + salt aleatorio. Formato: "salt:hash".
 * Nunca se guardan contraseñas en texto plano.
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** Compara una contraseña con su hash en tiempo constante (evita ataques de tiempo). */
export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

/** Token aleatorio opaco (refresh token, token de dispositivo, id de desafío MFA). */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/** Hash SHA-256: los tokens se guardan hasheados, como las contraseñas. */
export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

/** Código numérico de 6 dígitos para MFA. */
export function sixDigitCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Compara dos strings en tiempo constante. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
