"use client";

// Vínculos entre instrumentos: antecedentes (este convenio deriva de otro) y derivados.

import Link from "next/link";
import { useState } from "react";
import { useAvisos, useConexion, useSesion } from "@/components/Proveedores";
import { Boton, InsigniaEstado } from "@/components/ui/basicos";
import { Selector, opcionesDe } from "@/components/ui/formulario";
import { useDatos } from "@/hooks/useDatos";
import { convenios as apiConvenios, vinculos as apiVinculos } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { TIPOS, TIPOS_VINCULO } from "@/lib/dominio";
import { puedeEditarConvenio } from "@/lib/permisos";

function Lista({ titulo, items, vacio, alQuitar, puedeQuitar }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">{vacio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {items.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-600">{TIPOS_VINCULO[v.tipo_vinculo] || v.tipo_vinculo}</span>
                <Link href={`/convenios/${v.convenio.id}`} className="font-semibold text-blue-700 hover:underline">
                  {v.convenio.codigo || `Convenio ${v.convenio.id}`}
                </Link>
                {v.convenio.titulo && <span>{v.convenio.titulo}</span>}
              </span>
              <span className="flex items-center gap-3">
                {v.convenio.estado && <InsigniaEstado estado={v.convenio.estado} />}
                {puedeQuitar && (
                  <Boton variante="texto" onClick={() => alQuitar(v)}>
                    Quitar<span className="sr-only"> vínculo con {v.convenio.codigo}</span>
                  </Boton>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Vinculos({ convenio, alCambiar }) {
  const { usuario } = useSesion();
  const { enLinea } = useConexion();
  const avisar = useAvisos();
  const editable = puedeEditarConvenio(usuario, convenio);
  const [nuevo, setNuevo] = useState({ convenio_destino_id: "", tipo_vinculo: "" });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const candidatos = useDatos(() => (editable ? apiConvenios.listar({}, 1, 100) : Promise.resolve(null)), `candidatos-${convenio.id}-${editable}`);

  const antecedentes = convenio.vinculos.filter((v) => v.direccion === "antecedente");
  const derivados = convenio.vinculos.filter((v) => v.direccion === "derivado");

  async function agregar(evento) {
    evento.preventDefault();
    const e = {};
    if (!nuevo.convenio_destino_id) e.convenio_destino_id = "Elegí el convenio antecedente.";
    if (!nuevo.tipo_vinculo) e.tipo_vinculo = "Elegí el tipo de vínculo.";
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      await apiVinculos.crear(convenio.id, { convenio_destino_id: Number(nuevo.convenio_destino_id), tipo_vinculo: nuevo.tipo_vinculo });
      setNuevo({ convenio_destino_id: "", tipo_vinculo: "" });
      avisar("Vínculo agregado.");
      alCambiar();
    } catch (error) {
      setErrores(error instanceof ErrorValidacion ? error.campos : { general: mensajeDeError(error) });
    } finally {
      setEnviando(false);
    }
  }

  async function quitar(v) {
    try {
      await apiVinculos.quitar(convenio.id, v.id);
      avisar("Vínculo quitado.");
      alCambiar();
    } catch (error) {
      avisar(mensajeDeError(error), "error");
    }
  }

  const opciones = (candidatos.datos?.items || [])
    .filter((c) => c.id !== convenio.id)
    .map((c) => ({ valor: String(c.id), texto: `${c.codigo} · ${TIPOS[c.tipo]} · ${c.titulo}` }));

  return (
    <div className="flex flex-col gap-5">
      <Lista titulo="Antecedentes (este convenio deriva de…)" items={antecedentes} vacio="Sin antecedentes." alQuitar={quitar} puedeQuitar={editable && enLinea} />
      <Lista titulo="Derivados (instrumentos que cuelgan de este)" items={derivados} vacio="No hay específicos, adendas ni renovaciones vinculados." />
      <p className="text-xs text-gray-600">Vincular un instrumento nunca modifica el convenio anterior.</p>

      {editable && (
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold">Agregar antecedente</h3>
          {errores.general && <p className="text-sm text-red-700">{errores.general}</p>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Selector etiqueta="Convenio antecedente" vacio="Elegí un convenio" opciones={opciones} value={nuevo.convenio_destino_id} onChange={(e) => setNuevo({ ...nuevo, convenio_destino_id: e.target.value })} error={errores.convenio_destino_id} />
            <Selector etiqueta="Tipo de vínculo" vacio="Elegí el tipo" opciones={opcionesDe(TIPOS_VINCULO)} value={nuevo.tipo_vinculo} onChange={(e) => setNuevo({ ...nuevo, tipo_vinculo: e.target.value })} error={errores.tipo_vinculo} />
          </div>
          <Boton type="submit" variante="secundario" cargando={enviando} disabled={!enLinea} className="self-start">
            Agregar vínculo
          </Boton>
        </form>
      )}
    </div>
  );
}
