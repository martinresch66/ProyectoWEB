/**
 * Carga un módulo nativo recién cuando se usa, y sin romper la app si no existe.
 *
 * Expo Go solo trae algunos módulos nativos y depende de la versión instalada en el celular
 * (ej: "Cannot find native module 'ExpoApplication'"). Si un módulo falta, se devuelve null
 * y quien lo usa recurre a una alternativa (mostrar el código en pantalla, ingresar sin huella, etc.).
 */
const cache = new Map<string, unknown>();

export function cargarModulo<T>(nombre: string, cargar: () => T): T | null {
  if (cache.has(nombre)) return cache.get(nombre) as T | null;
  let modulo: T | null = null;
  try {
    modulo = cargar();
  } catch (err) {
    console.warn(`[nativo] El módulo "${nombre}" no está disponible en este dispositivo:`, (err as Error)?.message);
  }
  cache.set(nombre, modulo);
  return modulo;
}
