"use client";

// Documentos del convenio: listado con versiones y SHA-256, descarga y subida de PDF.

import { useRef, useState } from "react";
import { useAvisos, useConexion, useSesion } from "@/components/Proveedores";
import { Boton, Nota } from "@/components/ui/basicos";
import { Selector, opcionesDe } from "@/components/ui/formulario";
import { documentos as apiDocumentos } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { MAX_PDF_BYTES, TIPOS_DOCUMENTO, formatearBytes, formatearFechaHora, hashCorto } from "@/lib/dominio";
import { puedeSubirDocumentos } from "@/lib/permisos";

// Controles del lado del navegador (el servidor vuelve a validar todo).
async function validarArchivo(archivo) {
  if (!archivo) return "Elegí un archivo PDF.";
  if (archivo.size > MAX_PDF_BYTES) return `El archivo pesa ${formatearBytes(archivo.size)}: el máximo es 20 MB.`;
  const cabecera = await archivo.slice(0, 5).text();
  if (cabecera !== "%PDF-") return "El archivo no es un PDF válido.";
  return "";
}

export default function Documentos({ convenio, alCambiar }) {
  const { usuario } = useSesion();
  const { enLinea } = useConexion();
  const avisar = useAvisos();
  const [tipo, setTipo] = useState("convenio_firmado");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(null);
  const entrada = useRef(null);

  const ordenados = [...convenio.documentos].sort((a, b) => (a.tipo_documento === b.tipo_documento ? b.version - a.version : a.tipo_documento.localeCompare(b.tipo_documento)));
  const ultimaVersion = {};
  for (const d of ordenados) ultimaVersion[d.tipo_documento] = Math.max(ultimaVersion[d.tipo_documento] || 0, d.version);

  async function subir(evento) {
    evento.preventDefault();
    const problema = await validarArchivo(archivo);
    setError(problema);
    if (problema) return;
    setSubiendo(true);
    try {
      await apiDocumentos.subir(convenio.id, archivo, tipo);
      avisar(`Se subió ${archivo.name}.`);
      setArchivo(null);
      if (entrada.current) entrada.current.value = "";
      alCambiar();
    } catch (e) {
      setError(e instanceof ErrorValidacion ? Object.values(e.campos).join(" ") || e.message : mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  }

  async function descargar(documento) {
    setDescargando(documento.id);
    try {
      await apiDocumentos.descargar(documento);
    } catch (e) {
      avisar(`No se pudo descargar: ${mensajeDeError(e)}`, "error");
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {ordenados.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no hay documentos cargados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {ordenados.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                <span className="font-semibold break-all">{d.nombre_original}</span>
                <span className="text-gray-600">
                  {TIPOS_DOCUMENTO[d.tipo_documento] || d.tipo_documento} · versión {d.version}
                  {d.version === ultimaVersion[d.tipo_documento] ? " (vigente)" : " (anterior)"} · {formatearBytes(d.tamano_bytes)} · {formatearFechaHora(d.creado_en)}
                  {d.subido_por_nombre ? ` · ${d.subido_por_nombre}` : ""}
                </span>
                <span className="font-mono text-xs text-gray-600" title={d.hash_sha256 || ""}>
                  SHA-256 {hashCorto(d.hash_sha256)}
                </span>
              </div>
              <Boton variante="secundario" onClick={() => descargar(d)} cargando={descargando === d.id} disabled={!enLinea}>
                Descargar<span className="sr-only"> {d.nombre_original}</span>
              </Boton>
            </li>
          ))}
        </ul>
      )}

      {puedeSubirDocumentos(usuario, convenio) && (
        <form onSubmit={subir} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5" noValidate>
          <h3 className="text-base font-semibold">Subir un documento</h3>
          {!enLinea && <Nota tipo="alerta">Subir documentos necesita conexión.</Nota>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Selector etiqueta="Tipo de documento" opciones={opcionesDe(TIPOS_DOCUMENTO)} value={tipo} onChange={(e) => setTipo(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="archivo-pdf" className="text-sm font-semibold text-gray-700">
                Archivo PDF (máximo 20 MB)
              </label>
              <input
                ref={entrada}
                id="archivo-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  setArchivo(e.target.files?.[0] || null);
                  setError("");
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "archivo-error" : "archivo-ayuda"}
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
              />
              {error ? (
                <p id="archivo-error" role="alert" className="text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : (
                <p id="archivo-ayuda" className="text-xs text-gray-600">
                  Si ya hay un documento del mismo tipo, este queda como versión nueva y el anterior se conserva.
                </p>
              )}
            </div>
          </div>
          <Boton type="submit" cargando={subiendo} disabled={!enLinea || !archivo} className="self-start">
            Subir documento
          </Boton>
        </form>
      )}
    </div>
  );
}
