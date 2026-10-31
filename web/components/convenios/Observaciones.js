"use client";

// Observaciones de revisión: listado, alta (Revisión) y marcar como resuelta.

import { useState } from "react";
import { useAvisos, useConexion, useSesion } from "@/components/Proveedores";
import { Boton } from "@/components/ui/basicos";
import { AreaTexto } from "@/components/ui/formulario";
import { observaciones as apiObservaciones } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { formatearFechaHora } from "@/lib/dominio";
import { puedeObservar, puedeResolverObservacion } from "@/lib/permisos";

export default function Observaciones({ convenio, alCambiar }) {
  const { usuario } = useSesion();
  const { enLinea } = useConexion();
  const avisar = useAvisos();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState(null);

  async function agregar(evento) {
    evento.preventDefault();
    if (texto.trim().length < 5) {
      setError("Escribí la observación (al menos 5 caracteres).");
      return;
    }
    setEnviando(true);
    try {
      await apiObservaciones.crear(convenio.id, texto.trim());
      setTexto("");
      setError("");
      avisar("Observación agregada.");
      alCambiar();
    } catch (e) {
      setError(e instanceof ErrorValidacion ? Object.values(e.campos).join(" ") : mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function alternar(o) {
    setCambiando(o.id);
    try {
      await apiObservaciones.marcarResuelta(o.id, !o.esta_resuelta);
      alCambiar();
    } catch (e) {
      avisar(mensajeDeError(e), "error");
    } finally {
      setCambiando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {convenio.observaciones.length === 0 ? (
        <p className="text-sm text-gray-600">No hay observaciones.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {convenio.observaciones.map((o) => (
            <li key={o.id} className={`flex flex-col gap-2 rounded-xl border p-4 text-sm ${o.esta_resuelta ? "border-gray-200 bg-white" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`font-semibold ${o.esta_resuelta ? "text-green-800" : "text-amber-900"}`}>{o.esta_resuelta ? "Resuelta" : "Pendiente"}</span>
                <span className="text-xs text-gray-600">
                  {o.revisor_nombre ? `${o.revisor_nombre} · ` : ""}
                  {formatearFechaHora(o.creado_en)}
                </span>
              </div>
              <p>{o.observacion}</p>
              {o.respuesta && (
                <p className="text-gray-700">
                  <strong>Respuesta de gestión:</strong> {o.respuesta}
                </p>
              )}
              {puedeResolverObservacion(usuario) && (
                <Boton variante="texto" className="self-start px-0" onClick={() => alternar(o)} cargando={cambiando === o.id} disabled={!enLinea}>
                  {o.esta_resuelta ? "Volver a pendiente" : "Marcar como resuelta"}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeObservar(usuario, convenio) && (
        <form onSubmit={agregar} noValidate className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <AreaTexto etiqueta="Nueva observación" placeholder="Qué hay que corregir y en qué campo o documento" value={texto} onChange={(e) => setTexto(e.target.value)} error={error} />
          <Boton type="submit" variante="secundario" cargando={enviando} disabled={!enLinea} className="self-start">
            Agregar observación
          </Boton>
        </form>
      )}
    </div>
  );
}
