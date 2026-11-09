import { db } from '../data/db.js';

/** Tabla notificaciones. */
export const alertasRepository = {
  findByUsuario(usuarioId) {
    return db.notificaciones
      .filter((n) => n.usuario_id === usuarioId)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  },

  findById(id) {
    return db.notificaciones.find((n) => n.id === Number(id)) ?? null;
  },
};
