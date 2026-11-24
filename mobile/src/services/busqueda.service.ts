import type { FiltrosBusqueda, ResultadoBusqueda, Unidad } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Buscador avanzado: resultados en árbol (padre → hijos, resoluciones y documentación). */
export const busquedaService = {
  buscar(filtros: FiltrosBusqueda): Promise<ResultadoBusqueda> {
    return apiRequest<ResultadoBusqueda>(ENDPOINTS.buscar, { query: { ...filtros } });
  },

  /** Unidades académicas, para el filtro "Unidad" (GET /units, CONTRATO-API.md §8). */
  unidades(): Promise<Unidad[]> {
    return apiRequest<Unidad[]>(ENDPOINTS.unidades);
  },
};
