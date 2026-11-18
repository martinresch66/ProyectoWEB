import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

/** Explica en castellano los errores más comunes al conectar con MySQL. */
export function explicarErrorMysql(error) {
  const base = env.mysql.database;
  const ayudas = {
    ECONNREFUSED: 'MySQL no está iniciado: abrí XAMPP y presioná Start en MySQL.',
    ER_BAD_DB_ERROR: `No existe la base "${base}": creala e importá database/seeedsCompleta.sql.`,
    ER_NO_SUCH_TABLE: `Faltan tablas en "${base}": volvé a importar database/seeedsCompleta.sql.`,
    ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña de MySQL incorrectos: revisá DB_USERNAME y DB_PASSWORD en api/.env.',
    ERR_MODULE_NOT_FOUND: 'Falta instalar mysql2: ejecutá "npm install --prefix api" desde la carpeta mobile.',
  };
  return ayudas[error.code] ?? `Error de MySQL: ${error.code ?? error.message}`;
}

/**
 * Con DATA_SOURCE=mysql, antes de cada pedido trae los datos actualizados de la base de XAMPP.
 * Con los datos de prueba (memoria) no hace nada.
 */
export async function sincronizarDatos(req, res, next) {
  if (env.fuenteDatos === 'mysql') {
    try {
      // Import dinámico: con los datos de prueba no hace falta tener instalado mysql2.
      const { sincronizar } = await import('../data/mysql.js');
      await sincronizar();
    } catch (error) {
      const explicacion = explicarErrorMysql(error);
      console.error(`[MySQL] ${explicacion}`);
      throw new HttpError(503, `No se pudo leer la base de datos. ${explicacion}`);
    }
  }
  next();
}