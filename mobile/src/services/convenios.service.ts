import type { ConvenioFicha, EstadoConvenio, Paginado, Convenio, TipoConvenio, Vigencia } from '@/models';

import { adaptarFicha, adaptarListado } from './api/adaptadores';
import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Filtros de GET /agreements (CONTRATO-API.md §4). Todos opcionales. */
export interface ConveniosFiltro {
  q?: string;
  tipo?: TipoConvenio;
  estado?: EstadoConvenio;
  unidad_id?: number;
  vigencia?: Exclude<Vigencia, 'aun_no_vigente'>;
  desde?: string;
  hasta?: string;
  page?: number;
  per_page?: number;
}

/**
 * Servicio de convenios: la única parte de la app que sabe de dónde salen los datos.
 * Las pantallas llaman a estas funciones y no conocen las URLs de la API.
 * El backend ya filtra según el rol y la unidad del usuario.
 */
export const conveniosService = {
  async listar(filtro: ConveniosFiltro = {}): Promise<Paginado<Convenio>> {
    return adaptarListado(await apiRequest<unknown>(ENDPOINTS.convenios, { query: { ...filtro } }));
  },

  async obtener(id: number | string): Promise<ConvenioFicha> {
    return adaptarFicha(await apiRequest<unknown>(ENDPOINTS.convenio(id)));
  },
};
