import type { Documento } from './convenio';
import type { Rol } from './usuario';

/**
 * Marca que la API escribe en los metadatos del PDF al subirlo desde la app.
 * Cuando se lee de vuelta del archivo, los números llegan como texto.
 */
export interface MarcaDocumento {
  marca: string;
  id_marca: string;
  usuario: string;
  usuario_id: number | string;
  usuario_email: string;
  usuario_rol: Rol | string;
  convenio: string;
  convenio_id: number | string;
  tipo_documento: string;
  nombre_original: string;
  fecha: string; // ISO
  fecha_local: string; // "22/11/2026, 18:05:12" (hora de Argentina)
  paginas: number | string;
  hash_original: string;
  dispositivo: string;
  productor?: string | null;
}

/** ok: el archivo es exactamente el registrado · modificado: cambió · sin_archivo: no está en el servidor. */
export type Integridad = 'ok' | 'modificado' | 'sin_archivo';

/** GET /mobile/documentos/:id */
export interface DetalleDocumento {
  documento: Documento & { convenio_id: number };
  integridad: Integridad;
  /** null si el PDF no tiene marca de la app (por ejemplo, si se subió desde la web). */
  marca: MarcaDocumento | null;
}

/** POST /mobile/convenios/:id/documentos */
export interface ResultadoSubida {
  message: string;
  documento: Documento & { convenio_id: number };
  marca: MarcaDocumento;
}