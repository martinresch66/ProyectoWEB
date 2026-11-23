import type { Comentario, ComentariosDeConvenio } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Comentarios dentro del convenio. La API controla quién los ve y detecta los ofensivos. */
export const comentariosService = {
  listar(convenioId: number | string): Promise<ComentariosDeConvenio> {
    return apiRequest<ComentariosDeConvenio>(ENDPOINTS.comentarios(convenioId));
  },

  crear(convenioId: number | string, texto: string): Promise<{ message: string; comentario: Comentario }> {
    return apiRequest(ENDPOINTS.comentarios(convenioId), { method: 'POST', body: { texto } });
  },
};