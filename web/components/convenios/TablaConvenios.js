"use client";

import Link from "next/link";
import { InsigniaEstado, InsigniaVigencia } from "@/components/ui/basicos";
import { formatearFecha, TIPOS } from "@/lib/dominio";

export default function TablaConvenios({ convenios }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <caption className="sr-only">Convenios encontrados</caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-600">
            <th scope="col" className="px-5 py-3 font-semibold">Código</th>
            <th scope="col" className="px-3 py-3 font-semibold">Título y tipo</th>
            <th scope="col" className="px-3 py-3 font-semibold">Unidad</th>
            <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
            <th scope="col" className="px-3 py-3 font-semibold">Vigencia</th>
            <th scope="col" className="px-3 py-3 font-semibold">Vence</th>
            <th scope="col" className="px-5 py-3 font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {convenios.map((c) => (
            <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-5 py-3 font-semibold whitespace-nowrap">{c.codigo}</td>
              <td className="px-3 py-3">
                <span className="block font-medium">{c.titulo}</span>
                <span className="text-xs text-gray-600">{TIPOS[c.tipo] || c.tipo}</span>
              </td>
              <td className="px-3 py-3 text-gray-600">{c.unidad?.nombre || "—"}</td>
              <td className="px-3 py-3">
                <InsigniaEstado estado={c.estado} />
              </td>
              <td className="px-3 py-3">
                <InsigniaVigencia convenio={c} />
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{c.fecha_fin ? formatearFecha(c.fecha_fin) : c.estado === "firmado" ? "Sin vencimiento registrado" : "—"}</td>
              <td className="px-5 py-3 text-right">
                <Link href={`/convenios/${c.id}`} className="font-semibold text-blue-700 hover:underline">
                  Ver<span className="sr-only"> {c.codigo}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
