import type { IndicadorResumen, ListadoIndicador, ResumenInicio } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Datos de la pantalla de Inicio. La API ya filtra por el rol y la unidad del usuario. */
export const resumenService = {
  obtener(): Promise<ResumenInicio> {
    return apiRequest<ResumenInicio>(ENDPOINTS.resumen);
  },

  /** Convenios de un box del Inicio (firmados, vigentes, en trámite, esperando firma…). */
  listar(indicador: IndicadorResumen): Promise<ListadoIndicador> {
    return apiRequest<ListadoIndicador>(ENDPOINTS.indicador(indicador));
  },
};