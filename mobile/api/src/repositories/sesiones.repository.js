import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Sesiones y dispositivos con huella registrada.
 * Se guardan en api/.data/sesiones.json para que no se pierdan al reiniciar la API
 * (en desarrollo se reinicia cada vez que se guarda un archivo). Después irá a SQLite.
 *
 * Los tokens nunca se guardan en texto plano: solo su hash SHA-256.
 */
const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.data', 'sesiones.json');

function load() {
  try {
    if (existsSync(FILE)) return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    // archivo corrupto: se empieza de cero
  }
  return { refreshTokens: {}, dispositivos: {}, revocados: {} };
}

const db = load();
db.revocados ??= {};

function save() {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export const sesionesRepository = {
  // ── Refresh tokens ──
  saveRefreshToken(tokenHash, data) {
    db.refreshTokens[tokenHash] = data;
    save();
  },
  findRefreshToken(tokenHash) {
    return db.refreshTokens[tokenHash] ?? null;
  },
  deleteRefreshToken(tokenHash) {
    delete db.refreshTokens[tokenHash];
    save();
  },
  deleteExpiredRefreshTokens(now = Date.now()) {
    for (const [hash, data] of Object.entries(db.refreshTokens)) {
      if (data.expiresAt < now) delete db.refreshTokens[hash];
    }
    save();
  },

  // ── Access tokens revocados al cerrar sesión (por jti, hasta que vencen) ──
  revocarAccessToken(jti, expiresAt) {
    db.revocados[jti] = expiresAt;
    save();
  },
  estaRevocado(jti) {
    return jti in db.revocados;
  },
  deleteExpiredRevocados(now = Date.now()) {
    for (const [jti, expiresAt] of Object.entries(db.revocados)) {
      if (expiresAt < now) delete db.revocados[jti];
    }
    save();
  },

  // ── Dispositivos con ingreso por huella ──
  saveDispositivo(deviceId, data) {
    db.dispositivos[deviceId] = data;
    save();
  },
  findDispositivo(deviceId) {
    return db.dispositivos[deviceId] ?? null;
  },
  deleteDispositivo(deviceId) {
    delete db.dispositivos[deviceId];
    save();
  },
};
