import Constants from 'expo-constants';

/** Puerto de la API simulada de mobile/api (Laravel usa el 8000 y la web el 3000). */
const API_PORT = 4000;

/**
 * URL base de la API, terminada en /api (igual que NEXT_PUBLIC_API_URL de la web).
 *
 * 1. Si existe EXPO_PUBLIC_API_URL (archivo mobile/.env), se usa esa. Sirve para apuntar
 *    al backend de Laravel o a la API en otra PC.
 * 2. Si no, se arma con la IP de la PC que está corriendo `npx expo start`
 *    (la misma que usa Expo Go para conectarse), así no hay que configurar nada
 *    mientras la API simulada corra en la misma PC.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // ej: "192.168.0.10:8081"
  const host = hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:${API_PORT}/api`;
}

export const env = {
  apiUrl: resolveApiUrl(),
  requestTimeoutMs: 10000,
};
