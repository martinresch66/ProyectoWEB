import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { ResumenInicio } from '@/models';
import { useConexion } from '@/services/conexion.store';
import { offlineService, type PendientesGuardados } from '@/services/offline.service';

import { useAsync } from './useAsync';

/**
 * Modo offline: con cada resumen que llega de la API se guardan en el celular los pendientes de firma.
 * Devuelve los guardados, para mostrarlos cuando no hay conexión.
 */
export function usePendientesOffline(resumen: ResumenInicio | null): PendientesGuardados | null {
  const { usuario } = useAuth();
  const { sinConexion } = useConexion();
  const usuarioId = usuario?.id ?? null;

  useEffect(() => {
    if (usuarioId === null || !resumen) return;
    offlineService.sincronizar(usuarioId, resumen.puede_firmar ? resumen.pendientes_firma : []);
  }, [usuarioId, resumen]);

  // Se vuelven a leer al quedarse sin conexión (o al recuperarla).
  const guardados = useAsync(
    () => (usuarioId === null ? Promise.resolve(null) : offlineService.pendientes(usuarioId)),
    [usuarioId, sinConexion],
  );
  return guardados.data;
}