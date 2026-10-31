"use client";

// Botones para cambiar el estado del convenio (según rol y estado actual) y su diálogo de confirmación.
// Toda transición pide un fundamento ("motivo"), que queda en transiciones_estado.

import { useState } from "react";
import { useAvisos, useConexion, useSesion } from "@/components/Proveedores";
import { Boton, Nota } from "@/components/ui/basicos";
import { AreaTexto } from "@/components/ui/formulario";
import Dialogo from "@/components/ui/Dialogo";
import { convenios, observaciones } from "@/lib/api/servicios";
import { ErrorConflicto, ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { ESTADOS, MINIMO_PARTES_PARA_APROBAR } from "@/lib/dominio";
import { transicionesDisponibles } from "@/lib/permisos";

export default function AccionesEstado({ convenio, alCambiar }) {
  const { usuario } = useSesion();
  const { enLinea } = useConexion();
  const avisar = useAvisos();
  const [elegida, setElegida] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [textoObservacion, setTextoObservacion] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const disponibles = transicionesDisponibles(usuario, convenio);
  if (!disponibles.length) return null;

  const pendientes = convenio.observaciones.filter((o) => !o.esta_resuelta).length;
  const faltanPartes = convenio.partes.length < MINIMO_PARTES_PARA_APROBAR;

  function abrir(transicion) {
    setElegida(transicion);
    setMotivo("");
    setTextoObservacion("");
    setErrores({});
  }

  function cerrar() {
    setElegida(null);
  }

  const bloqueada =
    elegida?.hacia === "aprobado" && (faltanPartes || pendientes > 0);

  async function confirmar() {
    const nuevos = {};
    if (motivo.trim().length < 5) nuevos.motivo = "Escribí el fundamento (al menos 5 caracteres).";
    if (elegida.pideObservacion && textoObservacion.trim().length < 5) nuevos.observacion = "Escribí qué hay que corregir.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setEnviando(true);
    try {
      if (elegida.pideObservacion) await observaciones.crear(convenio.id, textoObservacion.trim());
      const actualizado = await convenios.cambiarEstado(convenio.id, { estado_nuevo: elegida.hacia, motivo: motivo.trim(), version: convenio.version });
      avisar(`${convenio.codigo} pasó a ${ESTADOS[elegida.hacia]}.`);
      setElegida(null);
      alCambiar(actualizado);
    } catch (e) {
      if (e instanceof ErrorValidacion) {
        setErrores({ general: Object.values(e.campos).join(" ") || e.message, ...(e.campos.motivo ? { motivo: e.campos.motivo } : {}) });
      } else if (e instanceof ErrorConflicto) {
        setErrores({ general: "El convenio cambió mientras lo mirabas. Cerrá este cuadro: la ficha se va a recargar." });
        alCambiar(null);
      } else {
        setErrores({ general: mensajeDeError(e) });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {disponibles.map((t) => (
          <Boton
            key={t.hacia}
            variante={t.hacia === "rescindido" ? "peligro" : t.hacia === "aprobado" || t.hacia === "revision" || t.hacia === "firmado" ? "primario" : "secundario"}
            onClick={() => abrir(t)}
            disabled={!enLinea}
            title={!enLinea ? "Necesita conexión" : undefined}
          >
            {t.accion}
          </Boton>
        ))}
      </div>

      <Dialogo
        abierto={!!elegida}
        alCerrar={cerrar}
        titulo={elegida ? `${elegida.accion}: ${convenio.codigo}` : ""}
        acciones={
          elegida && (
            <>
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton variante={elegida.hacia === "rescindido" ? "peligro" : "primario"} onClick={confirmar} cargando={enviando} disabled={bloqueada}>
                {elegida.accion}
              </Boton>
            </>
          )
        }
      >
        {elegida && (
          <>
            <p className="text-sm text-gray-700">
              El convenio pasa de <strong>{ESTADOS[convenio.estado]}</strong> a <strong>{ESTADOS[elegida.hacia]}</strong>. Queda registrado quién lo hizo, cuándo y por qué.
            </p>
            {elegida.hacia === "aprobado" && faltanPartes && (
              <Nota tipo="error">
                Hacen falta al menos {MINIMO_PARTES_PARA_APROBAR} partes para aprobar (hay {convenio.partes.length}).
              </Nota>
            )}
            {elegida.hacia === "aprobado" && pendientes > 0 && <Nota tipo="error">Hay {pendientes} observación(es) sin resolver.</Nota>}
            {elegida.hacia === "aprobado" && (
              <p className="text-xs text-gray-600">La aprobación es administrativa: no equivale a firma digital ni certifica la legalidad.</p>
            )}
            {errores.general && <Nota tipo="error">{errores.general}</Nota>}
            {elegida.pideObservacion && (
              <AreaTexto etiqueta="Observación para el equipo de gestión" value={textoObservacion} onChange={(e) => setTextoObservacion(e.target.value)} error={errores.observacion} obligatorio />
            )}
            <AreaTexto etiqueta="Fundamento" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={errores.motivo} ayuda="Por qué se hace este cambio de estado." obligatorio />
          </>
        )}
      </Dialogo>
    </>
  );
}
