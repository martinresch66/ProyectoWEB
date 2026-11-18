import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { sesionesRepository } from '../repositories/sesiones.repository.js';
import { unidadesRepository } from '../repositories/unidades.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { randomToken, safeEqual, sha256, sixDigitCode, verifyPassword } from '../utils/crypto.js';
import { HttpError } from '../utils/HttpError.js';
import { CANALES, destinosDe, enviarCodigo } from './mfaSender.js';

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

/** Desafíos MFA en curso (duran pocos minutos, no hace falta persistirlos). */
const desafios = new Map();
/** Intentos de contraseña fallidos por email, para frenar ataques de fuerza bruta. */
const intentosFallidos = new Map();

/** Objeto `user` del contrato (§3): sin la clave ni datos internos, con su unidad. */
export function usuarioPublico(u) {
  const { id, nombre, email, rol, unidad_id, activo } = u;
  return { id, nombre, email, rol, unidad_id, activo, unidad: unidadesRepository.findById(unidad_id) };
}

/** Access token (JWT). El `jti` permite revocarlo al cerrar sesión. */
function firmarAccessToken(usuario) {
  return jwt.sign({ sub: usuario.id, jti: randomToken(12) }, env.jwtSecret, { expiresIn: env.accessTokenTtl });
}

/** Sesión de la app móvil: access token corto + refresh token largo (para no pedir login de nuevo). */
function emitirSesionMovil(usuario, deviceId = null) {
  const refreshToken = randomToken();
  sesionesRepository.saveRefreshToken(sha256(refreshToken), {
    userId: usuario.id,
    deviceId,
    createdAt: Date.now(),
    expiresAt: Date.now() + env.refreshTokenDays * DIA,
  });
  return { token: firmarAccessToken(usuario), refresh_token: refreshToken, user: usuarioPublico(usuario) };
}

function chequearBloqueo(email) {
  const info = intentosFallidos.get(email);
  if (info?.bloqueadoHasta && info.bloqueadoHasta > Date.now()) {
    const min = Math.ceil((info.bloqueadoHasta - Date.now()) / MINUTO);
    throw new HttpError(429, `Demasiados intentos fallidos. Probá de nuevo en ${min} min.`);
  }
}

function registrarFallo(email) {
  const info = intentosFallidos.get(email) ?? { cantidad: 0 };
  info.cantidad += 1;
  if (info.cantidad >= env.loginMaxAttempts) {
    info.bloqueadoHasta = Date.now() + env.loginLockMinutes * MINUTO;
    info.cantidad = 0;
  }
  intentosFallidos.set(email, info);
}

/** Valida email y contraseña. Errores como Laravel: 422 si faltan datos, 401 si no coinciden. */
function validarCredenciales({ email, password }) {
  const errores = {};
  if (!String(email ?? '').trim()) errores.email = ['Ingresá tu email.'];
  if (!password) errores.password = ['Ingresá tu contraseña.'];
  if (Object.keys(errores).length) throw new HttpError(422, 'Completá el email y la contraseña.', errores);

  const clave = String(email).trim().toLowerCase();
  chequearBloqueo(clave);
  const usuario = usuariosRepository.findByEmail(clave);
  if (!usuario || !verifyPassword(password, usuario.clave)) {
    registrarFallo(clave);
    // Mismo mensaje en ambos casos: no se revela si el email existe.
    throw new HttpError(401, 'Email o contraseña incorrectos.');
  }
  if (Number(usuario.activo) !== 1) throw new HttpError(403, 'Tu usuario está deshabilitado. Consultá con Administración.');
  intentosFallidos.delete(clave);
  return usuario;
}

function obtenerDesafio(mfaToken) {
  const desafio = desafios.get(mfaToken);
  if (!desafio || desafio.venceEn < Date.now()) {
    desafios.delete(mfaToken);
    throw new HttpError(401, 'La verificación venció. Volvé a ingresar tu contraseña.');
  }
  return desafio;
}

