import type { FirmaDibujada, FirmaRegistrada, MetodoVerificacion, Ubicacion } from '@/models';

import { apiRequest } from './api/client';
import { ENDPOINTS } from './api/endpoints';

/** Lo que se manda para firmar. `version` es la del convenio que se leyó (si cambió, la API responde 409). */
export interface PedidoFirma {
  version: number;
  verificacion: MetodoVerificacion;
  firma: FirmaDibujada;
  ubicacion: Ubicacion;
}

/** Firma de convenios: la API guarda el PDF firmado con la fecha, la hora, la latitud y la longitud. */
export const firmaService = {
  firmar(convenioId: number, pedido: PedidoFirma): Promise<{ message: string; firma: FirmaRegistrada }> {
    return apiRequest(ENDPOINTS.firmaConvenio(convenioId), { method: 'POST', body: pedido });
  },

  /** Firma hecha desde la app (null si el convenio no se firmó así). */
  async obtener(convenioId: number): Promise<FirmaRegistrada | null> {
    const { firma } = await apiRequest<{ firma: FirmaRegistrada | null }>(ENDPOINTS.firmaConvenio(convenioId));
    return firma;
  },
};