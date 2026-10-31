"use client";

// Formulario de alta y edición de convenios (borradores).
// Envía al backend un JSON con la forma descripta en CONTRATO-API.md (sección POST /agreements).

import Link from "next/link";
import { useRef, useState } from "react";
import { useSesion } from "@/components/Proveedores";
import { Boton, Nota } from "@/components/ui/basicos";
import { AreaTexto, Campo, ResumenErrores, Selector, opcionesDe } from "@/components/ui/formulario";
import { useDatos } from "@/hooks/useDatos";
import { convenios as apiConvenios, partes as apiPartes, personas as apiPersonas, unidades as apiUnidades } from "@/lib/api/servicios";
import { ErrorValidacion } from "@/lib/api/errores";
import {
  CAMPOS_FICHA_EXTRA,
  MAX_HORAS_PASANTIA,
  TIPOS,
  TIPOS_VINCULO,
  formatearFecha,
  nombrePersona,
  restarDias,
} from "@/lib/dominio";
import { esGlobal } from "@/lib/permisos";

const ETIQUETAS = {
  codigo: "Código",
  titulo: "Título",
  tipo: "Tipo",
  unidad_id: "Unidad responsable",
  resumen: "Resumen",
  fecha_inicio: "Fecha de inicio",
  fecha_fin: "Fecha de vencimiento",
  dias_preaviso: "Días de preaviso",
  partes: "Partes",
  personas: "Personas",
  "detalle_pasantia.estudiante_persona_id": "Estudiante",
  "detalle_pasantia.carrera": "Carrera",
  "detalle_pasantia.horas_semanales": "Horas semanales",
  "detalle_pasantia.monto_estimulo": "Asignación estímulo",
  convenio_destino_id: "Antecedente",
  tipo_vinculo: "Tipo de vínculo",
  ...CAMPOS_FICHA_EXTRA,
};

const PASANTIA_VACIA = {
  estudiante_persona_id: "",
  tutor_academico_persona_id: "",
  tutor_institucion_persona_id: "",
  carrera: "",
  horas_semanales: "",
  monto_estimulo: "",
  aseguradora: "",
  numero_poliza: "",
};

function estadoInicial(convenio, usuario) {
  const extras = Object.fromEntries(Object.keys(CAMPOS_FICHA_EXTRA).map((k) => [k, convenio?.extras?.[k] ?? ""]));
  const d = convenio?.detalle_pasantia;
  return {
    codigo: convenio?.codigo ?? "",
    titulo: convenio?.titulo ?? "",
    tipo: convenio?.tipo ?? "marco",
    unidad_id: String(convenio?.unidad_id ?? usuario?.unidad_id ?? ""),
    resumen: convenio?.resumen ?? "",
    fecha_inicio: convenio?.fecha_inicio ?? "",
    fecha_fin: convenio?.fecha_fin ?? "",
    dias_preaviso: String(convenio?.dias_preaviso ?? 30),
    partes: (convenio?.partes ?? []).map((p) => ({ parte_id: p.id, nombre: p.nombre, rol_en_convenio: p.rol_en_convenio ?? "" })),
    personas: (convenio?.personas ?? []).map((p) => ({ persona_id: p.id, nombre: nombrePersona(p), rol: p.rol ?? "" })),
    detalle_pasantia: d
      ? {
          estudiante_persona_id: String(d.estudiante_persona_id ?? ""),
          tutor_academico_persona_id: String(d.tutor_academico_persona_id ?? ""),
          tutor_institucion_persona_id: String(d.tutor_institucion_persona_id ?? ""),
          carrera: d.carrera ?? "",
          horas_semanales: String(d.horas_semanales ?? ""),
          monto_estimulo: d.monto_estimulo ?? "",
          aseguradora: d.aseguradora ?? "",
          numero_poliza: d.numero_poliza ?? "",
        }
      : PASANTIA_VACIA,
    antecedente: { convenio_destino_id: "", tipo_vinculo: "" },
    extras,
  };
}

