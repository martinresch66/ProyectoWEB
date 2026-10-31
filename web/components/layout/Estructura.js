"use client";

// Estructura de las pantallas internas: menú lateral, barra superior y aviso de conexión.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConexion, useSesion } from "@/components/Proveedores";
import { Boton, Cargando, EnlaceBoton } from "@/components/ui/basicos";
import Dialogo from "@/components/ui/Dialogo";
import { ROLES } from "@/lib/dominio";
import { puedeAdministrarUsuarios, puedeGestionarCatalogos, puedeRevisar } from "@/lib/permisos";
import { alertas } from "@/lib/api/servicios";
import { borrarTodoLoLocal } from "@/lib/db/offline";

function enlacesPara(usuario) {
  return [
    { href: "/", texto: "Panel" },
    { href: "/convenios", texto: "Convenios" },
    puedeRevisar(usuario) && { href: "/revision", texto: "Revisión" },
    { href: "/plazos", texto: "Plazos" },
    { href: "/avisos", texto: "Avisos" },
    puedeGestionarCatalogos(usuario) && { href: "/partes", texto: "Partes" },
    puedeGestionarCatalogos(usuario) && { href: "/personas", texto: "Personas" },
    puedeAdministrarUsuarios(usuario) && { href: "/usuarios", texto: "Usuarios" },
    puedeGestionarCatalogos(usuario) && { href: "/pendientes", texto: "Pendientes" },
  ].filter(Boolean);
}

function estaActivo(ruta, href) {
  return href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`);
}

function MenuLateral({ usuario, pendientes, abierto }) {
  const ruta = usePathname();
  return (
    <nav
      id="menu-principal"
      aria-label="Principal"
      className={`${abierto ? "flex" : "hidden"} w-full flex-col gap-1 border-b border-gray-200 bg-white px-4 py-4 md:flex md:min-h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0 md:py-6`}
    >
      <Link href="/" className="mb-4 hidden items-center gap-3 px-2 md:flex">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
          CU
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-bold">Convenios</span>
          <span className="text-xs text-gray-600">UNLPam</span>
        </span>
      </Link>
      {enlacesPara(usuario).map((e) => {
        const activo = estaActivo(ruta, e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-11 items-center justify-between rounded-lg px-3 text-sm ${activo ? "bg-blue-50 font-semibold text-blue-700" : "font-medium text-gray-700 hover:bg-gray-50"}`}
          >
            {e.texto}
            {e.href === "/pendientes" && pendientes > 0 && (
              <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs font-semibold text-white">{pendientes}</span>
            )}
          </Link>
        );
      })}
      <div className="mt-4 flex flex-col gap-0.5 border-t border-gray-200 px-3 pt-4 md:mt-auto">
        <span className="text-sm font-semibold">{usuario.nombre}</span>
        <span className="text-xs text-gray-600">
          {ROLES[usuario.rol] || usuario.rol} · {usuario.unidad?.nombre || (usuario.unidad_id ? `Unidad ${usuario.unidad_id}` : "Alcance global")}
        </span>
      </div>
    </nav>
  );
}

function BarraSuperior({ alAbrirMenu, menuAbierto }) {
  const { enLinea, simulado, pendientes } = useConexion();
  const { usuario, cerrarSesion } = useSesion();
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const router = useRouter();
  const ruta = usePathname();
  const [noLeidas, setNoLeidas] = useState(0);

  // Se precarga el login para poder cerrar sesión aunque se corte la conexión.
  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  useEffect(() => {
    let activo = true;
    alertas.listar().then(
      (lista) => {
        if (activo) setNoLeidas(lista.filter((a) => !a.leida).length);
      },
      () => {},
    );
    return () => {
      activo = false;
    };
  }, [ruta, usuario?.id]);

  async function salir(confirmado = false) {
    if (pendientes > 0 && !confirmado) {
      setConfirmarSalida(true);
      return;
    }
    setConfirmarSalida(false);
    await cerrarSesion();
    router.replace("/login");
  }

  async function reiniciar() {
    const { reiniciarDatosSimulados } = await import("@/lib/api/mock/servidor");
    reiniciarDatosSimulados();
    await borrarTodoLoLocal();
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={alAbrirMenu}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 md:hidden"
        >
          <span className="sr-only">Menú</span>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${enLinea ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${enLinea ? "bg-green-600" : "bg-amber-600"}`} />
          {enLinea ? "En línea" : "Sin conexión"}
        </span>
        {simulado && (
          <span className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
            Datos simulados
            <button type="button" onClick={reiniciar} className="underline hover:no-underline">
              reiniciar
            </button>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/avisos"
          className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          aria-label={noLeidas ? `Avisos, ${noLeidas} sin leer` : "Avisos"}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {noLeidas > 0 && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold text-white">
              {noLeidas}
            </span>
          )}
        </Link>
        <Boton variante="secundario" onClick={() => salir()}>
          Cerrar sesión
        </Boton>
      </div>
      <Dialogo
        abierto={confirmarSalida}
        alCerrar={() => setConfirmarSalida(false)}
        titulo="Tenés cambios sin enviar"
        acciones={
          <>
            <EnlaceBoton href="/pendientes" variante="secundario" onClick={() => setConfirmarSalida(false)}>
              Ver pendientes
            </EnlaceBoton>
            <Boton variante="peligro" onClick={() => salir(true)}>
              Cerrar sesión igual
            </Boton>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          {pendientes === 1
            ? "Hay 1 cambio guardado en esta compu que todavía no llegó al servidor. Si cerrás sesión ahora, se borra."
            : `Hay ${pendientes} cambios guardados en esta compu que todavía no llegaron al servidor. Si cerrás sesión ahora, se borran.`}
        </p>
      </Dialogo>
    </div>
  );
}

function AvisoConexion() {
  const { enLinea, pendientes, sincronizando, sincronizar } = useConexion();
  if (enLinea && pendientes === 0) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 md:px-8">
      <span>
        {enLinea ? (
          <>Hay {pendientes} cambio(s) guardados en este equipo esperando para enviarse.</>
        ) : (
          <>
            <strong>Sin conexión.</strong> Podés consultar lo que ya abriste y editar borradores: los cambios se guardan en este equipo y se envían al volver la conexión.
          </>
        )}
      </span>
      <span className="flex items-center gap-3">
        {pendientes > 0 && (
          <Link href="/pendientes" className="font-semibold underline">
            Ver pendientes ({pendientes})
          </Link>
        )}
        {enLinea && pendientes > 0 && (
          <Boton variante="secundario" onClick={sincronizar} cargando={sincronizando}>
            Sincronizar ahora
          </Boton>
        )}
      </span>
    </div>
  );
}

export default function Estructura({ children }) {
  const { usuario, listo } = useSesion();
  const { pendientes } = useConexion();
  const router = useRouter();
  const ruta = usePathname();
  const [menu, setMenu] = useState({ abierto: false, ruta });

  // Cerrar el menú del celular al navegar.
  const menuAbierto = menu.abierto && menu.ruta === ruta;

  useEffect(() => {
    if (listo && !usuario) router.replace("/login");
  }, [listo, usuario, router]);

  if (!listo || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Cargando texto="Verificando la sesión…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#contenido" className="sr-only z-50 rounded bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Saltar al contenido
      </a>
      <MenuLateral usuario={usuario} pendientes={pendientes} abierto={menuAbierto} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior menuAbierto={menuAbierto} alAbrirMenu={() => setMenu({ abierto: !menuAbierto, ruta })} />
        <AvisoConexion />
        <main id="contenido" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
