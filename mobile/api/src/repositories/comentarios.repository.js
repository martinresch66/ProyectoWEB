import { env } from '../config/env.js';
import { db } from '../data/db.js';
import { HttpError } from '../utils/HttpError.js';

const ms = (fecha) => new Date(fecha).getTime() || 0;

/** Fecha y hora de Argentina con el mismo formato que el resto de los datos: "2026-11-22T16:30:00-03:00". */
function ahora() {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

/** Comentarios de los convenios (tabla `comentarios`, la crea data/mysql.js si no existe). */
export const comentariosRepository = {
  /** Comentarios de un convenio, del más nuevo al más viejo. */
  findByConvenio(convenioId) {
    return db.comentarios
      .filter((c) => Number(c.convenio_id) === Number(convenioId))
      .sort((a, b) => ms(b.creado_en) - ms(a.creado_en) || Number(b.id) - Number(a.id));
  },

  /** Guarda un comentario y lo devuelve con su id. */
  async crear({ convenioId, usuarioId, texto, esOfensivo }) {
    const fila = { convenio_id: convenioId, usuario_id: usuarioId, texto, es_ofensivo: esOfensivo ? 1 : 0, creado_en: ahora() };

    if (env.fuenteDatos === 'mysql') {
      const { conexion, invalidarLectura } = await import('../data/mysql.js');
      // Consulta preparada: el texto del comentario nunca se mezcla con el SQL.
      const [resultado] = await conexion()
        .execute('INSERT INTO comentarios (convenio_id, usuario_id, texto, es_ofensivo) VALUES (?, ?, ?, ?)', [
          convenioId,
          usuarioId,
          texto,
          fila.es_ofensivo,
        ])
        .catch((error) => {
          if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
          throw new HttpError(503, 'Falta la tabla de comentarios: importá database/comentarios.sql en phpMyAdmin.');
        });
      invalidarLectura();
      return { id: resultado.insertId, ...fila };
    }

    const id = db.comentarios.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    db.comentarios.push({ id, ...fila });
    return { id, ...fila };
  },
};