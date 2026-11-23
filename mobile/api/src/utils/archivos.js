import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { HttpError } from './HttpError.js';
import { randomToken } from './crypto.js';

/** Hash SHA-256 de un archivo (sirve para verificar después que nadie lo cambió). */
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Ruta absoluta de un documento, sin dejar salir de la carpeta de documentos (bloquea rutas con "../"). */
export function rutaSegura(rutaArchivo) {
  const base = path.resolve(env.documentosDir);
  const absoluta = path.resolve(base, rutaArchivo);
  if (!absoluta.startsWith(base + path.sep)) throw new HttpError(400, 'Ruta de documento inválida.');
  return absoluta;
}

/**
 * Guarda un PDF como lo hace Laravel: documentos/AAAA/MM/<nombre aleatorio>.pdf
 * (el nombre aleatorio evita que se pueda adivinar la dirección de un archivo).
 * Devuelve la ruta relativa (la que va en la base) y una función para borrarlo si algo sale mal.
 */
export async function guardarPdf(bytes, fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const ruta = `documentos/${fecha.getFullYear()}/${mes}/${randomToken(24)}.pdf`;
  const absoluta = rutaSegura(ruta);
  await mkdir(path.dirname(absoluta), { recursive: true });
  await writeFile(absoluta, bytes);
  return { ruta, borrar: () => rm(absoluta, { force: true }) };
}

/** Lee un documento guardado. Devuelve null si el archivo no está en esta PC. */
export async function leerArchivo(rutaArchivo) {
  try {
    return await readFile(rutaSegura(rutaArchivo));
  } catch {
    return null;
  }
}