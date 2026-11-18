import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Vuelve a ejecutar la carga (botón "Reintentar" o "tirar para actualizar"). */
  reload: () => void;
}

interface Settled<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Ejecuta una función asíncrona (ej: un servicio) y expone datos, carga y error.
 * Se vuelve a ejecutar cuando cambian las dependencias (`deps`) o al llamar a `reload()`.
 * Mientras recarga, mantiene los datos anteriores (para "tirar para actualizar").
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[]): AsyncState<T> {
  const fnRef = useRef(fn);
  const [reloadCount, setReloadCount] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    fnRef.current = fn;
  });

  // Identifica cada carga: cambia si cambian las dependencias o si se pide recargar.
  const key = `${JSON.stringify(deps)}#${reloadCount}`;

  useEffect(() => {
    let cancelled = false;
    fnRef.current().then(
      (data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      },
      (err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado';
          setSettled((prev) => ({ key, data: prev.data, error: message }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  const loading = settled.key !== key;

  return { data: settled.data, loading, error: loading ? null : settled.error, reload };
}
