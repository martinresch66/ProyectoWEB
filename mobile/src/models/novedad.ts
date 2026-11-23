import type { ConvenioRelacionado } from './convenio';

/**
 * Notificaciones: lo que devuelve GET /mobile/novedades?desde=… (ruta propia de la app).
 * La API las arma con lo que pasó en la base, también lo que se hizo desde la web.
 */
export type TipoNovedad =
  | 'nuevo_convenio'
  | 'comentario'
  | 'cambio_estado'
  | 'cancelado'
  | 'documento'
  | 'cambio_datos'
  | 'alerta';

/** Pantalla que se abre al tocar la novedad o su notificación. */
export type DestinoNovedad =
  | { pantalla: 'convenio' | 'comentarios' | 'archivo'; id: number }
  | { pantalla: 'avisos' | 'firmar'; id: null };

export interface Novedad {
  /** Único (ej: "comentario-12"): sirve para no avisar dos veces lo mismo. */
  id: string;
  tipo: TipoNovedad;
  titulo: string;
  mensaje: string;
  fecha: string;
  convenio: ConvenioRelacionado | null;
  destino: DestinoNovedad;
}

export interface Novedades {
  /** Fecha a mandar como "desde" en la próxima consulta. */
  generado_en: string;
  desde: string;
  novedades: Novedad[];
  /** Para el recordatorio "Aún tenés un convenio por firmar" (solo admin y gestión). */
  por_firmar: { cantidad: number; esperan_desde: string | null; convenios: ConvenioRelacionado[] };
}