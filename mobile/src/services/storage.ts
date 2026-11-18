import { cargarModulo } from './nativo';

type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage').default;

/** Almacén clave/valor básico (lo usan storage y secureStorage). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Si AsyncStorage no está disponible, los datos se guardan en memoria mientras la app esté abierta. */
const memoria = new Map<string, string>();
const almacenEnMemoria: KeyValueStore = {
  getItem: async (k) => memoria.get(k) ?? null,
  setItem: async (k, v) => void memoria.set(k, v),
  removeItem: async (k) => void memoria.delete(k),
};

export function almacenBasico(): KeyValueStore {
  const AsyncStorage = cargarModulo(
    '@react-native-async-storage/async-storage',
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito (ver nativo.ts)
    () => (require('@react-native-async-storage/async-storage') as { default: AsyncStorageModule }).default,
  );
  return AsyncStorage ?? almacenEnMemoria;
}

/**
 * Almacenamiento local del dispositivo (preferencias, caché).
 * Un error de lectura/escritura nunca rompe la app.
 */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await almacenBasico().getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await almacenBasico().setItem(key, JSON.stringify(value));
    } catch {
      // Si no se puede guardar, la app sigue funcionando con el valor en memoria.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await almacenBasico().removeItem(key);
    } catch {
      // idem
    }
  },
};

export const StorageKeys = {
  preferences: 'preferences',
} as const;
