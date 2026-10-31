"use client";

// Catálogo de personas (estudiantes, tutores, representantes): búsqueda y alta.

import { useState } from "react";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Boton, Cargando, EncabezadoPagina, ErrorCarga, SinPermiso, Tarjeta, Vacio } from "@/components/ui/basicos";
import { Campo, ResumenErrores } from "@/components/ui/formulario";
import { useDatos } from "@/hooks/useDatos";
import { personas } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { nombrePersona } from "@/lib/dominio";
import { puedeGestionarCatalogos } from "@/lib/permisos";

const VACIA = { nombre: "", apellido: "", dni: "", email: "", telefono: "" };
const ETIQUETAS = { nombre: "Nombre", apellido: "Apellido", dni: "DNI", email: "Email", telefono: "Teléfono" };

export default function PaginaPersonas() {
  const { usuario } = useSesion();
  const avisar = useAvisos();
  const [busqueda, setBusqueda] = useState("");
  const [aplicada, setAplicada] = useState("");
  const [nueva, setNueva] = useState(VACIA);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const lista = useDatos(() => personas.listar(aplicada), `personas-${aplicada}`);

  if (!puedeGestionarCatalogos(usuario)) return <SinPermiso />;

  async function crear(evento) {
    evento.preventDefault();
    const e = {};
    if (nueva.nombre.trim().length < 2) e.nombre = "Indicá el nombre.";
    if (nueva.apellido.trim().length < 2) e.apellido = "Indicá el apellido.";
    if (!/^\d{7,8}$/.test(nueva.dni)) e.dni = "El DNI tiene que tener 7 u 8 números, sin puntos.";
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      const datos = Object.fromEntries(Object.entries(nueva).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]));
      const creada = await personas.crear(datos);
      avisar(`Se agregó a ${nombrePersona(creada)}.`);
      setNueva(VACIA);
      lista.recargar();
    } catch (error) {
      setErrores(error instanceof ErrorValidacion ? error.campos : { nombre: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  }

  const poner = (campo) => (e) => setNueva({ ...nueva, [campo]: e.target.value });

  return (
    <>
      <EncabezadoPagina titulo="Personas" descripcion="Personas vinculadas a convenios. Cargá solo datos ficticios y los mínimos necesarios." />
      <AvisoCopiaLocal visible={lista.desdeCache} />

      <Tarjeta titulo="Agregar una persona">
        <form onSubmit={crear} noValidate className="flex flex-col gap-4">
          <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo id="campo-nombre" etiqueta="Nombre" value={nueva.nombre} onChange={poner("nombre")} error={errores.nombre} obligatorio />
            <Campo id="campo-apellido" etiqueta="Apellido" value={nueva.apellido} onChange={poner("apellido")} error={errores.apellido} obligatorio />
            <Campo id="campo-dni" etiqueta="DNI" inputMode="numeric" value={nueva.dni} onChange={poner("dni")} error={errores.dni} ayuda="Sin puntos. Evita cargar la misma persona dos veces." obligatorio />
            <Campo id="campo-email" etiqueta="Email" type="email" value={nueva.email} onChange={poner("email")} error={errores.email} />
            <Campo id="campo-telefono" etiqueta="Teléfono" value={nueva.telefono} onChange={poner("telefono")} error={errores.telefono} />
          </div>
          <Boton type="submit" cargando={guardando} className="self-start">
            Agregar persona
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo="Personas cargadas"
        acciones={
          <form
            role="search"
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAplicada(busqueda.trim());
            }}
          >
            <Campo etiqueta="Buscar por apellido o DNI" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <Boton type="submit" variante="secundario">
              Buscar
            </Boton>
          </form>
        }
      >
        {lista.cargando && !lista.datos && <Cargando />}
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {lista.datos && lista.datos.length === 0 && <Vacio titulo="No hay personas con esa búsqueda" />}
        {lista.datos && lista.datos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">Persona</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">DNI</th>
                  <th scope="col" className="py-2 font-semibold">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{nombrePersona(p)}</td>
                    <td className="py-2 pr-3">{p.dni || "—"}</td>
                    <td className="py-2">{[p.email, p.telefono].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
