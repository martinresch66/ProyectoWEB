"use client";

import Link from "next/link";
import { InsigniaVigencia } from "@/components/ui/basicos";
import { formatearFecha, TIPOS } from "@/lib/dominio";

// Tabla compacta de convenios con su vencimiento (panel y pantalla de plazos).
export default function TablaPlazos({ convenios, titulo }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        {titulo && <caption className="sr-only">{titulo}</caption>}
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
            <th scope="col" className="px-3 py-2 font-semibold">Código</th>
            <th scope="col" className="px-3 py-2 font-semibold">Título</th>
            <th scope="col" className="px-3 py-2 font-semibold">Unidad</th>
            <th scope="col" className="px-3 py-2 font-semibold">Vence</th>
            <th scope="col" className="px-3 py-2 font-semibold">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          {convenios.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="px-3 py-3 font-semibold whitespace-nowrap">
                <Link href={`/convenios/${c.id}`} className="text-blue-700 hover:underline">
                  {c.codigo}
                </Link>
              </td>
              <td className="px-3 py-3">
                <span className="block">{c.titulo}</span>
                <span className="text-xs text-gray-600">{TIPOS[c.tipo]}</span>
              </td>
              <td className="px-3 py-3 text-gray-600">{c.unidad?.nombre || "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap">{c.fecha_fin ? formatearFecha(c.fecha_fin) : "—"}</td>
              <td className="px-3 py-3">
                <InsigniaVigencia convenio={c} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
