"use client";

// Catálogo de partes (instituciones firmantes): búsqueda y alta.

import { useState } from "react";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Boton, Cargando, EncabezadoPagina, ErrorCarga, SinPermiso, Tarjeta, Vacio } from "@/components/ui/basicos";
import { Campo, ResumenErrores, Selector } from "@/components/ui/formulario";
import { useDatos } from "@/hooks/useDatos";
import { partes } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { puedeGestionarCatalogos } from "@/lib/permisos";

const VACIA = { nombre: "", cuit_cuil: "", tipo_personeria: "juridica", email: "", telefono: "", direccion: "" };
const ETIQUETAS = { nombre: "Nombre", cuit_cuil: "CUIT/CUIL", tipo_personeria: "Personería", email: "Email", telefono: "Teléfono", direccion: "Dirección" };

export default function PaginaPartes() {
  const { usuario } = useSesion();
  const avisar = useAvisos();
  const [busqueda, setBusqueda] = useState("");
  const [aplicada, setAplicada] = useState("");
  const [nueva, setNueva] = useState(VACIA);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const lista = useDatos(() => partes.listar(aplicada), `partes-${aplicada}`);

  if (!puedeGestionarCatalogos(usuario)) return <SinPermiso />;

  async function crear(evento) {
    evento.preventDefault();
    const e = {};
    if (nueva.nombre.trim().length < 3) e.nombre = "Indicá el nombre o la razón social.";
    if (nueva.cuit_cuil && !/^\d{2}-\d{8}-\d$/.test(nueva.cuit_cuil)) e.cuit_cuil = "Formato NN-NNNNNNNN-N.";
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      const datos = Object.fromEntries(Object.entries(nueva).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]));
      const creada = await partes.crear(datos);
      avisar(`Se agregó ${creada.nombre}.`);
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
      <EncabezadoPagina titulo="Partes" descripcion="Instituciones y empresas que firman convenios con la UNLPam." />
      <AvisoCopiaLocal visible={lista.desdeCache} />

      <Tarjeta titulo="Agregar una parte">
        <form onSubmit={crear} noValidate className="flex flex-col gap-4">
          <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo id="campo-nombre" etiqueta="Nombre o razón social" value={nueva.nombre} onChange={poner("nombre")} error={errores.nombre} obligatorio className="md:col-span-2" />
            <Selector id="campo-tipo_personeria" etiqueta="Personería" opciones={[{ valor: "juridica", texto: "Jurídica" }, { valor: "fisica", texto: "Física" }]} value={nueva.tipo_personeria} onChange={poner("tipo_personeria")} error={errores.tipo_personeria} />
            <Campo id="campo-cuit_cuil" etiqueta="CUIT/CUIL" placeholder="30-12345678-9" value={nueva.cuit_cuil} onChange={poner("cuit_cuil")} error={errores.cuit_cuil} ayuda="Con guiones. Usá datos ficticios." />
            <Campo id="campo-email" etiqueta="Email" type="email" value={nueva.email} onChange={poner("email")} error={errores.email} />
            <Campo id="campo-telefono" etiqueta="Teléfono" value={nueva.telefono} onChange={poner("telefono")} error={errores.telefono} />
            <Campo id="campo-direccion" etiqueta="Dirección" value={nueva.direccion} onChange={poner("direccion")} error={errores.direccion} className="md:col-span-3" />
          </div>
          <Boton type="submit" cargando={guardando} className="self-start">
            Agregar parte
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo="Partes cargadas"
        acciones={
          <form
            role="search"
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAplicada(busqueda.trim());
            }}
          >
            <Campo etiqueta="Buscar por nombre o CUIT" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <Boton type="submit" variante="secundario">
              Buscar
            </Boton>
          </form>
        }
      >
        {lista.cargando && !lista.datos && <Cargando />}
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {lista.datos && lista.datos.length === 0 && <Vacio titulo="No hay partes con esa búsqueda" />}
        {lista.datos && lista.datos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">Nombre</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">CUIT/CUIL</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Personería</th>
                  <th scope="col" className="py-2 font-semibold">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{p.nombre}</td>
                    <td className="py-2 pr-3">{p.cuit_cuil || "—"}</td>
                    <td className="py-2 pr-3">{p.tipo_personeria === "fisica" ? "Física" : "Jurídica"}</td>
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
