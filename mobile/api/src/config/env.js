/**
 * Configuración de la API. Los valores se pueden cambiar con un archivo api/.env
 * (ver .env.example). Los valores por defecto sirven para desarrollo.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),

  /** Clave para firmar los JWT. En producción se debe definir JWT_SECRET. */
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-cambiar-en-produccion',
  /** Duración del access token (JWT). */
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '1h',
  /** Duración del refresh token, en días. */
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 30),

  /** Vigencia del código MFA, en minutos. */
  mfaCodeMinutes: 5,
  /** Intentos permitidos para ingresar el código MFA. */
  mfaMaxAttempts: 5,
  /** Segundos mínimos entre reenvíos del código. */
  mfaResendSeconds: 30,
  /**
   * Simulación de envío de mail/SMS: la respuesta incluye el mensaje "enviado"
   * para que la app lo muestre como notificación. Desactivar con MFA_SIMULATION=false.
   */
  mfaSimulation: process.env.MFA_SIMULATION !== 'false',

  /** Intentos de contraseña fallidos antes de bloquear temporalmente el usuario. */
  loginMaxAttempts: 5,
  loginLockMinutes: 5,
};
