import { useState } from 'react';

import { conexionStore } from '@/services/conexion.store';
import { SOLO_PENDIENTES } from '@/services/offline.service';

import { Button } from '../atoms';
import { EmptyState } from '../molecules';

export interface SinConexionProps {
  /** Qué no se puede hacer, ej: "El buscador necesita conexión." */
  mensaje: string;
}

/**
 * Organismo: pantalla de "Sin conexión" para lo que necesita la API (buscador, comentarios…).
 * "Reintentar" prueba la conexión; si volvió, la pantalla se recarga sola (useConexion).
 */
export function SinConexion({ mensaje }: SinConexionProps) {
  const [probando, setProbando] = useState(false);

  async function reintentar() {
    setProbando(true);
    await conexionStore.comprobar();
    setProbando(false);
  }

  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Sin conexión"
      message={`${mensaje} ${SOLO_PENDIENTES}`}
      action={<Button title="Reintentar" icon="refresh" variant="secondary" loading={probando} onPress={reintentar} />}
    />
  );
}