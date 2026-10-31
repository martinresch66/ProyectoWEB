"use client";

// Campos de formulario accesibles: cada control tiene su <label>, su ayuda y su error asociados.

import { useId } from "react";

const CONTROL =
  "min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-600";

function claseControl(error) {
  return `${CONTROL} ${error ? "border-2 border-red-600" : "border-gray-300"}`;
}

function Envoltura({ id, etiqueta, ayuda, error, obligatorio, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {etiqueta}
        {obligatorio && (
          <span className="text-red-700" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-xs text-gray-600">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id, ayuda, error) {
  if (error) return `${id}-error`;
  if (ayuda) return `${id}-ayuda`;
  return undefined;
}

export function Campo({ etiqueta, ayuda, error, obligatorio, className, id: idPropio, ...props }) {
  const generado = useId();
  const id = idPropio || generado;
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio} className={className}>
      <input id={id} className={claseControl(error)} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, ayuda, error)} required={obligatorio} {...props} />
    </Envoltura>
  );
}

export function Selector({ etiqueta, ayuda, error, obligatorio, className, opciones, vacio, id: idPropio, ...props }) {
  const generado = useId();
  const id = idPropio || generado;
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio} className={className}>
      <select id={id} className={claseControl(error)} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, ayuda, error)} required={obligatorio} {...props}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Envoltura>
  );
}

export function AreaTexto({ etiqueta, ayuda, error, obligatorio, className, id: idPropio, ...props }) {
  const generado = useId();
  const id = idPropio || generado;
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio} className={className}>
      <textarea id={id} rows={3} className={`${claseControl(error)} py-2`} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, ayuda, error)} required={obligatorio} {...props} />
    </Envoltura>
  );
}

// Lista de errores arriba del formulario, con enlaces a cada campo (WCAG 3.3.1).
export function ResumenErrores({ errores, etiquetas = {} }) {
  const entradas = Object.entries(errores || {}).filter(([, mensaje]) => mensaje);
  if (!entradas.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
      <p className="font-semibold">Revisá {entradas.length === 1 ? "1 campo" : `${entradas.length} campos`} antes de continuar:</p>
      <ul className="mt-1 list-disc pl-5">
        {entradas.map(([campo, mensaje]) => (
          <li key={campo}>
            <a href={`#campo-${campo.replace(/\./g, "-")}`} className="underline">
              {etiquetas[campo] ? `${etiquetas[campo]}: ` : ""}
              {mensaje}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Convierte un objeto { valor: texto } en opciones para <Selector>.
export function opcionesDe(objeto) {
  return Object.entries(objeto).map(([valor, texto]) => ({ valor, texto }));
}
