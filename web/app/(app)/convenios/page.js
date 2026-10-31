"use client";

import { useState } from "react";
import { useAvisos, useSesion } from "@/components/Proveedores";
import { AvisoCopiaLocal, Boton, Cargando, EncabezadoPagina, EnlaceBoton, ErrorCarga, Paginacion, Vacio } from "@/components/ui/basicos";
import { Campo, Selector, opcionesDe } from "@/components/ui/formulario";
import TablaConvenios from "@/components/convenios/TablaConvenios";
import { useDatos } from "@/hooks/useDatos";
import { convenios, unidades } from "@/lib/api/servicios";
import { POR_PAGINA } from "@/lib/api/config";
import { mensajeDeError } from "@/lib/api/errores";
import { ESTADOS, FILTROS_VIGENCIA, TIPOS } from "@/lib/dominio";
import { esGlobal, puedeCrearConvenio } from "@/lib/permisos";

const FILTROS_VACIOS = { texto: "", tipo: "", estado: "", unidad_id: "", vigencia: "", desde: "", hasta: "" };

export default function PaginaConvenios() {
  const { usuario } = useSesion();
  const avisar = useAvisos();
  const [formulario, setFormulario] = useState(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  const listado = useDatos(() => convenios.listar(aplicados, pagina), JSON.stringify({ aplicados, pagina }));
  const listaUnidades = useDatos(() => unidades.listar(), "unidades");

  function cambiar(campo, valor, aplicarYa = false) {
    const nuevos = { ...formulario, [campo]: valor };
    setFormulario(nuevos);
    if (aplicarYa) {
      setAplicados(nuevos);
      setPagina(1);
    }
  }

  function buscar(evento) {
    evento.preventDefault();
    setAplicados(formulario);
    setPagina(1);
  }

  function limpiar() {
    setFormulario(FILTROS_VACIOS);
    setAplicados(FILTROS_VACIOS);
    setPagina(1);
  }

  async function exportar() {
    setExportando(true);
    try {
      await convenios.exportarCsv(aplicados);
    } catch (e) {
      avisar(`No se pudo exportar: ${mensajeDeError(e)}`, "error");
    } finally {
      setExportando(false);
    }
  }

  const opcionesUnidad = (listaUnidades.datos || []).map((u) => ({ valor: String(u.id), texto: u.nombre }));
  const { datos, cargando, error, desdeCache, recargar } = listado;

  return (
    <>
      <EncabezadoPagina
        titulo="Convenios"
        descripcion="Registro de los instrumentos dentro de tu alcance"
        acciones={
          <>
            <Boton variante="secundario" onClick={exportar} cargando={exportando}>
              Exportar CSV
            </Boton>
            {puedeCrearConvenio(usuario) && <EnlaceBoton href="/convenios/nuevo">Nuevo convenio</EnlaceBoton>}
          </>
        }
      />
      <AvisoCopiaLocal visible={desdeCache} />

      <form role="search" aria-label="Filtrar convenios" onSubmit={buscar} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Campo
            className="min-w-64 flex-1"
            etiqueta="Buscar por código, título o resumen"
            type="search"
            placeholder="Ej.: CONV-2026 o SmartCity"
            value={formulario.texto}
            onChange={(e) => cambiar("texto", e.target.value)}
          />
          <Boton type="submit">Buscar</Boton>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Selector etiqueta="Tipo" vacio="Todos" opciones={opcionesDe(TIPOS)} value={formulario.tipo} onChange={(e) => cambiar("tipo", e.target.value, true)} />
          <Selector etiqueta="Estado" vacio="Todos" opciones={opcionesDe(ESTADOS)} value={formulario.estado} onChange={(e) => cambiar("estado", e.target.value, true)} />
          {esGlobal(usuario) && (
            <Selector etiqueta="Unidad" vacio="Todas" opciones={opcionesUnidad} value={formulario.unidad_id} onChange={(e) => cambiar("unidad_id", e.target.value, true)} />
          )}
          <Selector etiqueta="Vigencia" vacio="Todas" opciones={opcionesDe(FILTROS_VIGENCIA)} value={formulario.vigencia} onChange={(e) => cambiar("vigencia", e.target.value, true)} />
          <Campo etiqueta="Inicio desde" type="date" value={formulario.desde} onChange={(e) => cambiar("desde", e.target.value, true)} />
          <Campo etiqueta="Inicio hasta" type="date" value={formulario.hasta} onChange={(e) => cambiar("hasta", e.target.value, true)} />
        </div>
        <div className="flex justify-end">
          <Boton variante="texto" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        </div>
      </form>

      <section aria-label="Resultados" aria-busy={cargando} className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <p className="text-sm font-semibold" aria-live="polite">
            {datos ? `${datos.total} ${datos.total === 1 ? "convenio" : "convenios"}` : " "}
          </p>
          {cargando && datos && <span className="text-sm text-gray-600">Actualizando…</span>}
        </div>
        {cargando && !datos && <Cargando texto="Cargando convenios…" />}
        {error && <ErrorCarga error={error} alReintentar={recargar} />}
        {datos && !error && datos.items.length === 0 && (
          <Vacio
            titulo="No hay convenios con estos filtros"
            descripcion="Probá con otro tipo, estado o rango de fechas."
            accion={
              <Boton variante="secundario" onClick={limpiar} className="mt-2">
                Limpiar filtros
              </Boton>
            }
          />
        )}
        {datos && !error && datos.items.length > 0 && (
          <>
            <TablaConvenios convenios={datos.items} />
            <Paginacion pagina={datos.pagina} ultimaPagina={datos.ultimaPagina} total={datos.total} porPagina={POR_PAGINA} alCambiar={setPagina} />
          </>
        )}
      </section>
    </>
  );
}
