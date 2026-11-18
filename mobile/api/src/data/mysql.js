import mysql from 'mysql2/promise';

import { env } from '../config/env.js';
import { reemplazarTablas } from './db.js';
import * as extra from './extra.js';
import * as seed from './seed.js';

/**
 * Conexión con la base MySQL de XAMPP (la misma que usa Laravel).
 *
 * Cómo funciona: antes de cada pedido se leen las tablas y se reemplazan los datos en memoria,
 * así los repositorios siguen igual que con los datos de prueba. Para no consultar la base en cada
 * pedido, la lectura se reutiliza durante env.mysqlRecargaMs (2 s). Con las pocas filas del proyecto
 * es rápido; con miles de convenios convendría pasar cada repositorio a consultas SQL con WHERE.
 */
const TABLAS = [
  'unidades',
  'usuarios',
  'convenios',
  'partes',
  'partes_convenio',
  'personas',
  'personas_convenio',
  'detalles_pasantia',
  'vinculos_convenio',
  'documentos',
  'transiciones_estado',
  'observaciones_revision',
  'notificaciones',
];

let pool = null;

/** Pool de conexiones. dateStrings: las fechas llegan como texto ("2026-11-17"), igual que en el JSON de Laravel. */
export function conexion() {
  pool ??= mysql.createPool({ ...env.mysql, dateStrings: true, charset: 'utf8mb4', connectionLimit: 5 });
  return pool;
}

const FECHA_HORA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** "2026-11-17 18:00:00" (hora de Argentina) → "2026-11-17T18:00:00-03:00", el mismo formato que los datos de prueba. */
function normalizarFila(fila) {
  const resultado = {};
  for (const [columna, valor] of Object.entries(fila)) {
    resultado[columna] = typeof valor === 'string' && FECHA_HORA.test(valor) ? `${valor.replace(' ', 'T')}-03:00` : valor;
  }
  return resultado;
}

// La tabla usuarios no tiene teléfono: para el SMS del código de verificación se usan los de prueba, buscados por email.
const telefonoPorEmail = Object.fromEntries(
  seed.usuarios.filter((u) => extra.telefonosUsuarios[u.id]).map((u) => [u.email, extra.telefonosUsuarios[u.id]]),
);

let ultimaLectura = 0;
let lecturaEnCurso = null;

/** Lee todas las tablas y reemplaza los datos en memoria de una sola vez. */
export async function leerBase() {
  const resultados = await Promise.all(TABLAS.map((tabla) => conexion().query(`SELECT * FROM \`${tabla}\``)));
  const tablas = Object.fromEntries(TABLAS.map((tabla, i) => [tabla, resultados[i][0].map(normalizarFila)]));
  tablas.usuarios = tablas.usuarios.map((u) => ({ ...u, telefono: telefonoPorEmail[u.email] ?? null }));
  reemplazarTablas(tablas);
  ultimaLectura = Date.now();
  return tablas;
}

/** Vuelve a leer la base si pasaron más de 2 s. Si llegan varios pedidos juntos, comparten la misma lectura. */
export function sincronizar() {
  if (Date.now() - ultimaLectura < env.mysqlRecargaMs) return Promise.resolve();
  lecturaEnCurso ??= leerBase().finally(() => {
    lecturaEnCurso = null;
  });
  return lecturaEnCurso;
}