import { db } from '../data/db.js';

/** Acceso a la tabla usuarios (hoy en memoria; en el backend real, Eloquent). */
export const usuariosRepository = {
  findByEmail(email) {
    const normalizado = String(email ?? '').trim().toLowerCase();
    return db.usuarios.find((u) => u.email.toLowerCase() === normalizado) ?? null;
  },

  findById(id) {
    return db.usuarios.find((u) => u.id === Number(id)) ?? null;
  },

  /** Nombre corto para las relaciones (creador, usuario de un documento, revisor…). */
  resumen(id) {
    const u = this.findById(id);
    return u ? { id: u.id, nombre: u.nombre } : null;
  },
};
