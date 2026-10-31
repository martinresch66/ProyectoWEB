"use client";

// Carga datos de la API y maneja los estados cargando / error / desde la copia local.
//
// Uso:
//   const { datos, cargando, error, desdeCache, recargar } = useDatos(() => convenios.obtener(id), `ficha-${id}`);
//
// "clave" tiene que cambiar cuando cambian los parámetros de la consulta (filtros, id, página).

import { useCallback, useEffect, useRef, useState } from "react";

function separar(respuesta) {
  if (respuesta && typeof respuesta === "object" && "datos" in respuesta && "desdeCache" in respuesta) {
    return { datos: respuesta.datos, desdeCache: respuesta.desdeCache };
  }
  return { datos: respuesta, desdeCache: false };
}

export function useDatos(cargar, clave = "") {
  const [recargas, setRecargas] = useState(0);
  const pedido = `${clave}#${recargas}`;
  const [estado, setEstado] = useState({ pedido: null, datos: null, error: null, desdeCache: false });

  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });

  useEffect(() => {
    let activo = true;
    cargarRef.current().then(
      (respuesta) => {
        if (activo) setEstado({ pedido, ...separar(respuesta), error: null });
      },
      (error) => {
        if (activo) setEstado((anterior) => ({ ...anterior, pedido, error }));
      },
    );
    return () => {
      activo = false;
    };
  }, [pedido]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  // Para actualizar la pantalla después de guardar algo, sin volver a pedir todo.
  const reemplazarDatos = useCallback((cambiar) => {
    setEstado((anterior) => ({ ...anterior, datos: typeof cambiar === "function" ? cambiar(anterior.datos) : cambiar }));
  }, []);

  const cargando = estado.pedido !== pedido;
  return {
    datos: estado.datos,
    cargando,
    error: cargando ? null : estado.error,
    desdeCache: estado.desdeCache,
    recargar,
    reemplazarDatos,
  };
}
