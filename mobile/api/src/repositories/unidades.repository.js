import { db } from '../data/db.js';

export const unidadesRepository = {
  findAll() {
    return db.unidades.map(({ id, nombre, codigo }) => ({ id, nombre, codigo }));
  },

  findById(id) {
    const u = db.unidades.find((x) => x.id === id);
    return u ? { id: u.id, nombre: u.nombre, codigo: u.codigo } : null;
  },
};
