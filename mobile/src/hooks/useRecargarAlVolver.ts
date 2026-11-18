import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
/**
 * Este hook actualiza una pantalla cuando vuelves a ella. Por ejemplo, después de firmar, 
 * el Inicio ya muestra los números nuevos sin deslizar hacia abajo.
 */
/**
 * Vuelve a cargar los datos cada vez que la pantalla queda visible de nuevo
 * (por ejemplo, al volver después de firmar un convenio). La primera vez no, porque useAsync ya los carga.
 */
export function useRecargarAlVolver(recargar: () => void) {
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      recargar();
    }, [recargar]),
  );
}