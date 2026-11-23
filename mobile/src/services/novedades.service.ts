import type { Novedades } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Notificaciones vía API: qué pasó en los convenios que el usuario puede ver. */
export const novedadesService = {
  /** Lo que pasó después de `desde`. Sin fecha, las de los últimos 7 días (pantalla Avisos). */
  listar(desde?: string): Promise<Novedades> {
    return apiRequest<Novedades>(ENDPOINTS.novedades, { query: { desde } });
  },
};