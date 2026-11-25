import type { LecturaConvenio } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** "Escuchar el convenio": la API saca el texto del mismo PDF que se lee para firmar. */
export const lecturaService = {
  obtener(convenioId: number | string): Promise<LecturaConvenio> {
    return apiRequest<LecturaConvenio>(ENDPOINTS.lectura(convenioId));
  },
};
