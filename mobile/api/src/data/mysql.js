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
  'comentarios',
];

/**
 * Tablas que agrega la app y no están en el seed de Martín. Se crean solas (si no existen) la primera vez
 * que se lee la base. El mismo SQL está en database/comentarios.sql.
 * Si una de estas falta, no frena al resto: se lee como vacía.
 */
const TABLAS_OPCIONALES = ['comentarios'];
const TABLAS_DE_LA_APP = [
  `CREATE TABLE IF NOT EXISTS comentarios (
    id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    convenio_id bigint(20) UNSIGNED NOT NULL,
    usuario_id bigint(20) UNSIGNED NOT NULL,
    texto text NOT NULL,
    es_ofensivo tinyint(1) NOT NULL DEFAULT 0,
    creado_en timestamp NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY convenio_id (convenio_id),
    KEY usuario_id (usuario_id),
    CONSTRAINT comentarios_ibfk_1 FOREIGN KEY (convenio_id) REFERENCES convenios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT comentarios_ibfk_2 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/**
 * Consultas con filtro, para no traer toda una tabla. Las firmas hechas desde la app se guardan en
 * registros_auditoria (accion = 'firmar_convenio') y quedan en memoria como db.firmas.
 */
const CONSULTAS = {
  firmas: "SELECT * FROM `registros_auditoria` WHERE `accion` = 'firmar_convenio'",
};

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
let esquemaListo = false;

/** Crea las tablas de la app si faltan. Si no se puede (ej: MySQL apagado), se reintenta en la próxima lectura. */
async function asegurarEsquema() {
  if (esquemaListo) return;
  try {
    for (const sql of TABLAS_DE_LA_APP) await conexion().query(sql);
    esquemaListo = true;
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') console.warn(`[MySQL] No se pudo crear la tabla de comentarios: ${error.code ?? error.message}`);
  }
}

/** La columna detalles es JSON: MySQL la puede devolver como texto. */
function leerJson(valor) {
  if (typeof valor !== 'string') return valor ?? {};
  try {
    return JSON.parse(valor);
  } catch {
    return {};
  }
}

/** Lee todas las tablas y reemplaza los datos en memoria de una sola vez. */
export async function leerBase() {
  await asegurarEsquema();
  const consultas = { ...Object.fromEntries(TABLAS.map((tabla) => [tabla, `SELECT * FROM \`${tabla}\``])), ...CONSULTAS };
  const nombres = Object.keys(consultas);
  const resultados = await Promise.all(
    nombres.map((nombre) =>
      conexion()
        .query(consultas[nombre])
        .catch((error) => {
          if (TABLAS_OPCIONALES.includes(nombre) && error.code === 'ER_NO_SUCH_TABLE') return [[]];
          throw error;
        }),
    ),
  );
  const tablas = Object.fromEntries(nombres.map((nombre, i) => [nombre, resultados[i][0].map(normalizarFila)]));
  tablas.usuarios = tablas.usuarios.map((u) => ({ ...u, telefono: telefonoPorEmail[u.email] ?? null }));
  tablas.firmas = tablas.firmas.map((f) => ({ ...f, detalles: leerJson(f.detalles) }));
  reemplazarTablas(tablas);
  ultimaLectura = Date.now();
  return tablas;
}

/** Después de escribir en la base (ej: una firma), obliga a releerla en el próximo pedido. */
export function invalidarLectura() {
  ultimaLectura = 0;
}

/** Vuelve a leer la base si pasaron más de 2 s. Si llegan varios pedidos juntos, comparten la misma lectura. */
export function sincronizar() {
  if (Date.now() - ultimaLectura < env.mysqlRecargaMs) return Promise.resolve();
  lecturaEnCurso ??= leerBase().finally(() => {
    lecturaEnCurso = null;
  });
  return lecturaEnCurso;
}