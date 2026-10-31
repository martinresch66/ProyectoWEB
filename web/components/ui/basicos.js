"use client";

// Piezas de interfaz reutilizables: botones, insignias, tarjetas y estados de pantalla.

import Link from "next/link";
import { ESTADOS, TIPOS, calcularVigencia } from "@/lib/dominio";
import { mensajeDeError, ErrorSinConexion, ErrorNoEncontrado } from "@/lib/api/errores";

// ---------- Botones ----------

const VARIANTES = {
  primario: "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-600",
  secundario: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-500",
  peligro: "bg-red-700 text-white hover:bg-red-800 disabled:bg-gray-200 disabled:text-gray-600",
  texto: "text-blue-700 hover:text-blue-900 hover:underline disabled:text-gray-500",
};

const BASE_BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export function Boton({ variante = "primario", className = "", cargando = false, children, disabled, ...props }) {
  return (
    <button type="button" className={`${BASE_BOTON} ${VARIANTES[variante]} ${className}`} disabled={disabled || cargando} aria-busy={cargando || undefined} {...props}>
      {cargando && <Spinner />}
      {children}
    </button>
  );
}

export function EnlaceBoton({ variante = "primario", className = "", href, children, ...props }) {
  return (
    <Link href={href} className={`${BASE_BOTON} ${VARIANTES[variante]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return <span aria-hidden="true" className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

// ---------- Insignias de estado, tipo y vigencia ----------

const COLOR_ESTADO = {
  borrador: "bg-gray-100 text-gray-700",
  revision: "bg-violet-50 text-violet-800",
  aprobado: "bg-blue-50 text-blue-800",
  firmado: "bg-green-100 text-green-800",
  rescindido: "bg-red-100 text-red-800",
  archivado: "bg-gray-700 text-white",
};

const COLOR_VIGENCIA = {
  vigente: "border-green-700 text-green-800",
  proximo: "border-amber-400 bg-amber-50 text-amber-900",
  vencido: "border-red-700 text-red-800",
  sin_vencimiento: "border-gray-400 text-gray-700",
  aun_no_vigente: "border-gray-400 text-gray-700",
};

export function InsigniaEstado({ estado }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[estado] || COLOR_ESTADO.borrador}`}>
      {ESTADOS[estado] || estado}
    </span>
  );
}

export function InsigniaVigencia({ convenio }) {
  const vigencia = calcularVigencia(convenio);
  if (!vigencia) return <span className="text-sm text-gray-600">—</span>;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COLOR_VIGENCIA[vigencia.clave]}`}>
      {vigencia.etiqueta}
    </span>
  );
}

export function TextoTipo({ tipo }) {
  return <span>{TIPOS[tipo] || tipo}</span>;
}

// ---------- Contenedores ----------

export function Tarjeta({ titulo, acciones, children, className = "", id }) {
  return (
    <section id={id} className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`} aria-label={typeof titulo === "string" ? titulo : undefined}>
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

export function EncabezadoPagina({ titulo, descripcion, acciones, migas }) {
  return (
    <header className="flex flex-col gap-3">
      {typeof titulo === "string" && <title>{`${titulo} · Convenios UNLPam`}</title>}
      {migas && (
        <nav aria-label="Migas de pan" className="flex flex-wrap gap-2 text-sm text-gray-600">
          {migas.map((m, i) => (
            <span key={m.texto} className="flex gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {m.href ? (
                <Link href={m.href} className="text-blue-700 hover:underline">
                  {m.texto}
                </Link>
              ) : (
                <span aria-current="page">{m.texto}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          {descripcion && <p className="text-sm text-gray-600">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </header>
  );
}

export function Nota({ tipo = "info", children, titulo }) {
  const estilos = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    alerta: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-900",
    exito: "border-green-300 bg-green-50 text-green-900",
  };
  return (
    <div role={tipo === "error" ? "alert" : "note"} className={`rounded-lg border px-4 py-3 text-sm ${estilos[tipo]}`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div>{children}</div>
    </div>
  );
}

// ---------- Estados de pantalla ----------

export function Cargando({ texto = "Cargando…" }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-sm text-gray-600">
      <Spinner className="h-5 w-5 text-blue-700" />
      {texto}
    </div>
  );
}

export function Vacio({ titulo, descripcion, accion }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descripcion && <p className="max-w-md text-sm text-gray-600">{descripcion}</p>}
      {accion}
    </div>
  );
}

export function ErrorCarga({ error, alReintentar }) {
  let titulo = "No pudimos cargar los datos";
  let descripcion = mensajeDeError(error);
  if (error instanceof ErrorSinConexion) {
    titulo = "Sin conexión";
    descripcion = "No hay conexión con el servidor y no hay una copia guardada en este equipo.";
  } else if (error instanceof ErrorNoEncontrado) {
    titulo = "No encontramos esto";
    descripcion = "Puede que no exista o que no esté dentro de tu unidad.";
  }
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <p className="max-w-md text-sm text-gray-600">{descripcion}</p>
      {alReintentar && (
        <Boton onClick={alReintentar} className="mt-2">
          Reintentar
        </Boton>
      )}
    </div>
  );
}

export function AvisoCopiaLocal({ visible }) {
  if (!visible) return null;
  return (
    <Nota tipo="alerta">
      Estás viendo la última copia guardada en este equipo porque no hay conexión. Algunas acciones necesitan conexión.
    </Nota>
  );
}

export function SinPermiso() {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">No tenés acceso a esta sección</h1>
      <p className="text-sm text-gray-600">Si creés que deberías verla, consultá con Administración.</p>
      <EnlaceBoton href="/" variante="secundario" className="mt-2">
        Volver al panel
      </EnlaceBoton>
    </div>
  );
}

// ---------- Paginación ----------

export function Paginacion({ pagina, ultimaPagina, total, alCambiar, porPagina }) {
  if (!total) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="text-sm text-gray-600">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex gap-2">
        <Boton variante="secundario" onClick={() => alCambiar(pagina - 1)} disabled={pagina <= 1}>
          Anterior
        </Boton>
        <span className="self-center px-2 text-sm text-gray-700">
          Página {pagina} de {ultimaPagina}
        </span>
        <Boton variante="secundario" onClick={() => alCambiar(pagina + 1)} disabled={pagina >= ultimaPagina}>
          Siguiente
        </Boton>
      </div>
    </nav>
  );
}