// Lo que se envía al backend.
export function aDatosApi(f) {
  const nulo = (v) => (v === "" || v === undefined ? null : v);
  const numero = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const datos = {
    codigo: f.codigo.trim(),
    titulo: f.titulo.trim(),
    tipo: f.tipo,
    unidad_id: numero(f.unidad_id),
    resumen: nulo(f.resumen.trim()),
    fecha_inicio: nulo(f.fecha_inicio),
    fecha_fin: nulo(f.fecha_fin),
    dias_preaviso: numero(f.dias_preaviso) ?? 30,
    partes: f.partes.map((p) => ({ parte_id: Number(p.parte_id), rol_en_convenio: nulo(p.rol_en_convenio.trim()) })),
    personas: f.personas.map((p) => ({ persona_id: Number(p.persona_id), rol: p.rol.trim() || "Interviniente" })),
    detalle_pasantia:
      f.tipo === "pasantia"
        ? {
            estudiante_persona_id: numero(f.detalle_pasantia.estudiante_persona_id),
            tutor_academico_persona_id: numero(f.detalle_pasantia.tutor_academico_persona_id),
            tutor_institucion_persona_id: numero(f.detalle_pasantia.tutor_institucion_persona_id),
            carrera: f.detalle_pasantia.carrera.trim(),
            horas_semanales: numero(f.detalle_pasantia.horas_semanales),
            monto_estimulo: numero(f.detalle_pasantia.monto_estimulo),
            aseguradora: nulo(f.detalle_pasantia.aseguradora.trim()),
            numero_poliza: nulo(f.detalle_pasantia.numero_poliza.trim()),
          }
        : null,
  };
  for (const [clave, valor] of Object.entries(f.extras)) datos[clave] = nulo(String(valor).trim());
  return datos;
}

function validar(f, esNuevo) {
  const e = {};
  if (!f.codigo.trim()) e.codigo = "El código es obligatorio.";
  if (f.titulo.trim().length < 5) e.titulo = "El título debe tener al menos 5 caracteres.";
  if (!f.tipo) e.tipo = "Elegí un tipo.";
  if (!f.unidad_id) e.unidad_id = "Elegí la unidad responsable.";
  if (f.fecha_inicio && f.fecha_fin && f.fecha_fin < f.fecha_inicio) e.fecha_fin = "Tiene que ser posterior a la fecha de inicio.";
  const preaviso = Number(f.dias_preaviso);
  if (f.dias_preaviso === "" || !Number.isInteger(preaviso) || preaviso < 0 || preaviso > 365) e.dias_preaviso = "Ingresá un número entre 0 y 365.";
  if (f.tipo === "pasantia") {
    const d = f.detalle_pasantia;
    if (!d.estudiante_persona_id) e["detalle_pasantia.estudiante_persona_id"] = "Elegí al estudiante.";
    if (d.carrera.trim().length < 3) e["detalle_pasantia.carrera"] = "Indicá la carrera.";
    const horas = Number(d.horas_semanales);
    if (!Number.isInteger(horas) || horas < 1 || horas > MAX_HORAS_PASANTIA) {
      e["detalle_pasantia.horas_semanales"] = `Entre 1 y ${MAX_HORAS_PASANTIA} horas (Ley 26.427).`;
    }
    if (d.monto_estimulo !== "" && Number(d.monto_estimulo) < 0) e["detalle_pasantia.monto_estimulo"] = "No puede ser negativo.";
  }
  if (esNuevo && f.antecedente.convenio_destino_id && !f.antecedente.tipo_vinculo) e.tipo_vinculo = "Elegí el tipo de vínculo.";
  return e;
}

const idCampo = (clave) => `campo-${clave.replace(/\./g, "-")}`;

