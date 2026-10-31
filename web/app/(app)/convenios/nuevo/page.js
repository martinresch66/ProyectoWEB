"use client";

import { useRouter } from "next/navigation";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { EncabezadoPagina, SinPermiso } from "@/components/ui/basicos";
import FormularioConvenio from "@/components/convenios/FormularioConvenio";
import { convenios, vinculos } from "@/lib/api/servicios";
import { mensajeDeError } from "@/lib/api/errores";
import { puedeCrearConvenio } from "@/lib/permisos";

export default function PaginaNuevoConvenio() {
  const { usuario } = useSesion();
  const router = useRouter();
  const avisar = useAvisos();

  if (!puedeCrearConvenio(usuario)) return <SinPermiso />;

  async function guardar(datos, antecedente) {
    const creado = await convenios.crear(datos);
    if (creado?.pendiente) {
      avisar("Sin conexión: el borrador se guardó en este equipo y se enviará al volver la conexión.", "info");
      router.push("/pendientes");
      return;
    }
    if (antecedente) {
      try {
        await vinculos.crear(creado.id, antecedente);
      } catch (e) {
        avisar(`El convenio se creó, pero no se pudo vincular con el antecedente: ${mensajeDeError(e)}`, "error");
      }
    }
    avisar(`Se creó el borrador ${creado.codigo}.`);
    router.push(`/convenios/${creado.id}`);
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Nuevo convenio"
        descripcion="Se guarda como borrador. Después podés subir documentos y enviarlo a revisión."
        migas={[{ texto: "Convenios", href: "/convenios" }, { texto: "Nuevo convenio" }]}
      />
      <FormularioConvenio alGuardar={guardar} alCancelar={() => router.push("/convenios")} textoGuardar="Crear borrador" />
    </>
  );
}
