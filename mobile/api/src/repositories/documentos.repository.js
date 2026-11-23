import { env } from '../config/env.js';
import { db } from '../data/db.js';

const ACCION = 'subir_documento';

/** Fecha y hora de Argentina con el mismo formato que el resto de los datos: "2026-11-22T18:05:12-03:00". */
function ahora() {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

const siguienteId = (filas) => filas.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0) + 1;

/** Documentos (PDF) de los convenios: tabla `documentos`, la misma que usa Laravel. */
export const documentosRepository = {
  findById(id) {
    return db.documentos.find((d) => Number(d.id) === Number(id)) ?? null;
  },

  /**
   * Registra un documento subido desde la app: la fila en `documentos` (con su versión) y la acción en
   * `registros_auditoria`, en una sola transacción. Las cargas anteriores del mismo tipo se conservan.
   * @returns {Promise<object>} la fila guardada
   */
  async registrar({ convenioId, tipo, usuario, documento, marca, ip, agente }) {
    if (env.fuenteDatos !== 'mysql') return registrarEnMemoria({ convenioId, tipo, usuario, documento });

    const { conexion, invalidarLectura } = await import('../data/mysql.js');
    const cx = await conexion().getConnection();
    try {
      await cx.beginTransaction();
      const [[{ ultima }]] = await cx.execute(
        'SELECT COALESCE(MAX(version), 0) AS ultima FROM documentos WHERE convenio_id = ? AND tipo_documento = ?',
        [convenioId, tipo],
      );
      const version = Number(ultima) + 1;
      const [doc] = await cx.execute(
        `INSERT INTO documentos (convenio_id, tipo_documento, nombre_original, ruta_archivo, tamano_bytes, tipo_mime, hash_sha256, version, subido_por)
         VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?)`,
        [convenioId, tipo, documento.nombre_original, documento.ruta_archivo, documento.tamano_bytes, documento.hash_sha256, version, usuario.id],
      );
      await cx.execute(
        `INSERT INTO registros_auditoria (usuario_id, accion, tipo_entidad, entidad_id, direccion_ip, agente_usuario, detalles)
         VALUES (?, ?, 'documento', ?, ?, ?, ?)`,
        [usuario.id, ACCION, doc.insertId, ip, agente, JSON.stringify({ convenio_id: convenioId, ...marca })],
      );
      await cx.commit();
      return { id: doc.insertId, convenio_id: convenioId, tipo_documento: tipo, ...documento, tipo_mime: 'application/pdf', version, subido_por: usuario.id, creado_en: ahora() };
    } catch (error) {
      await cx.rollback().catch(() => {});
      throw error;
    } finally {
      cx.release();
      invalidarLectura();
    }
  },
};

/** Datos de prueba (sin MySQL): lo mismo, en la tabla en memoria. */
function registrarEnMemoria({ convenioId, tipo, usuario, documento }) {
  const version =
    db.documentos
      .filter((d) => d.convenio_id === convenioId && d.tipo_documento === tipo)
      .reduce((max, d) => Math.max(max, Number(d.version) || 0), 0) + 1;
  const fila = {
    id: siguienteId(db.documentos),
    convenio_id: convenioId,
    tipo_documento: tipo,
    ...documento,
    tipo_mime: 'application/pdf',
    version,
    subido_por: usuario.id,
    creado_en: ahora(),
  };
  db.documentos.push(fila);
  return fila;
}