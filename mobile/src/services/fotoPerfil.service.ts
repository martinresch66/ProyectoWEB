import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { cargarModulo } from './nativo';
import { storage, StorageKeys } from './storage';

type ManipuladorModule = typeof import('expo-image-manipulator');

/** Lado de la miniatura: 256 px alcanza para el avatar más grande (72 px) en pantallas de alta densidad. */
const LADO_MINIATURA = 256;
/** Solo se aceptan nombres que arma este servicio (evita rutas raras si alguien toca el almacenamiento). */
const NOMBRE_VALIDO = /^usuario-\d+-\d+\.jpg$/;

/** usuarioId → dirección de su foto (null = sin foto). Lo comparten el header y Mi Perfil. */
const fotos = new Map<number, string | null>();
const cargando = new Set<number>();
const oyentes = new Set<() => void>();

const avisar = () => oyentes.forEach((oyente) => oyente());
function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Carpeta privada de la app: otras apps no pueden leerla y se borra al desinstalar. */
function carpeta(): Directory {
  const dir = new Directory(Paths.document, 'perfil');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function borrarSinError(archivo: File) {
  try {
    if (archivo.exists) archivo.delete();
  } catch {
    // si no se pudo borrar, no frena nada
  }
}

function manipulador(): ManipuladorModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-image-manipulator', () => require('expo-image-manipulator') as ManipuladorModule);
}

/** Achica la foto a 256 × 256 (JPEG). Si no se puede, se usa la original. */
async function crearMiniatura(uri: string): Promise<string> {
  const M = manipulador();
  if (!M) return uri;
  try {
    const imagen = await M.ImageManipulator.manipulate(uri).resize({ width: LADO_MINIATURA, height: null }).renderAsync();
    const resultado = await imagen.saveAsync({ compress: 0.7, format: M.SaveFormat.JPEG });
    return resultado.uri;
  } catch {
    return uri;
  }
}

async function nombreGuardado(usuarioId: number): Promise<string | null> {
  const nombre = await storage.get<string>(StorageKeys.fotoPerfil(usuarioId));
  return typeof nombre === 'string' && NOMBRE_VALIDO.test(nombre) ? nombre : null;
}

async function cargar(usuarioId: number) {
  if (fotos.has(usuarioId) || cargando.has(usuarioId)) return;
  cargando.add(usuarioId);
  try {
    const nombre = Platform.OS === 'web' ? null : await nombreGuardado(usuarioId);
    const archivo = nombre ? new File(carpeta(), nombre) : null;
    fotos.set(usuarioId, archivo?.exists ? archivo.uri : null);
  } catch {
    fotos.set(usuarioId, null);
  } finally {
    cargando.delete(usuarioId);
    avisar();
  }
}

/**
 * Foto de perfil (T2): se saca con la cámara o se elige de la galería, se recorta cuadrada
 * y se guarda en miniatura solo en este celular (no se manda a la API).
 */
export const fotoPerfilService = {
  /** Guarda la miniatura de una foto recién elegida y reemplaza la anterior. */
  async guardar(usuarioId: number, fotoTemporal: string): Promise<void> {
    if (Platform.OS === 'web') throw new Error('La foto de perfil se carga desde el celular.');
    const miniatura = await crearMiniatura(fotoTemporal);
    // Nombre nuevo en cada cambio: así la app no muestra la foto vieja que tenía en caché.
    const nombre = `usuario-${usuarioId}-${Date.now()}.jpg`;
    const destino = new File(carpeta(), nombre);
    await new File(miniatura).copy(destino);

    const anterior = await nombreGuardado(usuarioId);
    await storage.set(StorageKeys.fotoPerfil(usuarioId), nombre);
    if (anterior && anterior !== nombre) borrarSinError(new File(carpeta(), anterior));
    // La foto grande y la miniatura temporal quedaban en el caché: se borran.
    borrarSinError(new File(fotoTemporal));
    if (miniatura !== fotoTemporal) borrarSinError(new File(miniatura));

    fotos.set(usuarioId, destino.uri);
    avisar();
  },

  /** Quita la foto: vuelven a verse las iniciales. */
  async quitar(usuarioId: number): Promise<void> {
    const nombre = await nombreGuardado(usuarioId);
    if (nombre) borrarSinError(new File(carpeta(), nombre));
    await storage.remove(StorageKeys.fotoPerfil(usuarioId));
    fotos.set(usuarioId, null);
    avisar();
  },
};

/** Dirección de la foto del usuario (o null). Se actualiza sola cuando cambia. */
export function useFotoPerfil(usuarioId: number | null): string | null {
  const uri = useSyncExternalStore(
    suscribir,
    () => (usuarioId === null ? null : (fotos.get(usuarioId) ?? null)),
    () => null,
  );
  useEffect(() => {
    if (usuarioId !== null) cargar(usuarioId);
  }, [usuarioId]);
  return uri;
}