"use client";

// Ventana modal accesible basada en <dialog> (maneja el foco y la tecla Esc solo).

import { useEffect, useRef } from "react";

export default function Dialogo({ abierto, alCerrar, titulo, children, acciones }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="dialogo-titulo" className="text-lg font-semibold">
          {titulo}
        </h2>
        {children}
        {acciones && <div className="flex flex-wrap justify-end gap-2 pt-2">{acciones}</div>}
      </div>
    </dialog>
  );
}
