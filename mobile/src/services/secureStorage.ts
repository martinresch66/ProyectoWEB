import { Platform } from 'react-native';

import { cargarModulo } from './nativo';
import { almacenBasico, type KeyValueStore } from './storage';

type SecureStoreModule = typeof import('expo-secure-store');

/**
 * Almacén para datos sensibles (tokens de sesión, token de huella).
 * En el celular usa SecureStore (encriptado por el sistema: Android Keystore).
 * Si no está disponible (web, o un Expo Go sin el módulo), usa el almacenamiento común.
 */
function almacenSeguro(): KeyValueStore {
  if (Platform.OS === 'web') return almacenBasico();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
  const SecureStore = cargarModulo('expo-secure-store', () => require('expo-secure-store') as SecureStoreModule);
  if (!SecureStore) return almacenBasico();
  return {
    getItem: (k) => SecureStore.getItemAsync(k),
    setItem: (k, v) => SecureStore.setItemAsync(k, v),
    removeItem: (k) => SecureStore.deleteItemAsync(k),
  };
}

export const secureStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await almacenSeguro().getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    await almacenSeguro().setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    try {
      await almacenSeguro().removeItem(key);
    } catch {
      // si no existe, no hay nada que borrar
    }
  },
};

export const SecureKeys = {
  session: 'session',
  deviceId: 'device_id',
  biometric: 'biometric_login',
} as const;
