import { useSyncExternalStore } from 'react';

import { storage, StorageKeys } from './storage';

/** Cada cuánto recordar (se elige en Mi Perfil). "demo" es 1 minuto, para mostrarlo en la defensa. */
export type FrecuenciaRecordatorio = 'demo' | 'h4' | 'h24' | 'nunca';

export const SEGUNDOS_RECORDATORIO: Record<FrecuenciaRecordatorio, number | null> = {
  demo: 60,
  h4: 4 * 60 * 60,
  h24: 24 * 60 * 60,
  nunca: null,
};

/** Texto para los mensajes: "1 minuto", "4 horas"… */
export const TEXTO_RECORDATORIO: Record<FrecuenciaRecordatorio, string> = {
  demo: '1 minuto',
  h4: '4 horas',
  h24: '24 horas',
  nunca: '',
};

interface EstadoAvisos {
  /** Novedades que llegaron y todavía no se vieron en la pantalla Avisos (número de la campanita). */
  sinLeer: number;
  frecuencia: FrecuenciaRecordatorio;
}

let estado: EstadoAvisos = { sinLeer: 0, frecuencia: 'h24' };
const oyentes = new Set<() => void>();

function cambiar(parcial: Partial<EstadoAvisos>) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((avisar) => avisar());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const esFrecuencia = (valor: unknown): valor is FrecuenciaRecordatorio =>
  typeof valor === 'string' && Object.hasOwn(SEGUNDOS_RECORDATORIO, valor);

/**
 * Estado compartido de los avisos (fuera de React): lo usan el header (campanita), la pantalla
 * Avisos, Mi Perfil y el hook que consulta la API. useAvisos() redibuja cuando cambia.
 */
export const avisosStore = {
  get: () => estado,
  sumarSinLeer(cantidad: number) {
    if (cantidad > 0) cambiar({ sinLeer: estado.sinLeer + cantidad });
  },
  marcarLeidos() {
    if (estado.sinLeer > 0) cambiar({ sinLeer: 0 });
  },
  async cargarFrecuencia() {
    const guardada = await storage.get<string>(StorageKeys.recordatorios);
    if (esFrecuencia(guardada) && guardada !== estado.frecuencia) cambiar({ frecuencia: guardada });
  },
  async cambiarFrecuencia(frecuencia: FrecuenciaRecordatorio) {
    cambiar({ frecuencia });
    await storage.set(StorageKeys.recordatorios, frecuencia);
  },
  /** Al cerrar sesión: el próximo usuario empieza sin avisos pendientes. */
  reiniciar() {
    cambiar({ sinLeer: 0 });
  },
};

export function useAvisos(): EstadoAvisos {
  return useSyncExternalStore(suscribir, avisosStore.get, avisosStore.get);
}