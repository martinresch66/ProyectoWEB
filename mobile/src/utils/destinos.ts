import type { Href } from 'expo-router';

import type { DestinoNovedad } from '@/models';

const CON_ID = ['convenio', 'comentarios', 'archivo'] as const;
const SIN_ID = ['avisos', 'firmar'] as const;

/**
 * Lee el destino guardado en una notificación. Los datos vienen de afuera de la app,
 * así que se validan: si no es un destino conocido, devuelve null y no se navega.
 */
export function leerDestino(datos: unknown): DestinoNovedad | null {
  const destino = (datos as { destino?: unknown } | null)?.destino as { pantalla?: unknown; id?: unknown } | undefined;
  if (!destino || typeof destino !== 'object') return null;
  const { pantalla, id } = destino;
  if ((CON_ID as readonly unknown[]).includes(pantalla) && Number.isInteger(id) && (id as number) > 0) {
    return { pantalla: pantalla as (typeof CON_ID)[number], id: id as number };
  }
  if ((SIN_ID as readonly unknown[]).includes(pantalla)) return { pantalla: pantalla as (typeof SIN_ID)[number], id: null };
  return null;
}

/** Ruta de Expo Router para un destino. */
export function rutaDeDestino(destino: DestinoNovedad): Href {
  switch (destino.pantalla) {
    case 'convenio':
      return { pathname: '/convenio/[id]', params: { id: String(destino.id) } };
    case 'comentarios':
      return { pathname: '/comentarios/[id]', params: { id: String(destino.id) } };
    case 'archivo':
      return { pathname: '/archivo/[id]', params: { id: String(destino.id) } };
    case 'firmar':
      return '/firmar';
    case 'avisos':
      return '/avisos';
  }
}