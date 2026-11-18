"use client";

import { useParams } from "next/navigation";
import { useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Cargando, EncabezadoPagina, EnlaceBoton, ErrorCarga, InsigniaEstado, InsigniaVigencia, Nota, Tarjeta } from "@/components/ui/basicos";
import Pestanas from "@/components/ui/Pestanas";
import AccionesEstado from "@/components/convenios/AccionesEstado";
import Documentos from "@/components/convenios/Documentos";
import Observaciones from "@/components/convenios/Observaciones";
import Vinculos from "@/components/convenios/Vinculos";
import { useDatos } from "@/hooks/useDatos";
import { convenios } from "@/lib/api/servicios";
import {
  CAMPOS_FICHA_EXTRA,
  ESTADOS,
  TIPOS,
  formatearFecha,
  formatearFechaHora,
  formatearMonto,
  nombrePersona,
  restarDias,
} from "@/lib/dominio";
import { puedeEditarConvenio } from "@/lib/permisos";

// Componente auxiliar para renderizar un dato de la ficha con un título y un valor.
// Se usa en varias secciones para mantener un formato consistente en los campos.
function Dato({ titulo, children }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-gray-600">{titulo}</dt>
      <dd className="text-sm whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}

// Muestra el bloque principal de información del convenio: resumen, tipo, unidad,
// campos extra definidos por el dominio y datos de fechas/plazos.
function Datos({ convenio }) {
  // Se muestran solo los campos extra que tengan valor para este convenio.
  const extras = Object.entries(CAMPOS_FICHA_EXTRA).filter(([clave]) => convenio.extras?.[clave]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Tarjeta className="lg:col-span-2">
        <dl className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Dato titulo="Resumen">{convenio.resumen}</Dato>
          </div>
          <Dato titulo="Tipo">{TIPOS[convenio.tipo]}</Dato>
          <Dato titulo="Unidad responsable">{convenio.unidad?.nombre}</Dato>
          {extras.map(([clave, etiqueta]) => (
            <Dato key={clave} titulo={etiqueta}>
              {String(convenio.extras[clave])}
            </Dato>
          ))}
          <Dato titulo="Creado por">{convenio.creador_nombre}</Dato>
          <Dato titulo="Versión">{convenio.version}</Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Plazos">
        <dl className="flex flex-col gap-3">
          <Dato titulo="Inicio">{formatearFecha(convenio.fecha_inicio)}</Dato>
          <Dato titulo="Vencimiento">{convenio.fecha_fin ? formatearFecha(convenio.fecha_fin) : "Sin vencimiento registrado"}</Dato>
          <Dato titulo="Días de preaviso">{convenio.dias_preaviso}</Dato>
          {convenio.fecha_fin && <Dato titulo="Las alertas empiezan">{formatearFecha(restarDias(convenio.fecha_fin, convenio.dias_preaviso))}</Dato>}
          <Dato titulo="Vigencia">
            <InsigniaVigencia convenio={convenio} />
          </Dato>
        </dl>
      </Tarjeta>
    </div>
  );
}

// Muestra las partes del convenio (instituciones) y las personas vinculadas.
// La propiedad verContacto controla si se revela información sensible (email, DNI, teléfono).
function PartesYPersonas({ convenio, verContacto }) {
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo={`Partes (${convenio.partes.length})`}>
        {convenio.partes.length === 0 ? (
          <p className="text-sm text-gray-600">Sin partes cargadas. Para aprobar hacen falta al menos 2.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">Institución</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Rol en el convenio</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">CUIT</th>
                  {verContacto && <th scope="col" className="py-2 font-semibold">Contacto</th>}
                </tr>
              </thead>
              <tbody>
                {convenio.partes.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{p.nombre}</td>
                    <td className="py-2 pr-3">{p.rol_en_convenio || "—"}</td>
                    <td className="py-2 pr-3">{p.cuit_cuil || "—"}</td>
                    {verContacto && <td className="py-2">{[p.email, p.telefono].filter(Boolean).join(" · ") || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Personas vinculadas (${convenio.personas.length})`}>
        {convenio.personas.length === 0 ? (
          <p className="text-sm text-gray-600">Sin personas vinculadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">Persona</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Rol</th>
                  {verContacto && <th scope="col" className="py-2 pr-3 font-semibold">DNI</th>}
                  {verContacto && <th scope="col" className="py-2 font-semibold">Contacto</th>}
                </tr>
              </thead>
              <tbody>
                {convenio.personas.map((p) => (
                  <tr key={`${p.id}-${p.rol}`} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{nombrePersona(p)}</td>
                    <td className="py-2 pr-3">{p.rol || "—"}</td>
                    {verContacto && <td className="py-2 pr-3">{p.dni || "—"}</td>}
                    {verContacto && <td className="py-2">{[p.email, p.telefono].filter(Boolean).join(" · ") || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

// Vista específica para convenios de tipo pasantía.
// Muestra la información académica y de supervisión del estudiante/institución.
function Pasantia({ detalle, verContacto }) {
  if (!detalle) return <p className="text-sm text-gray-600">Todavía no se cargaron los datos de la pasantía.</p>;

  return (
    <Tarjeta>
      <dl className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Dato titulo="Estudiante">{nombrePersona(detalle.estudiante)}</Dato>
        <Dato titulo="Tutor académico (UNLPam)">{detalle.tutor_academico ? nombrePersona(detalle.tutor_academico) : "Sin asignar"}</Dato>
        <Dato titulo="Tutor de la institución">{detalle.tutor_institucion ? nombrePersona(detalle.tutor_institucion) : "Sin asignar"}</Dato>
        <Dato titulo="Carrera">{detalle.carrera}</Dato>
        <Dato titulo="Horas semanales">{detalle.horas_semanales}</Dato>
        {verContacto && <Dato titulo="Asignación estímulo mensual">{formatearMonto(detalle.monto_estimulo)}</Dato>}
        {verContacto && <Dato titulo="Aseguradora">{detalle.aseguradora}</Dato>}
        {verContacto && <Dato titulo="Número de póliza">{detalle.numero_poliza}</Dato>}
      </dl>
    </Tarjeta>
  );
}

// Lista cronológica de los cambios de estado del convenio.
// Muestra estado anterior, nuevo estado y motivo del cambio.
function Historial({ transiciones }) {
  if (!transiciones.length) return <p className="text-sm text-gray-600">Sin movimientos registrados.</p>;

  return (
    <ol className="flex flex-col gap-3">
      {transiciones.map((t) => (
        <li key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <p className="font-semibold">
            {t.estado_anterior ? `${ESTADOS[t.estado_anterior]} → ` : ""}
            {ESTADOS[t.estado_nuevo]}
          </p>
          <p className="text-gray-600">
            {formatearFechaHora(t.creado_en)}
            {t.usuario_nombre ? ` · ${t.usuario_nombre}` : ""}
          </p>
          <p className="mt-1">{t.motivo}</p>
        </li>
      ))}
    </ol>
  );
}

// Componente principal de la ficha del convenio.
// Se encarga de cargar el convenio por ID, decidir qué pestañas mostrar y mostrar
// la cabecera con estado, permisos y acciones según corresponda.
export default function PaginaFicha() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { datos: convenio, cargando, error, desdeCache, recargar } = useDatos(() => convenios.obtener(id), `ficha-${id}`);

  // Estado de carga inicial: mostrar pantalla de espera mientras llega el convenio.
  if (cargando && !convenio) return <Cargando texto="Cargando la ficha…" />;
  // Error al consultar la API: mostrar bloque de error con opción de reintentar.
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;
  // Si no se cargó ningún dato, no renderizar nada.
  if (!convenio) return null;

  // Los usuarios con rol 'consulta' no ven datos de contacto sensibles.
  const verContacto = usuario.rol !== "consulta";
  const pendientes = convenio.observaciones.filter((o) => !o.esta_resuelta).length;

  // Definimos las pestañas dinámicamente según el tipo de convenio y los recursos disponibles.
  const pestanas = [
    { id: "datos", titulo: "Datos", contenido: <Datos convenio={convenio} /> },
    { id: "partes", titulo: `Partes y personas (${convenio.partes.length + convenio.personas.length})`, contenido: <PartesYPersonas convenio={convenio} verContacto={verContacto} /> },
    convenio.tipo === "pasantia" && { id: "pasantia", titulo: "Pasantía", contenido: <Pasantia detalle={convenio.detalle_pasantia} verContacto={verContacto} /> },
    { id: "vinculos", titulo: `Vínculos (${convenio.vinculos.length})`, contenido: <Vinculos convenio={convenio} alCambiar={recargar} /> },
    { id: "documentos", titulo: `Documentos (${convenio.documentos.length})`, contenido: <Documentos convenio={convenio} alCambiar={recargar} /> },
    { id: "observaciones", titulo: `Observaciones${pendientes ? ` (${pendientes} pendientes)` : ""}`, contenido: <Observaciones convenio={convenio} alCambiar={recargar} /> },
    { id: "historial", titulo: "Historial", contenido: <Historial transiciones={convenio.transiciones} /> },
  ].filter(Boolean);

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Convenios", href: "/convenios" }, { texto: convenio.codigo }]}
        titulo={convenio.titulo}
        descripcion={`${convenio.codigo} · ${TIPOS[convenio.tipo]} · ${convenio.unidad?.nombre || ""}`}
        acciones={
          // Solo se permite editar si el usuario tiene permisos y el convenio está en estado editable.
          puedeEditarConvenio(usuario, convenio) && (
            <EnlaceBoton href={`/convenios/${convenio.id}/editar`} variante="secundario">
              Editar borrador
            </EnlaceBoton>
          )
        }
      />

      <AvisoCopiaLocal visible={desdeCache} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InsigniaEstado estado={convenio.estado} />
          <InsigniaVigencia convenio={convenio} />
        </div>
        <AccionesEstado convenio={convenio} alCambiar={recargar} />
      </div>

      {/* Si el convenio ya está firmado, rescindido o archivado, se informa que no debe editarse directamente. */}
      {['firmado', 'rescindido', 'archivado'].includes(convenio.estado) && (
        <Nota>Este convenio ya no se edita. Los cambios de fondo se hacen con una adenda o una renovación vinculada.</Nota>
      )}

      <Pestanas etiqueta="Secciones de la ficha" pestanas={pestanas} />
    </>
  );
}
