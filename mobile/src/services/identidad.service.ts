import { Directory, File, Paths } from 'expo-file-system';

import type { FirmaDibujada, IdentidadRegistrada } from '@/models';

/** Cómo queda guardado en el archivo (la foto se guarda por nombre, no por dirección completa). */
interface IdentidadGuardada {
  firma: IdentidadRegistrada['firma'];
  /** `reconocido` falta en lo guardado antes del reconocimiento facial: cuenta como no reconocido. */
  rostro: { archivo: string; registrado_en: string; reconocido?: boolean } | null;
  huella: IdentidadRegistrada['huella'];
}

const VACIA: IdentidadGuardada = { firma: null, rostro: null, huella: null };

/**
 * Carpeta privada de la app (Paths.document): otras apps no pueden leerla y se borra al desinstalar.
 * Los datos de identidad no se mandan a la API: quedan solo en este celular.
 */
function carpeta(): Directory {
  const dir = new Directory(Paths.document, 'identidad');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

const archivoDatos = (usuarioId: number) => new File(carpeta(), `usuario-${usuarioId}.json`);

async function leer(usuarioId: number): Promise<IdentidadGuardada> {
  const archivo = archivoDatos(usuarioId);
  if (!archivo.exists) return { ...VACIA };
  try {
    return { ...VACIA, ...(JSON.parse(await archivo.text()) as Partial<IdentidadGuardada>) };
  } catch {
    return { ...VACIA }; // archivo dañado: se empieza de cero
  }
}

async function escribir(usuarioId: number, datos: IdentidadGuardada) {
  const archivo = archivoDatos(usuarioId);
  if (archivo.exists) archivo.delete();
  archivo.create();
  await archivo.write(JSON.stringify(datos));
}

function borrarFoto(nombre: string | undefined) {
  if (!nombre) return;
  const foto = new File(carpeta(), nombre);
  if (foto.exists) foto.delete();
}

const ahora = () => new Date().toISOString();

/** Registrar mi identidad: firma, rostro y huella de cada usuario, guardados en el celular. */
export const identidadService = {
  async obtener(usuarioId: number): Promise<IdentidadRegistrada> {
    const datos = await leer(usuarioId);
    const foto = datos.rostro ? new File(carpeta(), datos.rostro.archivo) : null;
    return {
      firma: datos.firma,
      rostro:
        datos.rostro && foto?.exists
          ? { foto: foto.uri, registrado_en: datos.rostro.registrado_en, reconocido: datos.rostro.reconocido === true }
          : null,
      huella: datos.huella,
    };
  },

  async guardarFirma(usuarioId: number, firma: FirmaDibujada): Promise<void> {
    const datos = await leer(usuarioId);
    await escribir(usuarioId, { ...datos, firma: { ...firma, registrada_en: ahora() } });
  },

  /** Copia la foto que sacó la cámara (está en el caché) a la carpeta privada, con un nombre nuevo. */
  async guardarRostro(usuarioId: number, fotoTemporal: string, reconocido: boolean): Promise<void> {
    const datos = await leer(usuarioId);
    const nombre = `usuario-${usuarioId}-rostro-${Date.now()}.jpg`;
    await new File(fotoTemporal).copy(new File(carpeta(), nombre));
    borrarFoto(datos.rostro?.archivo);
    await escribir(usuarioId, { ...datos, rostro: { archivo: nombre, registrado_en: ahora(), reconocido } });
  },

  async guardarHuella(usuarioId: number, tipo: string): Promise<void> {
    const datos = await leer(usuarioId);
    await escribir(usuarioId, { ...datos, huella: { tipo, registrada_en: ahora() } });
  },

  /** Borra todo lo registrado por el usuario en este celular. */
  async borrar(usuarioId: number): Promise<void> {
    const datos = await leer(usuarioId);
    borrarFoto(datos.rostro?.archivo);
    const archivo = archivoDatos(usuarioId);
    if (archivo.exists) archivo.delete();
  },
};