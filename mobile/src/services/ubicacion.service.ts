import { Platform } from 'react-native';

import type { Ubicacion } from '@/models';

import { cargarModulo } from './nativo';

type LocationModule = typeof import('expo-location');

/** Error con un mensaje listo para mostrar (permiso denegado, GPS apagado…). */
export class UbicacionError extends Error {}

function location(): LocationModule | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  return cargarModulo('expo-location', () => require('expo-location') as LocationModule);
}

/** Espera una promesa como máximo `ms` milisegundos; si tarda más, devuelve null. */
function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((resolver) => {
    reloj = setTimeout(() => resolver(null), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
}

/**
 * Pide permiso y devuelve dónde está el celular, para registrar el lugar de la firma.
 * Si el GPS tarda (por ejemplo, adentro de un edificio), usa la última ubicación de los últimos 5 minutos.
 */
export async function obtenerUbicacion(): Promise<Ubicacion> {
  const Location = location();
  if (!Location) throw new UbicacionError('Este dispositivo no puede obtener la ubicación.');

  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new UbicacionError(
      permiso.canAskAgain
        ? 'Necesitamos tu ubicación para registrar dónde firmás. Tocá "Reintentar" y permití el acceso.'
        : 'El permiso de ubicación está bloqueado. Activalo en "Ajustes" y tocá "Reintentar".',
    );
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new UbicacionError('La ubicación del celular está apagada. Activala y tocá "Reintentar".');
  }

  const actual = await conLimite(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000);
  const posicion = actual ?? (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }));
  if (!posicion) throw new UbicacionError('No pudimos obtener tu ubicación. Acercate a una ventana y tocá "Reintentar".');

  const { latitude, longitude, accuracy } = posicion.coords;
  return { latitud: latitude, longitud: longitude, precision_m: accuracy === null ? null : Math.round(accuracy) };
}