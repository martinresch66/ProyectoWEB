import type { Convenio, Documento, EstadoConvenio, TipoConvenio, TipoVinculo, Unidad, Vigencia } from './convenio';

/** Filtros del buscador avanzado (GET /mobile/buscar). Todos opcionales. */
export interface FiltrosBusqueda {
  q?: string;
  /** Año de inicio del convenio (o de su carga, si todavía no tiene fecha de inicio). */
  anio?: number;
  tipo?: TipoConvenio;
  estado?: EstadoConvenio;
  unidad_id?: number;
  vigencia?: Exclude<Vigencia, 'aun_no_vigente'>;
}

/**
 * Un convenio dentro del árbol de resultados: sus resoluciones, el resto de su documentación
 * y los convenios que cuelgan de él (específicos, adendas, renovaciones…).
 */
export interface NodoConvenio {
  convenio: Convenio & { unidad: Unidad | null };
  /** Cómo cuelga de su padre; null en la raíz. */
  tipo_vinculo: TipoVinculo | null;
  /** true si cumple la búsqueda; los demás se muestran para que se vea la familia completa. */
  coincide: boolean;
  resoluciones: Documento[];
  documentos: Documento[];
  hijos: NodoConvenio[];
}

export interface ResultadoBusqueda {
  /** Cantidad de convenios que cumplen la búsqueda (no cuenta los padres e hijos agregados como contexto). */
  total: number;
  arboles: NodoConvenio[];
}
