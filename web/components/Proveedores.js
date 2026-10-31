"use client";

// Estado global de la web: sesión, conexión/pendientes y mensajes emergentes.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { auth } from "@/lib/api/servicios";
import { USAR_SIMULADO } from "@/lib/api/config";
import { guardarSesion, borrarSesion, obtenerUsuarioTexto, suscribirSesion, actualizarUsuarioGuardado } from "@/lib/auth/sesion";
import { contarPendientes, EVENTO_PENDIENTES, borrarTodoLoLocal, leerDueno, guardarDueno } from "@/lib/db/offline";
import { sincronizarPendientes } from "@/lib/db/sincronizacion";

// ---------- Mensajes emergentes ----------

const ContextoAvisos = createContext(null);

function ProveedorAvisos({ children }) {
  const [mensajes, setMensajes] = useState([]);

  const avisar = useCallback((texto, tipo = "exito") => {
    const id = `${Date.now()}-${Math.random()}`;
    setMensajes((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => setMensajes((lista) => lista.filter((m) => m.id !== id)), 6000);
  }, []);

  const colores = {
    exito: "border-green-700 bg-green-50 text-green-900",
    error: "border-red-700 bg-red-50 text-red-900",
    info: "border-blue-700 bg-blue-50 text-blue-900",
  };

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {mensajes.map((m) => (
          <div key={m.id} role={m.tipo === "error" ? "alert" : "status"} className={`pointer-events-auto rounded-lg border-l-4 px-4 py-3 text-sm shadow-md ${colores[m.tipo] || colores.info}`}>
            {m.texto}
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export function useAvisos() {
  return useContext(ContextoAvisos);
}

// ---------- Sesión ----------

const ContextoSesion = createContext(null);

function ProveedorSesion({ children }) {
  // undefined = todavía no sabemos (primer render en el servidor / hidratación)
  const texto = useSyncExternalStore(suscribirSesion, obtenerUsuarioTexto, () => undefined);
  const usuario = useMemo(() => (texto ? JSON.parse(texto) : null), [texto]);
  const listo = texto !== undefined;

  // Al abrir la web con sesión iniciada, refrescamos los datos del usuario (rol, unidad).
  useEffect(() => {
    if (!usuario) return;
    auth.usuarioActual().then(
      (u) => u && actualizarUsuarioGuardado(u),
      () => {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const iniciarSesion = useCallback(async (email, password) => {
    const { token, usuario: u } = await auth.iniciarSesion(email, password);
    if (!token) throw new Error("El servidor no devolvió un token. Revisá CONTRATO-API.md.");
    const dueno = leerDueno();
    if (dueno && dueno !== String(u?.id)) await borrarTodoLoLocal().catch(() => {});
    guardarDueno(u?.id);
    guardarSesion(token, u);
    return u;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await auth.cerrarSesion();
    // La copia local (fichas, listados y pendientes) no queda para el próximo que use la compu.
    await borrarTodoLoLocal().catch(() => {});
    guardarDueno(null);
    borrarSesion();
  }, []);

  const valor = useMemo(() => ({ usuario, listo, iniciarSesion, cerrarSesion }), [usuario, listo, iniciarSesion, cerrarSesion]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  return useContext(ContextoSesion);
}

// ---------- Conexión y pendientes ----------

const ContextoConexion = createContext(null);

function suscribirConexion(alCambiar) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

function ProveedorConexion({ children }) {
  const enLinea = useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const avisar = useAvisos();

  useEffect(() => {
    let activo = true;
    const actualizar = async () => {
      const cantidad = await contarPendientes();
      if (activo) setPendientes(cantidad);
    };
    actualizar();
    window.addEventListener(EVENTO_PENDIENTES, actualizar);
    return () => {
      activo = false;
      window.removeEventListener(EVENTO_PENDIENTES, actualizar);
    };
  }, []);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarPendientes();
      if (r.enviados) avisar(`Se enviaron ${r.enviados} cambio(s) guardados sin conexión.`);
      if (r.conflictos) avisar(`${r.conflictos} cambio(s) chocan con otra versión. Revisalos en Pendientes.`, "error");
      if (r.errores) avisar(`${r.errores} cambio(s) no se pudieron guardar. Revisalos en Pendientes.`, "error");
      return r;
    } finally {
      setSincronizando(false);
    }
  }, [avisar]);

  // Al volver la conexión, se envía la cola automáticamente.
  useEffect(() => {
    if (!enLinea) return;
    let cancelado = false;
    contarPendientes().then((cantidad) => {
      if (!cancelado && cantidad > 0) sincronizar();
    });
    return () => {
      cancelado = true;
    };
  }, [enLinea, sincronizar]);

  const valor = useMemo(() => ({ enLinea, pendientes, sincronizando, sincronizar, simulado: USAR_SIMULADO }), [enLinea, pendientes, sincronizando, sincronizar]);
  return <ContextoConexion.Provider value={valor}>{children}</ContextoConexion.Provider>;
}

export function useConexion() {
  return useContext(ContextoConexion);
}

// ---------- Todo junto ----------

export default function Proveedores({ children }) {
  return (
    <ProveedorAvisos>
      <ProveedorSesion>
        <ProveedorConexion>{children}</ProveedorConexion>
      </ProveedorSesion>
    </ProveedorAvisos>
  );
}