export default function FormularioConvenio({ convenio = null, alGuardar, alCancelar, textoGuardar = "Guardar borrador" }) {
  const { usuario } = useSesion();
  const esNuevo = !convenio;
  const [f, setF] = useState(() => estadoInicial(convenio, usuario));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nuevaParte, setNuevaParte] = useState({ parte_id: "", rol_en_convenio: "" });
  const [nuevaPersona, setNuevaPersona] = useState({ persona_id: "", rol: "" });
  const resumenRef = useRef(null);

  const listaUnidades = useDatos(() => apiUnidades.listar(), "unidades");
  const listaPartes = useDatos(() => apiPartes.listar(), "partes");
  const listaPersonas = useDatos(() => apiPersonas.listar(), "personas");
  const listaConvenios = useDatos(() => (esNuevo ? apiConvenios.listar({}, 1, 100) : Promise.resolve(null)), `antecedentes-${esNuevo}`);

  const unidadFija = !esGlobal(usuario) && usuario?.rol !== "admin";
  const catalogoPartes = listaPartes.datos || [];
  const catalogoPersonas = listaPersonas.datos || [];
  const opcionesPersona = catalogoPersonas.map((p) => ({ valor: String(p.id), texto: `${nombrePersona(p)}${p.dni ? ` · DNI ${p.dni}` : ""}` }));

  const poner = (campo, valor) => setF((anterior) => ({ ...anterior, [campo]: valor }));
  const ponerPasantia = (campo, valor) => setF((a) => ({ ...a, detalle_pasantia: { ...a.detalle_pasantia, [campo]: valor } }));
  const ponerExtra = (campo, valor) => setF((a) => ({ ...a, extras: { ...a.extras, [campo]: valor } }));
  const err = (clave) => errores[clave];

  function agregarParte() {
    const parte = catalogoPartes.find((p) => String(p.id) === nuevaParte.parte_id);
    if (!parte) return;
    poner("partes", [...f.partes, { parte_id: parte.id, nombre: parte.nombre, rol_en_convenio: nuevaParte.rol_en_convenio }]);
    setNuevaParte({ parte_id: "", rol_en_convenio: "" });
  }

  function agregarPersona() {
    const persona = catalogoPersonas.find((p) => String(p.id) === nuevaPersona.persona_id);
    if (!persona) return;
    poner("personas", [...f.personas, { persona_id: persona.id, nombre: nombrePersona(persona), rol: nuevaPersona.rol }]);
    setNuevaPersona({ persona_id: "", rol: "" });
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErrorGeneral("");
    const encontrados = validar(f, esNuevo);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) {
      resumenRef.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const antecedente = esNuevo && f.antecedente.convenio_destino_id ? { convenio_destino_id: Number(f.antecedente.convenio_destino_id), tipo_vinculo: f.antecedente.tipo_vinculo } : null;
      await alGuardar(aDatosApi(f), antecedente);
    } catch (error) {
      if (error instanceof ErrorValidacion) {
        setErrores(error.campos);
        setErrorGeneral(Object.keys(error.campos).length ? "" : error.message);
        resumenRef.current?.focus();
      } else {
        setErrorGeneral(error.message || "No se pudo guardar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const fechaAlerta = f.fecha_fin ? restarDias(f.fecha_fin, f.dias_preaviso) : null;
  const partesDisponibles = catalogoPartes.filter((p) => !f.partes.some((x) => x.parte_id === p.id));
  const personasDisponibles = opcionesPersona.filter((o) => !f.personas.some((x) => String(x.persona_id) === o.valor));

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <div ref={resumenRef} tabIndex={-1} className="outline-none">
        <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />
        {errorGeneral && <Nota tipo="error">{errorGeneral}</Nota>}
      </div>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-1 text-base font-semibold">Datos generales</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo id={idCampo("codigo")} etiqueta="Código" value={f.codigo} onChange={(e) => poner("codigo", e.target.value)} error={err("codigo")} ayuda="Único. Ej.: CONV-2026-006" obligatorio />
          <Selector id={idCampo("tipo")} etiqueta="Tipo" opciones={opcionesDe(TIPOS)} value={f.tipo} onChange={(e) => poner("tipo", e.target.value)} error={err("tipo")} obligatorio disabled={!esNuevo && convenio?.estado !== "borrador"} />
          <Selector
            id={idCampo("unidad_id")}
            etiqueta="Unidad responsable"
            vacio="Elegí una unidad"
            opciones={(listaUnidades.datos || []).map((u) => ({ valor: String(u.id), texto: u.nombre }))}
            value={f.unidad_id}
            onChange={(e) => poner("unidad_id", e.target.value)}
            error={err("unidad_id")}
            ayuda={unidadFija ? "Solo podés cargar convenios de tu unidad." : undefined}
            disabled={unidadFija}
            obligatorio
          />
        </div>
        <Campo id={idCampo("titulo")} etiqueta="Título" value={f.titulo} onChange={(e) => poner("titulo", e.target.value)} error={err("titulo")} obligatorio />
        <AreaTexto id={idCampo("resumen")} etiqueta="Resumen" value={f.resumen} onChange={(e) => poner("resumen", e.target.value)} error={err("resumen")} ayuda="Síntesis del objeto o propósito del convenio." />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-1 text-base font-semibold">Plazos</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo id={idCampo("fecha_inicio")} etiqueta="Fecha de inicio" type="date" value={f.fecha_inicio} onChange={(e) => poner("fecha_inicio", e.target.value)} error={err("fecha_inicio")} />
          <Campo
            id={idCampo("fecha_fin")}
            etiqueta="Fecha de vencimiento"
            type="date"
            value={f.fecha_fin}
            onChange={(e) => poner("fecha_fin", e.target.value)}
            error={err("fecha_fin")}
            ayuda='Si la dejás vacía se muestra "sin vencimiento registrado".'
          />
          <Campo id={idCampo("dias_preaviso")} etiqueta="Días de preaviso" type="number" min="0" max="365" value={f.dias_preaviso} onChange={(e) => poner("dias_preaviso", e.target.value)} error={err("dias_preaviso")} ayuda="Cuántos días antes del vencimiento se avisa." obligatorio />
        </div>
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700" aria-live="polite">
          {f.fecha_fin
            ? `Vence el ${formatearFecha(f.fecha_fin)}. Las alertas empiezan el ${formatearFecha(fechaAlerta)}.`
            : "Sin vencimiento registrado: no se generan alertas de plazo."}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-1 text-base font-semibold">Partes firmantes</legend>
        <p id={idCampo("partes")} className="text-sm text-gray-600">
          Para aprobar el convenio hacen falta al menos 2 partes. {err("partes") && <strong className="text-red-700">{err("partes")}</strong>}
        </p>
        {f.partes.length > 0 && (
          <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
            {f.partes.map((p, i) => (
              <li key={p.parte_id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="min-w-48 flex-1 text-sm font-medium">{p.nombre}</span>
                <label className="sr-only" htmlFor={`rol-parte-${p.parte_id}`}>
                  Rol de {p.nombre}
                </label>
                <input
                  id={`rol-parte-${p.parte_id}`}
                  className="min-h-11 w-56 rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="Rol en el convenio"
                  value={p.rol_en_convenio}
                  onChange={(e) => poner("partes", f.partes.map((x, j) => (j === i ? { ...x, rol_en_convenio: e.target.value } : x)))}
                />
                <Boton variante="texto" onClick={() => poner("partes", f.partes.filter((_, j) => j !== i))}>
                  Quitar<span className="sr-only"> {p.nombre}</span>
                </Boton>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Selector
            className="min-w-64 flex-1"
            etiqueta="Agregar parte"
            vacio={listaPartes.cargando ? "Cargando…" : "Elegí una parte"}
            opciones={partesDisponibles.map((p) => ({ valor: String(p.id), texto: p.nombre }))}
            value={nuevaParte.parte_id}
            onChange={(e) => setNuevaParte({ ...nuevaParte, parte_id: e.target.value })}
          />
          <Campo className="w-64" etiqueta="Rol en el convenio" placeholder="Ej.: Contraparte" value={nuevaParte.rol_en_convenio} onChange={(e) => setNuevaParte({ ...nuevaParte, rol_en_convenio: e.target.value })} />
          <Boton variante="secundario" onClick={agregarParte} disabled={!nuevaParte.parte_id}>
            Agregar
          </Boton>
        </div>
        <p className="text-xs text-gray-600">
          ¿No está la institución? Cargala en <Link href="/partes" className="text-blue-700 underline">Partes</Link> y volvé.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-1 text-base font-semibold">Personas vinculadas</legend>
        <p id={idCampo("personas")} className="text-sm text-gray-600">
          Representantes, coordinadores, tutores u otras personas del convenio. {err("personas") && <strong className="text-red-700">{err("personas")}</strong>}
        </p>
        {f.personas.length > 0 && (
          <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
            {f.personas.map((p, i) => (
              <li key={p.persona_id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="min-w-48 flex-1 text-sm font-medium">{p.nombre}</span>
                <label className="sr-only" htmlFor={`rol-persona-${p.persona_id}`}>
                  Rol de {p.nombre}
                </label>
                <input
                  id={`rol-persona-${p.persona_id}`}
                  className="min-h-11 w-56 rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="Rol"
                  value={p.rol}
                  onChange={(e) => poner("personas", f.personas.map((x, j) => (j === i ? { ...x, rol: e.target.value } : x)))}
                />
                <Boton variante="texto" onClick={() => poner("personas", f.personas.filter((_, j) => j !== i))}>
                  Quitar<span className="sr-only"> {p.nombre}</span>
                </Boton>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Selector
            className="min-w-64 flex-1"
            etiqueta="Agregar persona"
            vacio={listaPersonas.cargando ? "Cargando…" : "Elegí una persona"}
            opciones={personasDisponibles}
            value={nuevaPersona.persona_id}
            onChange={(e) => setNuevaPersona({ ...nuevaPersona, persona_id: e.target.value })}
          />
          <Campo className="w-64" etiqueta="Rol" placeholder="Ej.: Representante legal" value={nuevaPersona.rol} onChange={(e) => setNuevaPersona({ ...nuevaPersona, rol: e.target.value })} />
          <Boton variante="secundario" onClick={agregarPersona} disabled={!nuevaPersona.persona_id}>
            Agregar
          </Boton>
        </div>
      </fieldset>

      {f.tipo === "pasantia" && (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
          <legend className="px-1 text-base font-semibold">Datos de la pasantía</legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Selector
              id={idCampo("detalle_pasantia.estudiante_persona_id")}
              etiqueta="Estudiante"
              vacio="Elegí al estudiante"
              opciones={opcionesPersona}
              value={f.detalle_pasantia.estudiante_persona_id}
              onChange={(e) => ponerPasantia("estudiante_persona_id", e.target.value)}
              error={err("detalle_pasantia.estudiante_persona_id")}
              obligatorio
            />
            <Selector etiqueta="Tutor académico (UNLPam)" vacio="Sin asignar" opciones={opcionesPersona} value={f.detalle_pasantia.tutor_academico_persona_id} onChange={(e) => ponerPasantia("tutor_academico_persona_id", e.target.value)} />
            <Selector etiqueta="Tutor de la institución" vacio="Sin asignar" opciones={opcionesPersona} value={f.detalle_pasantia.tutor_institucion_persona_id} onChange={(e) => ponerPasantia("tutor_institucion_persona_id", e.target.value)} />
            <Campo id={idCampo("detalle_pasantia.carrera")} etiqueta="Carrera" value={f.detalle_pasantia.carrera} onChange={(e) => ponerPasantia("carrera", e.target.value)} error={err("detalle_pasantia.carrera")} obligatorio />
            <Campo
              id={idCampo("detalle_pasantia.horas_semanales")}
              etiqueta="Horas semanales"
              type="number"
              min="1"
              max={MAX_HORAS_PASANTIA}
              value={f.detalle_pasantia.horas_semanales}
              onChange={(e) => ponerPasantia("horas_semanales", e.target.value)}
              error={err("detalle_pasantia.horas_semanales")}
              ayuda={`Hasta ${MAX_HORAS_PASANTIA} horas (Ley 26.427).`}
              obligatorio
            />
            <Campo id={idCampo("detalle_pasantia.monto_estimulo")} etiqueta="Asignación estímulo mensual ($)" type="number" min="0" step="0.01" value={f.detalle_pasantia.monto_estimulo} onChange={(e) => ponerPasantia("monto_estimulo", e.target.value)} error={err("detalle_pasantia.monto_estimulo")} />
            <Campo etiqueta="Aseguradora" value={f.detalle_pasantia.aseguradora} onChange={(e) => ponerPasantia("aseguradora", e.target.value)} />
            <Campo etiqueta="Número de póliza" value={f.detalle_pasantia.numero_poliza} onChange={(e) => ponerPasantia("numero_poliza", e.target.value)} />
          </div>
        </fieldset>
      )}

      {esNuevo && (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
          <legend className="px-1 text-base font-semibold">Antecedente (opcional)</legend>
          <p className="text-sm text-gray-600">Para específicos, adendas, renovaciones o sustituciones. El convenio anterior no se modifica.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Selector
              id={idCampo("convenio_destino_id")}
              etiqueta="Convenio antecedente"
              vacio="Sin antecedente"
              opciones={(listaConvenios.datos?.items || []).map((c) => ({ valor: String(c.id), texto: `${c.codigo} · ${c.titulo}` }))}
              value={f.antecedente.convenio_destino_id}
              onChange={(e) => poner("antecedente", { ...f.antecedente, convenio_destino_id: e.target.value })}
              error={err("convenio_destino_id")}
            />
            <Selector
              id={idCampo("tipo_vinculo")}
              etiqueta="Tipo de vínculo"
              vacio="Elegí el tipo"
              opciones={opcionesDe(TIPOS_VINCULO)}
              value={f.antecedente.tipo_vinculo}
              onChange={(e) => poner("antecedente", { ...f.antecedente, tipo_vinculo: e.target.value })}
              error={err("tipo_vinculo")}
              disabled={!f.antecedente.convenio_destino_id}
            />
          </div>
        </fieldset>
      )}

      <details className="rounded-xl border border-gray-200 bg-white p-5">
        <summary className="cursor-pointer text-base font-semibold">Más datos de la ficha (objeto, obligaciones, marco legal…)</summary>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(CAMPOS_FICHA_EXTRA).map(([clave, etiqueta]) =>
            ["resolucion", "expediente", "confidencialidad"].includes(clave) ? (
              <Campo key={clave} id={idCampo(clave)} etiqueta={etiqueta} value={f.extras[clave]} onChange={(e) => ponerExtra(clave, e.target.value)} error={err(clave)} />
            ) : (
              <AreaTexto key={clave} id={idCampo(clave)} etiqueta={etiqueta} value={f.extras[clave]} onChange={(e) => ponerExtra(clave, e.target.value)} error={err(clave)} />
            ),
          )}
        </div>
      </details>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
        {alCancelar && (
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
        <Boton type="submit" cargando={enviando}>
          {textoGuardar}
        </Boton>
      </div>
    </form>
  );
}
