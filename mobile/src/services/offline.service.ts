import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ConvenioFicha, ConvenioPorFirmar } from '@/models';

import { SinConexionError } from './api/client';
import { conexionStore } from './conexion.store';
import { conveniosService } from './convenios.service';
import { documentosService } from './documentos.service';

/** Lo que se ve sin conexión: los convenios pendientes de firma, guardados la última vez que hubo conexión. */
export interface PendientesGuardados {
  guardado_en: string;
  pendientes: ConvenioPorFirmar[];
}

interface FichaGuardada {
  guardado_en: string;
  ficha: ConvenioFicha;
}

export const SOLO_PENDIENTES = 'Sin conexión solo podés ver los convenios pendientes de firma guardados en el celular.';

/** La API devuelve como máximo 10 pendientes: es lo único que se guarda. */
const MAXIMO = 10;
const disponible = Platform.OS !== 'web';

/**
 * Carpeta privada de la app (otras apps no la pueden leer; se borra al desinstalar), una por usuario.
 * Se borra al cerrar la sesión (AuthContext), así no quedan datos de convenios en el celular.
 */
function carpeta(usuarioId: number): Directory {
  const dir = new Directory(Paths.document, 'offline', `usuario-${usuarioId}`);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

const archivoPendientes = (usuarioId: number) => new File(carpeta(usuarioId), 'pendientes.json');
const archivoFicha = (usuarioId: number, id: number) => new File(carpeta(usuarioId), `convenio-${id}.json`);
const archivoPdf = (usuarioId: number, id: number) => new File(carpeta(usuarioId), `convenio-${id}.pdf`);

function borrarArchivo(archivo: File) {
  try {
    if (archivo.exists) archivo.delete();
  } catch {
    // si no se pudo borrar, no frena nada
  }
}

async function leerJson<T>(archivo: File): Promise<T | null> {
  try {
    return archivo.exists ? (JSON.parse(await archivo.text()) as T) : null;
  } catch {
    return null;
  }
}

async function escribirJson(archivo: File, datos: unknown) {
  borrarArchivo(archivo);
  archivo.create();
  await archivo.write(JSON.stringify(datos));
}

/** Guarda la lista y baja la ficha y el PDF de los pendientes nuevos o que cambiaron de versión. */
async function sincronizar(usuarioId: number, pendientes: ConvenioPorFirmar[]) {
  const anterior = await leerJson<PendientesGuardados>(archivoPendientes(usuarioId));
  await escribirJson(archivoPendientes(usuarioId), { guardado_en: new Date().toISOString(), pendientes });

  // Los que ya no esperan firma (se firmaron o cambiaron de estado) se borran del celular.
  const actuales = new Set(pendientes.map((p) => p.id));
  for (const viejo of anterior?.pendientes ?? []) {
    if (actuales.has(viejo.id)) continue;
    borrarArchivo(archivoFicha(usuarioId, viejo.id));
    borrarArchivo(archivoPdf(usuarioId, viejo.id));
  }

  for (const p of pendientes) {
    try {
      const guardada = await leerJson<FichaGuardada>(archivoFicha(usuarioId, p.id));
      const pdf = archivoPdf(usuarioId, p.id);
      if (guardada && guardada.ficha.version === p.version && pdf.exists) continue; // ya está al día
      const ficha = await conveniosService.obtener(p.id);
      const descargado = await documentosService.descargarConvenio(ficha, `offline-${usuarioId}-${p.id}.pdf`);
      borrarArchivo(pdf);
      await descargado.copy(pdf);
      borrarArchivo(descargado);
      await escribirJson(archivoFicha(usuarioId, p.id), { guardado_en: new Date().toISOString(), ficha });
    } catch {
      // Si uno falla (ej: se cortó la conexión), se reintenta la próxima vez.
    }
  }
}

const enCurso = new Map<number, Promise<void>>();

/**
 * Modo offline (T2): guarda en el celular los convenios pendientes de firma (lista, ficha y PDF)
 * para poder verlos sin conexión. Firmar, buscar y comentar necesitan conexión.
 */
export const offlineService = {
  /** Se llama con cada resumen que llega de la API. Corre en segundo plano y nunca falla. */
  sincronizar(usuarioId: number, pendientes: ConvenioPorFirmar[]): Promise<void> {
    if (!disponible) return Promise.resolve();
    const actual = enCurso.get(usuarioId);
    if (actual) return actual;
    const tarea = sincronizar(usuarioId, pendientes.slice(0, MAXIMO))
      .catch(() => {})
      .finally(() => enCurso.delete(usuarioId));
    enCurso.set(usuarioId, tarea);
    return tarea;
  },

  /** Pendientes guardados (null si nunca se guardaron). */
  pendientes(usuarioId: number): Promise<PendientesGuardados | null> {
    return disponible ? leerJson<PendientesGuardados>(archivoPendientes(usuarioId)) : Promise.resolve(null);
  },

  /** Ficha del convenio: de la API, o la guardada si no hay conexión. */
  async obtenerFicha(usuarioId: number | undefined, id: string | number): Promise<ConvenioFicha> {
    const guardada = async () =>
      disponible && usuarioId !== undefined ? (await leerJson<FichaGuardada>(archivoFicha(usuarioId, Number(id))))?.ficha : null;
    // Si ya se sabe que no hay conexión, se usa directo lo guardado (no se espera a que falle el pedido).
    if (conexionStore.get().sinConexion) {
      const ficha = await guardada();
      if (ficha) return ficha;
    }
    try {
      return await conveniosService.obtener(id);
    } catch (err) {
      if (!(err instanceof SinConexionError)) throw err;
      const ficha = await guardada();
      if (ficha) return ficha;
      throw new SinConexionError(`Este convenio no está guardado en el celular. ${SOLO_PENDIENTES}`);
    }
  },

  /** PDF del convenio: de la API, o el guardado si no hay conexión. */
  async pdfConvenio(usuarioId: number | undefined, convenio: { id: number; codigo: string }): Promise<File> {
    const guardado = () => {
      if (!disponible || usuarioId === undefined) return null;
      const pdf = archivoPdf(usuarioId, convenio.id);
      return pdf.exists ? pdf : null;
    };
    if (conexionStore.get().sinConexion) {
      const pdf = guardado();
      if (pdf) return pdf;
    }
    try {
      return await documentosService.descargarConvenio(convenio);
    } catch (err) {
      if (!(err instanceof SinConexionError)) throw err;
      const pdf = guardado();
      if (pdf) return pdf;
      throw new SinConexionError(`El PDF de este convenio no está guardado en el celular. ${SOLO_PENDIENTES}`);
    }
  },

  /** Borra todo lo guardado del usuario (al cerrar la sesión). */
  borrar(usuarioId: number) {
    if (!disponible) return;
    try {
      const dir = new Directory(Paths.document, 'offline', `usuario-${usuarioId}`);
      if (dir.exists) dir.delete();
    } catch {
      // nada que borrar
    }
  },
};