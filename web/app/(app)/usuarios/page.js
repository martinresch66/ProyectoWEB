"use client";

// Administración de usuarios (solo rol admin): alta, rol, unidad y habilitación.

import { useState } from "react";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { Boton, Cargando, EncabezadoPagina, ErrorCarga, SinPermiso, Tarjeta } from "@/components/ui/basicos";
import { Campo, ResumenErrores, Selector, opcionesDe } from "@/components/ui/formulario";
import { useDatos } from "@/hooks/useDatos";
import { unidades, usuarios } from "@/lib/api/servicios";
import { ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { ROLES } from "@/lib/dominio";
import { puedeAdministrarUsuarios } from "@/lib/permisos";

const VACIO = { nombre: "", email: "", rol: "consulta", unidad_id: "", password: "" };
const ETIQUETAS = { nombre: "Nombre", email: "Email", rol: "Rol", unidad_id: "Unidad", password: "Contraseña inicial" };

function FilaUsuario({ u, opcionesUnidad, esYo, alGuardado }) {
  const avisar = useAvisos();
  const [rol, setRol] = useState(u.rol);
  const [unidad, setUnidad] = useState(u.unidad_id ? String(u.unidad_id) : "");
  const [guardando, setGuardando] = useState(false);
  const cambio = rol !== u.rol || unidad !== (u.unidad_id ? String(u.unidad_id) : "");

  async function guardar(datosExtra = {}) {
    setGuardando(true);
    try {
      await usuarios.actualizar(u.id, { nombre: u.nombre, email: u.email, rol, unidad_id: rol === "admin" || !unidad ? null : Number(unidad), activo: u.activo, ...datosExtra });
      avisar(`Se actualizó a ${u.nombre}.`);
      alGuardado();
    } catch (e) {
      avisar(e instanceof ErrorValidacion ? Object.values(e.campos).join(" ") : mensajeDeError(e), "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <tr className="border-b border-gray-100 align-middle">
      <td className="py-3 pr-3">
        <span className="block font-medium">{u.nombre}</span>
        <span className="text-xs text-gray-600">{u.email}</span>
      </td>
      <td className="py-3 pr-3">
        <label className="sr-only" htmlFor={`rol-${u.id}`}>
          Rol de {u.nombre}
        </label>
        <select id={`rol-${u.id}`} value={rol} onChange={(e) => setRol(e.target.value)} disabled={esYo} className="min-h-11 rounded-lg border border-gray-300 bg-white px-2 text-sm">
          {Object.entries(ROLES).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-3">
        <label className="sr-only" htmlFor={`unidad-${u.id}`}>
          Unidad de {u.nombre}
        </label>
        <select id={`unidad-${u.id}`} value={rol === "admin" ? "" : unidad} onChange={(e) => setUnidad(e.target.value)} disabled={rol === "admin"} className="min-h-11 max-w-56 rounded-lg border border-gray-300 bg-white px-2 text-sm">
          <option value="">Alcance global</option>
          {opcionesUnidad.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{u.activo ? "Activo" : "Deshabilitado"}</span>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          {cambio && (
            <Boton onClick={() => guardar()} cargando={guardando}>
              Guardar
            </Boton>
          )}
          {!esYo && (
            <Boton variante="secundario" onClick={() => guardar({ activo: !u.activo })} disabled={guardando}>
              {u.activo ? "Deshabilitar" : "Habilitar"}
            </Boton>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function PaginaUsuarios() {
  const { usuario } = useSesion();
  const avisar = useAvisos();
  const lista = useDatos(() => usuarios.listar(), "usuarios");
  const listaUnidades = useDatos(() => unidades.listar(), "unidades");
  const [nuevo, setNuevo] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  if (!puedeAdministrarUsuarios(usuario)) return <SinPermiso />;

  const opcionesUnidad = (listaUnidades.datos || []).map((u) => ({ valor: String(u.id), texto: u.nombre }));
  const poner = (campo) => (e) => setNuevo({ ...nuevo, [campo]: e.target.value });

  async function crear(evento) {
    evento.preventDefault();
    const e = {};
    if (nuevo.nombre.trim().length < 3) e.nombre = "Indicá el nombre.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo.email)) e.email = "El email no es válido.";
    if (nuevo.password.length < 8) e.password = "Al menos 8 caracteres.";
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      const creado = await usuarios.crear({ ...nuevo, nombre: nuevo.nombre.trim(), email: nuevo.email.trim(), unidad_id: nuevo.rol === "admin" || !nuevo.unidad_id ? null : Number(nuevo.unidad_id) });
      avisar(`Se creó el usuario ${creado.email}.`);
      setNuevo(VACIO);
      lista.recargar();
    } catch (error) {
      setErrores(error instanceof ErrorValidacion ? error.campos : { nombre: mensajeDeError(error) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" descripcion="Cuentas, roles y alcance. Sin unidad significa alcance global." />

      <Tarjeta titulo="Usuarios del sistema">
        {lista.cargando && !lista.datos && <Cargando />}
        {lista.error && <ErrorCarga error={lista.error} alReintentar={lista.recargar} />}
        {lista.datos && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">Usuario</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Rol</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Unidad</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Estado</th>
                  <th scope="col" className="py-2 font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.datos.map((u) => (
                  <FilaUsuario key={`${u.id}-${u.rol}-${u.unidad_id}-${u.activo}`} u={u} opcionesUnidad={opcionesUnidad} esYo={u.id === usuario.id} alGuardado={lista.recargar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Crear un usuario">
        <form onSubmit={crear} noValidate className="flex flex-col gap-4">
          <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo id="campo-nombre" etiqueta="Nombre y apellido" value={nuevo.nombre} onChange={poner("nombre")} error={errores.nombre} obligatorio />
            <Campo id="campo-email" etiqueta="Email institucional" type="email" value={nuevo.email} onChange={poner("email")} error={errores.email} obligatorio />
            <Campo id="campo-password" etiqueta="Contraseña inicial" type="password" autoComplete="new-password" value={nuevo.password} onChange={poner("password")} error={errores.password} ayuda="Al menos 8 caracteres." obligatorio />
            <Selector id="campo-rol" etiqueta="Rol" opciones={opcionesDe(ROLES)} value={nuevo.rol} onChange={poner("rol")} error={errores.rol} />
            <Selector
              id="campo-unidad_id"
              etiqueta="Unidad"
              vacio="Alcance global"
              opciones={opcionesUnidad}
              value={nuevo.rol === "admin" ? "" : nuevo.unidad_id}
              onChange={poner("unidad_id")}
              disabled={nuevo.rol === "admin"}
              error={errores.unidad_id}
              ayuda={nuevo.rol === "admin" ? "Administración siempre tiene alcance global." : undefined}
            />
          </div>
          <Boton type="submit" cargando={guardando} className="self-start">
            Crear usuario
          </Boton>
        </form>
      </Tarjeta>
    </>
  );
}
