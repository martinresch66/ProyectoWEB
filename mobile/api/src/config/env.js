/**
 * Configuración de la API. Los valores se pueden cambiar con un archivo api/.env
 * (ver .env.example). Los valores por defecto sirven para desarrollo.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),

  /**
   * De dónde salen los datos:
   * - 'mysql': la base de XAMPP (la misma que usa Laravel, cargada con database/seeedsCompleta.sql).
   * - 'memoria': los datos de prueba de src/data (no necesita MySQL; sirve de respaldo).
   */
  fuenteDatos: process.env.DATA_SOURCE === 'mysql' ? 'mysql' : 'memoria',
  /** Conexión a MySQL: mismos nombres de variables que el .env de Laravel. */
  mysql: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_DATABASE ?? 'convenios_unlpam',
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
  },
  /** Cada cuánto, como máximo, se vuelven a leer las tablas de MySQL (los cambios de la web se ven después de esto). */
  mysqlRecargaMs: 2000,

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