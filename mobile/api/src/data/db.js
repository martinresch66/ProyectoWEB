import { hashPassword } from '../utils/crypto.js';
import * as extra from './extra.js';
import * as seed from './seed.js';

/**
 * "Base de datos" en memoria de la API simulada: las tablas de database/schema.sql con los datos
 * del seed más los de extra.js. Los repositorios son los únicos que leen y escriben acá; cuando la app
 * use el backend de Laravel, esta carpeta deja de usarse.
 */
const passwordHash = hashPassword(seed.PASSWORD_DE_PRUEBA);

export const db = {
  unidades: seed.unidades,
  usuarios: seed.usuarios.map((u) => ({
    ...u,
    clave: passwordHash,
    telefono: extra.telefonosUsuarios[u.id] ?? null,
  })),
  convenios: [...seed.convenios, ...extra.convenios],
  partes: [...seed.partes, ...extra.partes],
  partes_convenio: [...seed.partesConvenio, ...extra.partesConvenio],
  personas: [...seed.personas, ...extra.personas],
  personas_convenio: [...seed.personasConvenio, ...extra.personasConvenio],
  detalles_pasantia: [...seed.detallesPasantia, ...extra.detallesPasantia],
  vinculos_convenio: [...seed.vinculos, ...extra.vinculos],
  documentos: [...seed.documentos, ...extra.documentos],
  transiciones_estado: [...seed.transiciones, ...extra.transiciones],
  observaciones_revision: [...seed.observaciones, ...extra.observaciones],
  notificaciones: [...seed.notificaciones, ...extra.notificaciones],
  // Firmas hechas desde la app (en MySQL son las filas de registros_auditoria con accion = 'firmar_convenio').
  firmas: [],
};


/** Reemplaza todas las tablas de una sola vez (lo usa data/mysql.js después de leer la base). */
export function reemplazarTablas(tablas) {
  Object.assign(db, tablas);
}
