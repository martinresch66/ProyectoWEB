"use client";

// Se muestra cuando el servidor responde 409: otra persona guardó una versión más nueva.
// El usuario elige, campo por campo, qué valor queda. Después se guarda con la versión del servidor.

import { useState } from "react";
import { Boton, Nota } from "@/components/ui/basicos";
import { CAMPOS_FICHA_EXTRA, TIPOS, formatearFecha, nombrePersona } from "@/lib/dominio";

const CAMPOS = [
  { clave: "codigo", etiqueta: "Código" },
  { clave: "titulo", etiqueta: "Título" },
  { clave: "tipo", etiqueta: "Tipo", ver: (v) => TIPOS[v] || v },
  { clave: "unidad_id", etiqueta: "Unidad", ver: (v, unidades) => unidades?.[v] || v },
  { clave: "resumen", etiqueta: "Resumen" },
  { clave: "fecha_inicio", etiqueta: "Fecha de inicio", ver: formatearFecha },
  { clave: "fecha_fin", etiqueta: "Fecha de vencimiento", ver: (v) => (v ? formatearFecha(v) : "Sin vencimiento registrado") },
  { clave: "dias_preaviso", etiqueta: "Días de preaviso" },
  ...Object.entries(CAMPOS_FICHA_EXTRA).map(([clave, etiqueta]) => ({ clave, etiqueta })),
];

// Pasa la ficha del servidor a la misma forma que el JSON que envía el formulario.
function servidorComoDatos(s) {
  return {
    codigo: s.codigo,
    titulo: s.titulo,
    tipo: s.tipo,
    unidad_id: s.unidad_id,
    resumen: s.resumen,
    fecha_inicio: s.fecha_inicio,
    fecha_fin: s.fecha_fin,
    dias_preaviso: s.dias_preaviso,
    partes: (s.partes || []).map((p) => ({ parte_id: p.id, rol_en_convenio: p.rol_en_convenio, _nombre: p.nombre })),
    personas: (s.personas || []).map((p) => ({ persona_id: p.id, rol: p.rol, _nombre: nombrePersona(p) })),
    ...Object.fromEntries(Object.keys(CAMPOS_FICHA_EXTRA).map((k) => [k, s.extras?.[k] ?? null])),
  };
}

const normalizar = (v) => (v === undefined || v === "" ? null : typeof v === "number" ? String(v) : v);
const resumenLista = (lista, nombres) =>
  (lista || []).map((x) => `${x._nombre || nombres?.[x.parte_id ?? x.persona_id] || x.parte_id || x.persona_id}${x.rol_en_convenio || x.rol ? ` (${x.rol_en_convenio || x.rol})` : ""}`).join(", ") || "—";

export default function ResolverConflicto({ mios, servidor, unidades = {}, alResolver, alDescartar }) {
  const delServidor = servidorComoDatos(servidor);
  const nombres = Object.fromEntries([...(servidor.partes || []), ...(servidor.personas || [])].map((x) => [x.id, x.nombre]));

  const diferencias = CAMPOS.filter((c) => c.clave in mios && JSON.stringify(normalizar(mios[c.clave])) !== JSON.stringify(normalizar(delServidor[c.clave])));
  const firma = (lista) => JSON.stringify((lista || []).map((x) => [x.parte_id ?? x.persona_id, x.rol_en_convenio ?? x.rol ?? null]));
  if (firma(mios.partes) !== firma(delServidor.partes)) diferencias.push({ clave: "partes", etiqueta: "Partes", lista: true });
  if (firma(mios.personas) !== firma(delServidor.personas)) diferencias.push({ clave: "personas", etiqueta: "Personas", lista: true });

  const [eleccion, setEleccion] = useState({});
  const [guardando, setGuardando] = useState(false);
  const elegido = (clave) => eleccion[clave] || "mio";

  function mostrar(campo, valor) {
    if (campo.lista) return resumenLista(valor, nombres);
    if (valor === null || valor === undefined || valor === "") return "—";
    return campo.ver ? campo.ver(valor, unidades) : String(valor);
  }

  async function guardar() {
    const finales = { ...mios };
    for (const campo of diferencias) {
      if (elegido(campo.clave) === "servidor") {
        finales[campo.clave] = campo.lista ? delServidor[campo.clave].map(({ _nombre, ...resto }) => resto) : delServidor[campo.clave];
      }
    }
    setGuardando(true);
    try {
      await alResolver(finales, servidor.version);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-conflicto" className="flex flex-col gap-4 rounded-xl border-2 border-amber-400 bg-white p-5">
      <h2 id="titulo-conflicto" className="text-lg font-semibold">
        Alguien guardó cambios mientras editabas
      </h2>
      <Nota tipo="alerta">
        La versión del servidor es la {servidor.version}. Elegí qué valor queda en cada campo; todavía no se guardó nada.
      </Nota>
      {diferencias.length === 0 ? (
        <p className="text-sm text-gray-700">Tus cambios coinciden con la versión actual. Podés guardar sin elegir nada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {diferencias.map((campo) => (
            <fieldset key={campo.clave} className="rounded-lg border border-gray-200 p-3">
              <legend className="px-1 text-sm font-semibold">{campo.etiqueta}</legend>
              <label className="flex min-h-11 items-start gap-2 py-1 text-sm">
                <input type="radio" name={`conflicto-${campo.clave}`} checked={elegido(campo.clave) === "mio"} onChange={() => setEleccion({ ...eleccion, [campo.clave]: "mio" })} className="mt-1 h-4 w-4" />
                <span>
                  <strong>Tu valor:</strong> {mostrar(campo, mios[campo.clave])}
                </span>
              </label>
              <label className="flex min-h-11 items-start gap-2 py-1 text-sm">
                <input type="radio" name={`conflicto-${campo.clave}`} checked={elegido(campo.clave) === "servidor"} onChange={() => setEleccion({ ...eleccion, [campo.clave]: "servidor" })} className="mt-1 h-4 w-4" />
                <span>
                  <strong>Valor actual:</strong> {mostrar(campo, delServidor[campo.clave])}
                </span>
              </label>
            </fieldset>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Boton variante="secundario" onClick={alDescartar}>
          Descartar mis cambios
        </Boton>
        <Boton onClick={guardar} cargando={guardando}>
          Guardar con estos valores
        </Boton>
      </div>
    </section>
  );
}
