"use client";

import { useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Cargando, EncabezadoPagina, EnlaceBoton, ErrorCarga, Tarjeta } from "@/components/ui/basicos";
import GraficoBarras from "@/components/panel/GraficoBarras";
import TablaPlazos from "@/components/convenios/TablaPlazos";
import { useDatos } from "@/hooks/useDatos";
import { panel } from "@/lib/api/servicios";
import { ESTADOS, TIPOS } from "@/lib/dominio";
import { esGlobal } from "@/lib/permisos";

function Indicador({ titulo, valor, resaltado }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-5 ${resaltado ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <span className={`text-sm ${resaltado ? "font-semibold text-amber-900" : "text-gray-600"}`}>{titulo}</span>
      <span className="text-3xl font-bold">{valor}</span>
    </div>
  );
}

export default function PaginaPanel() {
  const { usuario } = useSesion();
  const { datos, cargando, error, desdeCache, recargar } = useDatos(() => panel.obtener(), "panel");

  return (
    <>
      <EncabezadoPagina
        titulo="Panel"
        descripcion={esGlobal(usuario) ? "Datos de todas las unidades" : `Datos de ${usuario.unidad?.nombre || "tu unidad"}`}
        acciones={<EnlaceBoton href="/convenios" variante="secundario">Ver convenios</EnlaceBoton>}
      />
      <AvisoCopiaLocal visible={desdeCache} />

      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}

      {datos && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador titulo="Convenios en tu alcance" valor={datos.total} />
            <Indicador titulo="Firmados y vigentes" valor={datos.firmados_vigentes} />
            <Indicador titulo="Próximos a vencer" valor={datos.proximos_a_vencer} resaltado={datos.proximos_a_vencer > 0} />
            <Indicador titulo="Personas únicas vinculadas" valor={datos.personas_unicas} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Tarjeta>
              <GraficoBarras titulo="Por estado" datos={datos.por_estado} etiquetas={ESTADOS} />
            </Tarjeta>
            <Tarjeta>
              <GraficoBarras titulo="Por tipo" datos={datos.por_tipo} etiquetas={TIPOS} />
            </Tarjeta>
            <Tarjeta>
              <GraficoBarras titulo="Por unidad" datos={datos.por_unidad} horizontal />
            </Tarjeta>
            <Tarjeta>
              <GraficoBarras titulo="Por año de firma" datos={datos.por_anio} />
            </Tarjeta>
          </div>

          <Tarjeta titulo="Próximos a vencer y vencidos" acciones={<EnlaceBoton href="/plazos" variante="texto">Ver todos los plazos</EnlaceBoton>}>
            {datos.plazos.length ? (
              <TablaPlazos convenios={datos.plazos} titulo="Próximos a vencer y vencidos" />
            ) : (
              <p className="text-sm text-gray-600">No hay convenios próximos a vencer ni vencidos.</p>
            )}
          </Tarjeta>
        </>
      )}
    </>
  );
}
