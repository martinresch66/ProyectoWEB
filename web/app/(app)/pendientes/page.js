"use client";

// Cambios hechos sin conexión que esperan enviarse, y los que chocaron con otra versión (409).

import { useEffect, useState } from "react";
import { useAvisos, useConexion } from "@/components/Proveedores";
import { Boton, EncabezadoPagina, Nota, Tarjeta, Vacio } from "@/components/ui/basicos";
import ResolverConflicto from "@/components/convenios/ResolverConflicto";
import { convenios } from "@/lib/api/servicios";
import { ErrorConflicto, mensajeDeError } from "@/lib/api/errores";
import { adaptarConvenio } from "@/lib/api/adaptadores";
import { actualizarPendiente, EVENTO_PENDIENTES, listarPendientes, quitarPendiente } from "@/lib/db/offline";
import { formatearFechaHora } from "@/lib/dominio";

const ESTADO_TEXTO = {
  pendiente: { texto: "Esperando conexión", clase: "bg-gray-100 text-gray-700" },
  conflicto: { texto: "Conflicto de versión", clase: "bg-amber-100 text-amber-900" },
  error: { texto: "No se pudo guardar", clase: "bg-red-100 text-red-800" },
};

export default function PaginaPendientes() {
  const { enLinea, sincronizar, sincronizando } = useConexion();
  const avisar = useAvisos();
  const [lista, setLista] = useState(null);

  useEffect(() => {
    let activo = true;
    const leer = async () => {
      const datos = await listarPendientes();
      if (activo) setLista(datos);
    };
    leer();
    window.addEventListener(EVENTO_PENDIENTES, leer);
    return () => {
      activo = false;
      window.removeEventListener(EVENTO_PENDIENTES, leer);
    };
  }, []);

  async function resolver(p, finales, version) {
    try {
      await convenios.actualizarEnServidor(p.convenio_id, finales, version);
      await quitarPendiente(p.id);
      avisar("Conflicto resuelto y cambios guardados.");
    } catch (e) {
      if (e instanceof ErrorConflicto) {
        await actualizarPendiente(p.id, { servidor: e.actual ? adaptarConvenio(e.actual) : p.servidor, datos: finales });
        avisar("Volvió a cambiar en el servidor. Revisá de nuevo.", "error");
      } else {
        avisar(mensajeDeError(e), "error");
      }
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Pendientes"
        descripcion="Cambios guardados en este equipo mientras no había conexión."
        acciones={
          <Boton onClick={sincronizar} cargando={sincronizando} disabled={!enLinea || !lista?.some((p) => p.estado === "pendiente")}>
            Sincronizar ahora
          </Boton>
        }
      />
      {!enLinea && <Nota tipo="alerta">Sin conexión. Los cambios se van a enviar solos cuando vuelva.</Nota>}
      {lista && lista.length === 0 && <Vacio titulo="No hay cambios pendientes" descripcion="Todo lo que guardaste ya está en el servidor." />}
      {lista?.map((p) => (
        <Tarjeta key={p.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1 text-sm">
              <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_TEXTO[p.estado]?.clase}`}>{ESTADO_TEXTO[p.estado]?.texto}</span>
              <p className="font-semibold">{p.descripcion}</p>
              <p className="text-gray-600">
                {p.tipo === "crear" ? "Alta de borrador" : `Edición sobre la versión ${p.version}`} · guardado {formatearFechaHora(new Date(p.creado_en).toISOString())}
              </p>
              {p.estado === "error" && <p className="text-red-700">{p.error}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {p.estado === "error" && (
                <Boton variante="secundario" onClick={() => actualizarPendiente(p.id, { estado: "pendiente", error: null })}>
                  Reintentar
                </Boton>
              )}
              <Boton variante="texto" onClick={() => quitarPendiente(p.id)}>
                Descartar
              </Boton>
            </div>
          </div>
          {p.estado === "conflicto" && p.servidor && (
            <div className="mt-4">
              <ResolverConflicto mios={p.datos} servidor={p.servidor} alDescartar={() => quitarPendiente(p.id)} alResolver={(finales, version) => resolver(p, finales, version)} />
            </div>
          )}
        </Tarjeta>
      ))}
    </>
  );
}
