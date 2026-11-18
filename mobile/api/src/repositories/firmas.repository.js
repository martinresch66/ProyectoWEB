import { env } from '../config/env.js';
import { db } from '../data/db.js';
import { HttpError } from '../utils/HttpError.js';

/** Acción con la que se guarda cada firma en registros_auditoria. */
const ACCION = 'firmar_convenio';
const MOTIVO = 'Firmado desde la app móvil con huella digital y firma manuscrita.';

export const CONVENIO_CAMBIADO =
  'El convenio cambió mientras lo leías (alguien lo modificó o ya lo firmó). Volvé a abrirlo antes de firmar.';

const ms = (fecha) => new Date(fecha).getTime() || 0;
/** Más nuevo primero; si tienen la misma fecha, el de id más alto. */
const masNuevo = (a, b) => ms(b.creado_en) - ms(a.creado_en) || Number(b.id) - Number(a.id);

/** Fecha y hora de Argentina con el mismo formato que el resto de los datos: "2026-11-18T14:32:10-03:00". */
function ahora() {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

const siguienteId = (filas) => filas.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0) + 1;

/**
 * Firmas de convenios hechas desde la app. Una firma cambia 4 tablas a la vez (todo o nada):
 * - convenios: estado aprobado → firmado y versión + 1 (igual que la transición de Laravel).
 * - transiciones_estado: el movimiento, que aparece en "Últimos movimientos".
 * - documentos: el PDF firmado (tipo convenio_firmado), con su tamaño y hash SHA-256.
 * - registros_auditoria: quién, cuándo, dónde (lat/long) y cómo (huella + trazo de la firma).
 */
export const firmasRepository = {
  /** Última firma hecha desde la app para el convenio, o null. */
  deConvenio(convenioId) {
    return db.firmas.filter((f) => Number(f.entidad_id) === Number(convenioId)).sort(masNuevo)[0] ?? null;
  },

  /** Documento firmado más reciente del convenio (firmado en la app o subido desde la web), o null. */
  documentoFirmado(convenioId) {
    return (
      db.documentos
        .filter((d) => d.convenio_id === Number(convenioId) && d.tipo_documento === 'convenio_firmado')
        .sort(masNuevo)[0] ?? null
    );
  },

  /**
   * Registra la firma. Si el convenio ya no está "aprobado" o cambió su versión, responde 409 y no guarda nada.
   * @returns {Promise<{ documento_id: number }>}
   */
  async registrar(firma) {
    return env.fuenteDatos === 'mysql' ? registrarEnMysql(firma) : registrarEnMemoria(firma);
  },
};

/** MySQL: una transacción. Si algo falla en el medio, ROLLBACK y la base queda como estaba. */
async function registrarEnMysql({ convenioId, versionLeida, usuario, documento, detalles, ip, agente }) {
  const { conexion, invalidarLectura } = await import('../data/mysql.js');
  const cx = await conexion().getConnection();
  try {
    await cx.beginTransaction();

    // FOR UPDATE bloquea la fila hasta el COMMIT: dos personas no pueden firmar el mismo convenio a la vez.
    const [[actual]] = await cx.execute('SELECT estado, version FROM convenios WHERE id = ? FOR UPDATE', [convenioId]);
    if (!actual || actual.estado !== 'aprobado' || Number(actual.version) !== Number(versionLeida)) {
      throw new HttpError(409, CONVENIO_CAMBIADO);
    }

    // Consultas preparadas (los "?"): los datos nunca se mezclan con el SQL, así no hay inyección SQL.
    await cx.execute("UPDATE convenios SET estado = 'firmado', version = version + 1 WHERE id = ?", [convenioId]);
    await cx.execute(
      'INSERT INTO transiciones_estado (convenio_id, estado_anterior, estado_nuevo, motivo, cambiado_por) VALUES (?, ?, ?, ?, ?)',
      [convenioId, 'aprobado', 'firmado', MOTIVO, usuario.id],
    );
    const [[{ ultima }]] = await cx.execute(
      "SELECT COALESCE(MAX(version), 0) AS ultima FROM documentos WHERE convenio_id = ? AND tipo_documento = 'convenio_firmado'",
      [convenioId],
    );
    const [doc] = await cx.execute(
      `INSERT INTO documentos (convenio_id, tipo_documento, nombre_original, ruta_archivo, tamano_bytes, tipo_mime, hash_sha256, version, subido_por)
       VALUES (?, 'convenio_firmado', ?, ?, ?, 'application/pdf', ?, ?, ?)`,
      [
        convenioId,
        documento.nombre_original,
        documento.ruta_archivo,
        documento.tamano_bytes,
        documento.hash_sha256,
        Number(ultima) + 1,
        usuario.id,
      ],
    );
    await cx.execute(
      `INSERT INTO registros_auditoria (usuario_id, accion, tipo_entidad, entidad_id, direccion_ip, agente_usuario, detalles)
       VALUES (?, ?, 'convenio', ?, ?, ?, ?)`,
      [usuario.id, ACCION, convenioId, ip, agente, JSON.stringify({ ...detalles, documento_id: doc.insertId })],
    );

    await cx.commit();
    return { documento_id: doc.insertId };
  } catch (error) {
    await cx.rollback().catch(() => {});
    throw error;
  } finally {
    cx.release();
    // El próximo pedido vuelve a leer la base, así todos ven el convenio firmado.
    invalidarLectura();
  }
}

/** Datos de prueba (sin MySQL): los mismos cambios, en las tablas en memoria. */
function registrarEnMemoria({ convenioId, versionLeida, usuario, documento, detalles, ip, agente }) {
  const convenio = db.convenios.find((c) => c.id === convenioId);
  if (!convenio || convenio.estado !== 'aprobado' || Number(convenio.version) !== Number(versionLeida)) {
    throw new HttpError(409, CONVENIO_CAMBIADO);
  }
  const fecha = ahora();
  const versionDocumento = db.documentos
    .filter((d) => d.convenio_id === convenioId && d.tipo_documento === 'convenio_firmado')
    .reduce((max, d) => Math.max(max, Number(d.version) || 0), 0);

  convenio.estado = 'firmado';
  convenio.version = Number(convenio.version) + 1;
  convenio.actualizado_en = fecha;

  db.transiciones_estado.push({
    id: siguienteId(db.transiciones_estado),
    convenio_id: convenioId,
    estado_anterior: 'aprobado',
    estado_nuevo: 'firmado',
    motivo: MOTIVO,
    cambiado_por: usuario.id,
    creado_en: fecha,
  });

  const doc = {
    id: siguienteId(db.documentos),
    convenio_id: convenioId,
    tipo_documento: 'convenio_firmado',
    ...documento,
    tipo_mime: 'application/pdf',
    version: versionDocumento + 1,
    subido_por: usuario.id,
    creado_en: fecha,
  };
  db.documentos.push(doc);

  db.firmas.push({
    id: siguienteId(db.firmas),
    usuario_id: usuario.id,
    accion: ACCION,
    tipo_entidad: 'convenio',
    entidad_id: convenioId,
    direccion_ip: ip,
    agente_usuario: agente,
    detalles: { ...detalles, documento_id: doc.id },
    creado_en: fecha,
  });

  return { documento_id: doc.id };
}