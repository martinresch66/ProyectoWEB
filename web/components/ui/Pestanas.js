"use client";

// Pestañas accesibles (patrón WAI-ARIA: flechas izquierda/derecha, Inicio y Fin).

import { useId, useRef, useState } from "react";

function pestanaDesdeHash(pestanas) {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace("#", "");
  return pestanas.some((p) => p.id === hash) ? hash : null;
}

export default function Pestanas({ pestanas, etiqueta }) {
  const base = useId();
  const [activa, setActiva] = useState(() => pestanaDesdeHash(pestanas) || pestanas[0]?.id);
  const botones = useRef({});
  const actual = pestanas.find((p) => p.id === activa) ? activa : pestanas[0]?.id;

  function mover(evento, indice) {
    let siguiente = null;
    if (evento.key === "ArrowRight") siguiente = (indice + 1) % pestanas.length;
    if (evento.key === "ArrowLeft") siguiente = (indice - 1 + pestanas.length) % pestanas.length;
    if (evento.key === "Home") siguiente = 0;
    if (evento.key === "End") siguiente = pestanas.length - 1;
    if (siguiente === null) return;
    evento.preventDefault();
    const id = pestanas[siguiente].id;
    setActiva(id);
    botones.current[id]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={etiqueta} className="flex flex-wrap gap-1 border-b border-gray-200">
        {pestanas.map((p, i) => {
          const seleccionada = p.id === actual;
          return (
            <button
              key={p.id}
              ref={(el) => {
                botones.current[p.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${p.id}`}
              aria-selected={seleccionada}
              aria-controls={`${base}-panel-${p.id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => setActiva(p.id)}
              onKeyDown={(e) => mover(e, i)}
              className={`-mb-px min-h-11 border-b-2 px-3 text-sm ${seleccionada ? "border-blue-700 font-semibold text-blue-700" : "border-transparent font-medium text-gray-600 hover:text-gray-900"}`}
            >
              {p.titulo}
            </button>
          );
        })}
      </div>
      {pestanas.map((p) => (
        <div key={p.id} role="tabpanel" id={`${base}-panel-${p.id}`} aria-labelledby={`${base}-tab-${p.id}`} hidden={p.id !== actual} tabIndex={0}>
          {p.id === actual && p.contenido}
        </div>
      ))}
    </div>
  );
}
