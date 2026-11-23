import { db } from '../data/db.js';

const ms = (fecha) => new Date(fecha).getTime() || 0;
/** true si la fecha es posterior a `desde`. */
const despuesDe = (fecha, desde) => ms(fecha) > desde.getTime();

/**
 * Lo que pasó en la base después de una fecha: es la materia prima de las notificaciones.
 * Lee las mismas tablas que Laravel, así también aparece lo que se hace desde la web.
 */
export const novedadesRepository = {
  conveniosCreados(desde) {
    return db.convenios.filter((c) => despuesDe(c.creado_en, desde));
  },

  /** Convenios cuyos datos cambiaron después de crearse (MySQL actualiza actualizado_en solo). */
  conveniosActualizados(desde) {
    return db.convenios.filter((c) => despuesDe(c.actualizado_en, desde) && ms(c.actualizado_en) - ms(c.creado_en) > 5000);
  },

  comentarios(desde) {
    return db.comentarios.filter((c) => despuesDe(c.creado_en, desde));
  },

  transiciones(desde) {
    return db.transiciones_estado.filter((t) => despuesDe(t.creado_en, desde));
  },

  documentos(desde) {
    return db.documentos.filter((d) => despuesDe(d.creado_en, desde));
  },

  /** true si el convenio tuvo un cambio de estado o un documento nuevo cerca de esa fecha (±10 s). */
  tieneMovimientoCerca(convenioId, fecha) {
    const cerca = (f) => Math.abs(ms(f) - ms(fecha)) <= 10000;
    const id = Number(convenioId);
    return (
      db.transiciones_estado.some((t) => Number(t.convenio_id) === id && cerca(t.creado_en)) ||
      db.documentos.some((d) => Number(d.convenio_id) === id && cerca(d.creado_en))
    );
  },

  /** Avisos que el sistema (Laravel) dejó para el usuario en la tabla notificaciones. */
  alertas(usuarioId, desde) {
    return db.notificaciones.filter((n) => Number(n.usuario_id) === Number(usuarioId) && despuesDe(n.creado_en, desde));
  },
};