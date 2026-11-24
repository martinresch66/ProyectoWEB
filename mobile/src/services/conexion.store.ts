import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { env } from '@/config/env';

/** Mientras no hay conexión, cada cuánto se prueba si la API volvió. */
const SONDEO_MS = 15 * 1000;

export interface EstadoConexion {
  /** true si el último pedido a la API no tuvo respuesta (sin internet, sin Wi-Fi o API apagada). */
  sinConexion: boolean;
  /** Desde cuándo no hay conexión (ISO), o null. */
  desde: string | null;
}

let estado: EstadoConexion = { sinConexion: false, desde: null };
const oyentes = new Set<() => void>();
let sondeo: ReturnType<typeof setInterval> | null = null;

function cambiar(sinConexion: boolean) {
  if (estado.sinConexion === sinConexion) return;
  estado = { sinConexion, desde: sinConexion ? new Date().toISOString() : null };
  oyentes.forEach((oyente) => oyente());
  if (sinConexion) {
    sondeo ??= setInterval(() => {
      if (AppState.currentState === 'active') conexionStore.comprobar();
    }, SONDEO_MS);
  } else if (sondeo) {
    clearInterval(sondeo);
    sondeo = null;
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * Modo offline (T2): estado de la conexión con la API, compartido por toda la app.
 * Lo actualiza el cliente HTTP con cada pedido: si la API responde hay conexión; si no, no.
 * Sin conexión, cada 15 s se prueba GET /health para darse cuenta solo cuando vuelve.
 */
export const conexionStore = {
  get: () => estado,
  /** La API respondió (con cualquier código): hay conexión. */
  respondio: () => cambiar(false),
  /** El pedido no tuvo respuesta. */
  sinRespuesta: () => cambiar(true),
  /** Prueba si la API está disponible (máximo 5 s). */
  async comprobar(): Promise<boolean> {
    const controlador = new AbortController();
    const espera = setTimeout(() => controlador.abort(), 5000);
    try {
      await fetch(`${env.apiUrl}/health`, { signal: controlador.signal });
      cambiar(false);
      return true;
    } catch {
      cambiar(true);
      return false;
    } finally {
      clearTimeout(espera);
    }
  },
};

/**
 * Estado de la conexión para una pantalla. `alReconectar` se llama cuando vuelve la conexión
 * (ej: para recargar los datos sin que la persona tenga que hacer nada).
 */
export function useConexion(alReconectar?: () => void): EstadoConexion {
  const actual = useSyncExternalStore(suscribir, conexionStore.get, conexionStore.get);
  const antes = useRef(actual.sinConexion);
  useEffect(() => {
    if (antes.current && !actual.sinConexion) alReconectar?.();
    antes.current = actual.sinConexion;
  }, [actual.sinConexion, alReconectar]);
  return actual;
}
