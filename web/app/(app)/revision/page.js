"use client";

// Bandeja de revisión: convenios en estado "revision". A la derecha, la revisión rápida
// del seleccionado: controles para aprobar, documentos, observaciones y acciones.

import Link from "next/link";
import { useState } from "react";
import { useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Cargando, EncabezadoPagina, ErrorCarga, SinPermiso, Tarjeta, Vacio } from "@/components/ui/basicos";
import AccionesEstado from "@/components/convenios/AccionesEstado";
import Documentos from "@/components/convenios/Documentos";
import Observaciones from "@/components/convenios/Observaciones";
import { useDatos } from "@/hooks/useDatos";
import { convenios } from "@/lib/api/servicios";
import { MINIMO_PARTES_PARA_APROBAR, TIPOS } from "@/lib/dominio";
import { puedeRevisar } from "@/lib/permisos";

function Control({ ok, children }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`min-w-14 rounded-md px-1.5 py-0.5 text-center text-xs font-bold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{ok ? "Listo" : "Falta"}</span>
      <span>{children}</span>
    </li>
  );
}

function Revision({ id, alCambiar }) {
  const { datos: c, cargando, error, recargar } = useDatos(() => convenios.obtener(id), `revision-${id}`);
  if (cargando && !c) return <Cargando />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;
  if (!c) return null;

  const pendientes = c.observaciones.filter((o) => !o.esta_resuelta).length;
  const tienePrincipal = c.documentos.length > 0;
  const actualizar = () => {
    recargar();
    alCambiar();
  };

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <p className="text-sm font-semibold text-gray-600">
          {c.codigo} · {TIPOS[c.tipo]} · {c.unidad?.nombre}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{c.titulo}</h2>
        {c.resumen && <p className="mt-2 text-sm text-gray-700">{c.resumen}</p>}
        <Link href={`/convenios/${c.id}`} className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Ver la ficha completa
        </Link>
      </Tarjeta>
      <Tarjeta titulo="Controles para aprobar">
        <ul className="flex flex-col gap-2">
          <Control ok={c.partes.length >= MINIMO_PARTES_PARA_APROBAR}>
            Al menos {MINIMO_PARTES_PARA_APROBAR} partes (hay {c.partes.length})
          </Control>
          <Control ok={tienePrincipal}>Documento cargado</Control>
          <Control ok={pendientes === 0}>{pendientes === 0 ? "Sin observaciones pendientes" : `${pendientes} observación(es) sin resolver`}</Control>
        </ul>
        <div className="mt-4">
          <AccionesEstado convenio={c} alCambiar={actualizar} />
        </div>
      </Tarjeta>
      <Tarjeta titulo="Documentos">
        <Documentos convenio={c} alCambiar={recargar} />
      </Tarjeta>
      <Tarjeta titulo="Observaciones">
        <Observaciones convenio={c} alCambiar={recargar} />
      </Tarjeta>
    </div>
  );
}

export default function PaginaRevision() {
  const { usuario } = useSesion();
  const [elegido, setElegido] = useState(null);
  const bandeja = useDatos(() => convenios.listar({ estado: "revision" }, 1, 100), "bandeja-revision");

  if (!puedeRevisar(usuario)) return <SinPermiso />;

  const items = bandeja.datos?.items || [];
  const seleccionado = items.some((c) => c.id === elegido) ? elegido : items[0]?.id;

  return (
    <>
      <EncabezadoPagina titulo="Bandeja de revisión" descripcion={bandeja.datos ? `${items.length} convenio(s) esperando revisión` : undefined} />
      <AvisoCopiaLocal visible={bandeja.desdeCache} />
      {bandeja.cargando && !bandeja.datos && <Cargando />}
      {bandeja.error && <ErrorCarga error={bandeja.error} alReintentar={bandeja.recargar} />}
      {bandeja.datos && items.length === 0 && <Vacio titulo="No hay convenios para revisar" descripcion="Cuando Gestión envíe uno, va a aparecer acá y te va a llegar un aviso." />}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <nav aria-label="Convenios para revisar" className="flex flex-col gap-2">
            {items.map((c) => {
              const activo = c.id === seleccionado;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-current={activo ? "true" : undefined}
                  onClick={() => setElegido(c.id)}
                  className={`flex flex-col gap-1 rounded-xl border p-4 text-left ${activo ? "border-2 border-blue-700 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                >
                  <span className={`text-xs font-semibold ${activo ? "text-blue-700" : "text-gray-600"}`}>{c.codigo}</span>
                  <span className="text-sm font-semibold">{c.titulo}</span>
                  <span className="text-xs text-gray-600">{c.unidad?.nombre}</span>
                </button>
              );
            })}
          </nav>
          {seleccionado && <Revision key={seleccionado} id={seleccionado} alCambiar={bandeja.recargar} />}
        </div>
      )}
    </>
  );
}
