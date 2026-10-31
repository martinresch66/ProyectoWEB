"use client";

import Link from "next/link";
import { useState } from "react";
import { useAvisos } from "@/components/Proveedores";
import { Boton, Cargando, EncabezadoPagina, ErrorCarga, Vacio } from "@/components/ui/basicos";
import { useDatos } from "@/hooks/useDatos";
import { alertas } from "@/lib/api/servicios";
import { mensajeDeError } from "@/lib/api/errores";
import { formatearFechaHora } from "@/lib/dominio";

export default function PaginaAvisos() {
  const avisar = useAvisos();
  const { datos, cargando, error, recargar, reemplazarDatos } = useDatos(() => alertas.listar(), "avisos");
  const [marcando, setMarcando] = useState(false);

  const noLeidas = (datos || []).filter((a) => !a.leida);

  async function marcar(ids) {
    setMarcando(true);
    try {
      for (const id of ids) await alertas.marcarLeida(id);
      reemplazarDatos((lista) => lista.map((a) => (ids.includes(a.id) ? { ...a, leida: true } : a)));
    } catch (e) {
      avisar(mensajeDeError(e), "error");
    } finally {
      setMarcando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Avisos"
        descripcion="Revisiones asignadas, cambios de estado, vencimientos y preavisos."
        acciones={
          noLeidas.length > 0 && (
            <Boton variante="secundario" onClick={() => marcar(noLeidas.map((a) => a.id))} cargando={marcando}>
              Marcar todos como leídos
            </Boton>
          )
        }
      />
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && datos.length === 0 && <Vacio titulo="No tenés avisos" descripcion="Acá van a aparecer las revisiones asignadas, los cambios de estado y los vencimientos." />}
      {datos && datos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {datos.map((a) => (
            <li key={a.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${a.leida ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex min-w-0 flex-col gap-1 text-sm">
                <p className="font-semibold">
                  {!a.leida && <span className="sr-only">No leído: </span>}
                  {a.titulo}
                </p>
                <p className="text-gray-700">{a.mensaje}</p>
                <p className="text-xs text-gray-600">{formatearFechaHora(a.creado_en)}</p>
              </div>
              <div className="flex items-center gap-3">
                {a.convenio_id && (
                  <Link href={`/convenios/${a.convenio_id}`} className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => !a.leida && alertas.marcarLeida(a.id).catch(() => {})}>
                    Ver convenio
                  </Link>
                )}
                {!a.leida && (
                  <Boton variante="texto" onClick={() => marcar([a.id])} disabled={marcando}>
                    Marcar leído
                  </Boton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
