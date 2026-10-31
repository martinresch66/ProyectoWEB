"use client";

// Plazos: convenios firmados agrupados por vigencia (calculada en el navegador con
// fecha_fin y dias_preaviso, así funciona aunque el backend no filtre por vigencia).

import { AvisoCopiaLocal, Cargando, EncabezadoPagina, ErrorCarga, Tarjeta } from "@/components/ui/basicos";
import TablaPlazos from "@/components/convenios/TablaPlazos";
import { useDatos } from "@/hooks/useDatos";
import { convenios } from "@/lib/api/servicios";
import { calcularVigencia } from "@/lib/dominio";

const GRUPOS = [
  { clave: "proximo", titulo: "Próximos a vencer", vacio: "Ningún convenio entra en su período de preaviso." },
  { clave: "vencido", titulo: "Vencidos", vacio: "No hay convenios firmados vencidos." },
  { clave: "sin_vencimiento", titulo: "Sin vencimiento registrado", vacio: "Todos los convenios firmados tienen fecha de vencimiento." },
  { clave: "vigente", titulo: "Vigentes", vacio: "No hay otros convenios vigentes." },
];

export default function PaginaPlazos() {
  const { datos, cargando, error, desdeCache, recargar } = useDatos(() => convenios.listar({ estado: "firmado" }, 1, 100), "plazos");

  const porGrupo = {};
  for (const c of datos?.items || []) {
    const clave = calcularVigencia(c)?.clave || "vigente";
    (porGrupo[clave] ||= []).push(c);
  }
  for (const lista of Object.values(porGrupo)) lista.sort((a, b) => (a.fecha_fin || "9999").localeCompare(b.fecha_fin || "9999"));

  return (
    <>
      <EncabezadoPagina titulo="Plazos" descripcion="Convenios firmados según su vencimiento y el preaviso configurado en cada uno." />
      <AvisoCopiaLocal visible={desdeCache} />
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos &&
        GRUPOS.map((g) => (
          <Tarjeta key={g.clave} titulo={`${g.titulo} (${porGrupo[g.clave]?.length || 0})`}>
            {porGrupo[g.clave]?.length ? <TablaPlazos convenios={porGrupo[g.clave]} titulo={g.titulo} /> : <p className="text-sm text-gray-600">{g.vacio}</p>}
          </Tarjeta>
        ))}
    </>
  );
}
