import type { Convenio, ConvenioRelacionado, EstadoConvenio, TipoDocumento, UsuarioResumen } from './convenio';

/**
 * Pantalla de Inicio: lo que devuelve GET /mobile/resumen (ruta propia de la app, ver mobile/README.md).
 * La API calcula todo según el rol y la unidad del usuario.
 */

interface MovimientoBase {
  id: string; // ej: "estado-18", "documento-5"
  fecha: string; // ISO con hora
  usuario: UsuarioResumen | null;
  convenio: ConvenioRelacionado;
}

/** Cambio de estado (tabla transiciones_estado). */
export interface MovimientoEstado extends MovimientoBase {
  tipo: 'estado';
  detalle: { estado_anterior: EstadoConvenio | null; estado_nuevo: EstadoConvenio; motivo: string };
}

/** Documento subido (tabla documentos). */
export interface MovimientoDocumento extends MovimientoBase {
  tipo: 'documento';
  detalle: { tipo_documento: TipoDocumento; nombre_original: string };
}

export type Movimiento = MovimientoEstado | MovimientoDocumento;

/** Convenio aprobado que espera la firma, con la fecha en que se aprobó. */
export interface ConvenioPorFirmar extends Convenio {
  aprobado_en: string;
}

export interface ResumenInicio {
  /** Cuándo se calcularon los datos (sirve para mostrar "actualizado hace…" sin conexión). */
  generado_en: string;
  totales: {
    firmados_ultimo_anio: number;
    vigentes: number;
    proximos_a_vencer: number;
    en_tramite: number;
    por_firmar: number;
    avisos_sin_leer: number;
  };
  /** true si el rol del usuario registra firmas (admin y gestión). */
  puede_firmar: boolean;
  /** Mis pendientes: máximo 10, los aprobados más recientes primero. Vacío si no puede firmar. */
  pendientes_firma: ConvenioPorFirmar[];
  /** Un ítem por convenio (su último movimiento), máximo 10, del más reciente al más antiguo. */
  ultimos_movimientos: Movimiento[];
}