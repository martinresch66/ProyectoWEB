"use client";

// Hook de cliente para cargar datos y exponer los estados de carga, error y caché.
//
// Uso:
//   const { datos, cargando, error, desdeCache, recargar } = useDatos(() => convenios.obtener(id), `ficha-${id}`);
//
// "clave" tiene que cambiar cuando cambian los parámetros de la consulta (filtros, id, página).
// la clave es un texto por ejemplo convenio:5. significa “qué datos quiero”.
//  Mientras sea la misma, el hook reutiliza lo que tiene. Cuando cambia, pide de nuevo y muestra el estado de carga

import { useCallback, useEffect, useRef, useState } from "react";

// Admite respuestas normales y respuestas que incluyen metadatos de caché.
function separar(respuesta) {
  if (respuesta && typeof respuesta === "object" && "datos" in respuesta && "desdeCache" in respuesta) {
    return { datos: respuesta.datos, desdeCache: respuesta.desdeCache };
  }
  // Si la respuesta no trae metadatos, se considera que no viene de la caché.
  return { datos: respuesta, desdeCache: false };
}

export function useDatos(cargar, clave = "") {
  // Incrementar este contador fuerza una nueva petición aunque la clave no cambie.
  const [recargas, setRecargas] = useState(0);
  // Identifica la consulta actual, incluyendo las recargas manuales.
  const pedido = `${clave}#${recargas}`;
  // Conserva juntos los datos y los metadatos correspondientes a una petición.
  const [estado, setEstado] = useState({ pedido: null, datos: null, error: null, desdeCache: false });

  // Mantiene la función de carga más reciente sin usarla como dependencia del efecto.
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });

  // Ejecuta la consulta cuando cambia su clave o se solicita una recarga.
  useEffect(() => {
    let activo = true;
    cargarRef.current().then(
      (respuesta) => {
        // Evita actualizar el estado si el componente ya se desmontó o la petición se invalidó.
        if (activo) setEstado({ pedido, ...separar(respuesta), error: null });
      },
      (error) => {
        // Conserva los últimos datos, pero registra el error de esta petición.
        if (activo) setEstado((anterior) => ({ ...anterior, pedido, error }));
      },
    );
    return () => {
      // Invalida los callbacks de la petición anterior al cambiar la consulta o desmontar.
      activo = false;
    };
  }, [pedido]);

  // Cambiar el contador hace que el efecto anterior vuelva a ejecutarse.
  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  // Permite actualizar los datos localmente, por ejemplo tras guardar, sin otra petición.
  const reemplazarDatos = useCallback((cambiar) => {
    // Acepta tanto un valor nuevo como una función que lo calcula desde los datos actuales.
    setEstado((anterior) => ({ ...anterior, datos: typeof cambiar === "function" ? cambiar(anterior.datos) : cambiar }));
  }, []);

  // Mientras el pedido guardado no corresponda a la consulta actual, esta sigue cargando.
  const cargando = estado.pedido !== pedido;
  return {
    datos: estado.datos,
    cargando,
    // Oculta el error anterior mientras se está procesando una nueva consulta.
    error: cargando ? null : estado.error,
    desdeCache: estado.desdeCache,
    recargar,
    reemplazarDatos,
  };
}