export const authService = {
  // ─────────── Contrato con la web (§3) ───────────

  /** POST /auth/login → { token, user }. Lo usa la web (no tiene MFA). */
  login(body) {
    const usuario = validarCredenciales(body);
    return { token: firmarAccessToken(usuario), user: usuarioPublico(usuario) };
  },

  me(userId) {
    const usuario = usuariosRepository.findById(userId);
    if (!usuario) throw new HttpError(401, 'Usuario inexistente.');
    return usuarioPublico(usuario);
  },

  /** POST /auth/logout: revoca el token actual y, si la app lo manda, también el refresh token. */
  logout({ jti, exp }, { refresh_token } = {}) {
    if (jti) sesionesRepository.revocarAccessToken(jti, exp * 1000);
    if (refresh_token) sesionesRepository.deleteRefreshToken(sha256(refresh_token));
  },

  // ─────────── Solo app móvil: login con MFA ───────────

  /** Paso 1: email + contraseña. Si son correctos, inicia el desafío MFA. */
  loginMovil(body) {
    const usuario = validarCredenciales(body);
    const mfaToken = randomToken(24);
    desafios.set(mfaToken, {
      userId: usuario.id,
      codigoHash: null,
      codigoVenceEn: 0,
      intentos: 0,
      ultimoEnvio: 0,
      venceEn: Date.now() + 15 * MINUTO,
    });
    return { mfa_token: mfaToken, canales: destinosDe(usuario) };
  },

  /** Paso 2: envía el código por el canal elegido (email, sms o push). */
  enviarCodigo({ mfa_token, canal }) {
    if (!CANALES.includes(canal)) throw new HttpError(422, 'Canal inválido.', { canal: [`Tiene que ser uno de: ${CANALES.join(', ')}.`] });
    const desafio = obtenerDesafio(mfa_token);
    const usuario = usuariosRepository.findById(desafio.userId);
    if (!destinosDe(usuario).some((d) => d.canal === canal)) throw new HttpError(422, 'Ese canal no está disponible para tu usuario.');

    const espera = desafio.ultimoEnvio + env.mfaResendSeconds * 1000 - Date.now();
    if (espera > 0) throw new HttpError(429, `Esperá ${Math.ceil(espera / 1000)} s para pedir otro código.`);

    const codigo = sixDigitCode();
    desafio.codigoHash = sha256(codigo);
    desafio.codigoVenceEn = Date.now() + env.mfaCodeMinutes * MINUTO;
    desafio.intentos = 0;
    desafio.ultimoEnvio = Date.now();

    const mensaje = enviarCodigo(usuario, canal, codigo, env.mfaCodeMinutes);
    return {
      canal,
      destino: mensaje.destino,
      vence_en: new Date(desafio.codigoVenceEn).toISOString(),
      reenviar_en_segundos: env.mfaResendSeconds,
      ...(env.mfaSimulation && { simulacion: { titulo: mensaje.titulo, cuerpo: mensaje.cuerpo } }),
    };
  },

  /** Paso 3: verifica el código y, si es correcto, abre la sesión. */
  verificarCodigo({ mfa_token, codigo, device_id }) {
    const desafio = obtenerDesafio(mfa_token);
    if (!desafio.codigoHash) throw new HttpError(422, 'Primero pedí el código.');
    if (desafio.codigoVenceEn < Date.now()) throw new HttpError(401, 'El código venció. Pedí uno nuevo.');

    if (!safeEqual(sha256(String(codigo ?? '').trim()), desafio.codigoHash)) {
      desafio.intentos += 1;
      const restantes = env.mfaMaxAttempts - desafio.intentos;
      if (restantes <= 0) {
        desafios.delete(mfa_token);
        throw new HttpError(401, 'Superaste los intentos permitidos. Volvé a ingresar tu contraseña.');
      }
      throw new HttpError(422, `Código incorrecto. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}.`, {
        codigo: ['El código no es correcto.'],
      });
    }

    desafios.delete(mfa_token);
    return emitirSesionMovil(usuariosRepository.findById(desafio.userId), device_id ?? null);
  },

  /** Renueva la sesión: entrega un token nuevo y rota el refresh token (el viejo deja de servir). */
  refrescar({ refresh_token }) {
    if (!refresh_token) throw new HttpError(422, 'Falta el refresh token.');
    const hash = sha256(refresh_token);
    const sesion = sesionesRepository.findRefreshToken(hash);
    if (!sesion || sesion.expiresAt < Date.now()) {
      if (sesion) sesionesRepository.deleteRefreshToken(hash);
      throw new HttpError(401, 'La sesión expiró. Volvé a iniciar sesión.');
    }
    sesionesRepository.deleteRefreshToken(hash);
    const usuario = usuariosRepository.findById(sesion.userId);
    if (!usuario || Number(usuario.activo) !== 1) throw new HttpError(401, 'Usuario inexistente o deshabilitado.');
    return emitirSesionMovil(usuario, sesion.deviceId);
  },

  // ─────────── Solo app móvil: ingreso con huella ───────────

  /**
   * Activa el ingreso con huella en un dispositivo: devuelve un token de dispositivo
   * que la app guarda en el almacenamiento seguro y solo libera después de validar la huella.
   */
  activarHuella(userId, { device_id, device_name }) {
    if (!device_id) throw new HttpError(422, 'Falta el identificador del dispositivo.');
    const deviceToken = randomToken();
    sesionesRepository.saveDispositivo(device_id, {
      userId,
      tokenHash: sha256(deviceToken),
      deviceName: device_name ?? 'Dispositivo',
      createdAt: Date.now(),
    });
    return { device_token: deviceToken };
  },

  /** Ingreso con huella: la huella ya se validó en el celular; acá se valida el token del dispositivo. */
  loginConHuella({ device_id, device_token }) {
    const dispositivo = device_id ? sesionesRepository.findDispositivo(device_id) : null;
    if (!dispositivo || !safeEqual(sha256(device_token ?? ''), dispositivo.tokenHash)) {
      throw new HttpError(401, 'El ingreso con huella no está activo en este dispositivo. Ingresá con tu contraseña.');
    }
    const usuario = usuariosRepository.findById(dispositivo.userId);
    if (!usuario || Number(usuario.activo) !== 1) throw new HttpError(401, 'Usuario inexistente o deshabilitado.');
    return emitirSesionMovil(usuario, device_id);
  },

  desactivarHuella(userId, { device_id }) {
    const dispositivo = device_id ? sesionesRepository.findDispositivo(device_id) : null;
    if (dispositivo && dispositivo.userId === userId) sesionesRepository.deleteDispositivo(device_id);
  },

  // ─────────── Middleware ───────────

  /** Valida el token Bearer y devuelve { usuario, payload } (lo usa requireAuth). */
  autenticar(token) {
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new HttpError(401, err.name === 'TokenExpiredError' ? 'El token expiró.' : 'Token inválido.');
    }
    if (payload.jti && sesionesRepository.estaRevocado(payload.jti)) throw new HttpError(401, 'La sesión fue cerrada.');
    const usuario = usuariosRepository.findById(payload.sub);
    if (!usuario || Number(usuario.activo) !== 1) throw new HttpError(401, 'Usuario inexistente o deshabilitado.');
    return { usuario: usuarioPublico(usuario), payload };
  },
};

// Limpieza periódica de sesiones vencidas.
function limpiar() {
  sesionesRepository.deleteExpiredRefreshTokens();
  sesionesRepository.deleteExpiredRevocados();
}
limpiar();
setInterval(limpiar, DIA).unref();
