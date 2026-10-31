"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Cargando, EncabezadoPagina, EnlaceBoton, ErrorCarga, Nota } from "@/components/ui/basicos";
import FormularioConvenio from "@/components/convenios/FormularioConvenio";
import ResolverConflicto from "@/components/convenios/ResolverConflicto";
import { useDatos } from "@/hooks/useDatos";
import { convenios } from "@/lib/api/servicios";
import { ErrorConflicto } from "@/lib/api/errores";
import { adaptarConvenio } from "@/lib/api/adaptadores";
import { puedeEditarConvenio } from "@/lib/permisos";

export default function PaginaEditarConvenio() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const router = useRouter();
  const avisar = useAvisos();
  const { datos: convenio, cargando, error, desdeCache, recargar } = useDatos(() => convenios.obtener(id), `ficha-${id}`);
  const [conflicto, setConflicto] = useState(null); // { mios, servidor }

  async function guardar(datos, version = convenio.version) {
    try {
      const r = await convenios.actualizar(id, datos, version);
      if (r?.pendiente) {
        avisar("Sin conexión: los cambios se guardaron en este equipo y se enviarán al volver la conexión.", "info");
        router.push("/pendientes");
        return;
      }
      avisar("Cambios guardados.");
      router.push(`/convenios/${id}`);
    } catch (e) {
      if (!(e instanceof ErrorConflicto)) throw e;
      let servidor = e.actual ? adaptarConvenio(e.actual) : null;
      if (!servidor) servidor = (await convenios.obtener(id)).datos;
      setConflicto({ mios: datos, servidor });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const migas = [{ texto: "Convenios", href: "/convenios" }, { texto: convenio?.codigo || "…", href: `/convenios/${id}` }, { texto: "Editar" }];

  if (cargando && !convenio) return <Cargando />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;
  if (!convenio) return null;

  if (!puedeEditarConvenio(usuario, convenio)) {
    return (
      <>
        <EncabezadoPagina titulo={`Editar ${convenio.codigo}`} migas={migas} />
        <Nota tipo="alerta" titulo="Este convenio no se puede editar">
          Solo se editan borradores de tu unidad. Los cambios de fondo de un convenio firmado se hacen con una adenda.
        </Nota>
        <EnlaceBoton href={`/convenios/${id}`} variante="secundario" className="self-start">
          Volver a la ficha
        </EnlaceBoton>
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina titulo={`Editar ${convenio.codigo}`} descripcion={`Versión ${convenio.version}`} migas={migas} />
      <AvisoCopiaLocal visible={desdeCache} />
      {conflicto && (
        <ResolverConflicto
          mios={conflicto.mios}
          servidor={conflicto.servidor}
          unidades={convenio.unidad ? { [convenio.unidad_id]: convenio.unidad.nombre } : {}}
          alDescartar={() => {
            setConflicto(null);
            router.push(`/convenios/${id}`);
          }}
          alResolver={async (finales, version) => {
            setConflicto(null);
            await guardar(finales, version);
          }}
        />
      )}
      <FormularioConvenio key={convenio.version} convenio={convenio} alGuardar={(datos) => guardar(datos)} alCancelar={() => router.push(`/convenios/${id}`)} textoGuardar="Guardar cambios" />
    </>
  );
}
