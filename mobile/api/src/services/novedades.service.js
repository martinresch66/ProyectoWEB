import { esVisible } from '../domain/dominio.js';
import { conveniosRepository } from '../repositories/convenios.repository.js';
import { movimientosRepository } from '../repositories/movimientos.repository.js';
import { novedadesRepository } from '../repositories/novedades.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { ROLES_QUE_FIRMAN } from './resumen.service.js';

/** Sin "desde" (pantalla Avisos) se devuelven las novedades de los últimos 7 días. */
const DIAS_POR_DEFECTO = 7;
const MAXIMO = 50;
/**
 * La API lee la base cada 2 s: "generado_en" se atrasa 10 s para que la próxima consulta no se saltee
 * nada que todavía no se había leído. La app descarta las repetidas por su id.
 */
const MARGEN_MS = 10000;

const ESTADOS = {
  borrador: 'Borrador',
  revision: 'En revisión',
  aprobado: 'Aprobado',
  firmado: 'Firmado',
  rescindido: 'Rescindido',
  archivado: 'Archivado',
};
const TIPOS_DOCUMENTO = {
  convenio_firmado: 'convenio firmado',
  anexo: 'anexo',
  dictamen: 'dictamen',
  resolucion: 'resolución',
  acta_pasantia: 'acta de pasantía',
  otro: 'otro',
};

const nombre = (usuarioId) => usuariosRepository.findById(usuarioId)?.nombre ?? 'Alguien';
const recortar = (texto, largo = 120) => {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return limpio.length > largo ? `${limpio.slice(0, largo - 1)}…` : limpio;
};
const resumen = (c) => ({ id: c.id, codigo: c.codigo, titulo: c.titulo, tipo: c.tipo, estado: c.estado });
const ms = (fecha) => new Date(fecha).getTime() || 0;

function leerDesde(valor) {
  if (valor === undefined || valor === '') return new Date(Date.now() - DIAS_POR_DEFECTO * 24 * 60 * 60 * 1000);
  const fecha = new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) {
    throw new HttpError(422, 'La fecha "desde" no es válida.', { desde: ['Usá una fecha ISO, ej: 2026-11-22T10:00:00Z.'] });
  }
  return fecha;
}

/**
 * Notificaciones vía API (T2): lo que pasó en los convenios que el usuario puede ver, después de "desde".
 * - nuevo_convenio: se registró un convenio.
 * - comentario: alguien comentó (si es ofensivo, se muestra "Comentario ofensivo").
 * - cambio_estado / cancelado: cambió el estado (rescindido = cancelado).
 * - documento / cambio_datos: se subió un documento o se modificaron los datos del convenio.
 * - alerta: avisos que el sistema dejó en la tabla notificaciones (ej: vencimientos).
 * No se avisa lo que hizo el propio usuario. Respeta el alcance por rol y unidad (esVisible).
 */
export const novedadesService = {
  listar(usuario, desdeParam) {
    const desde = leerDesde(desdeParam);
    const generadoEn = new Date(Date.now() - MARGEN_MS).toISOString();
    const visibles = new Map(
      conveniosRepository
        .findAll()
        .filter((c) => esVisible(usuario, c))
        .map((c) => [Number(c.id), c]),
    );
    const visible = (convenioId) => visibles.get(Number(convenioId));
    const deOtro = (autorId) => Number(autorId) !== Number(usuario.id);
    const novedades = [];

    for (const c of novedadesRepository.conveniosCreados(desde)) {
      if (!visible(c.id) || !deOtro(c.creado_por)) continue;
      novedades.push({
        id: `convenio-${c.id}`,
        tipo: 'nuevo_convenio',
        titulo: `Nuevo convenio: ${c.codigo}`,
        mensaje: `${nombre(c.creado_por)} registró "${recortar(c.titulo, 80)}".`,
        fecha: c.creado_en,
        convenio: resumen(c),
        destino: { pantalla: 'convenio', id: c.id },
      });
    }

    for (const cm of novedadesRepository.comentarios(desde)) {
      const c = visible(cm.convenio_id);
      if (!c || !deOtro(cm.usuario_id)) continue;
      novedades.push({
        id: `comentario-${cm.id}`,
        tipo: 'comentario',
        titulo: `Nuevo comentario en ${c.codigo}`,
        mensaje: `${nombre(cm.usuario_id)}: ${Number(cm.es_ofensivo) ? 'Comentario ofensivo' : recortar(cm.texto)}`,
        fecha: cm.creado_en,
        convenio: resumen(c),
        destino: { pantalla: 'comentarios', id: c.id },
      });
    }

    for (const t of novedadesRepository.transiciones(desde)) {
      const c = visible(t.convenio_id);
      if (!c || !deOtro(t.cambiado_por)) continue;
      const cancelado = t.estado_nuevo === 'rescindido';
      novedades.push({
        id: `estado-${t.id}`,
        tipo: cancelado ? 'cancelado' : 'cambio_estado',
        titulo: cancelado ? `Convenio cancelado: ${c.codigo}` : `${c.codigo} pasó a "${ESTADOS[t.estado_nuevo] ?? t.estado_nuevo}"`,
        mensaje: t.motivo ? `${nombre(t.cambiado_por)}: ${recortar(t.motivo)}` : `${nombre(t.cambiado_por)} cambió el estado.`,
        fecha: t.creado_en,
        convenio: resumen(c),
        destino: { pantalla: 'convenio', id: c.id },
      });
    }

    for (const d of novedadesRepository.documentos(desde)) {
      const c = visible(d.convenio_id);
      if (!c || !deOtro(d.subido_por)) continue;
      novedades.push({
        id: `documento-${d.id}`,
        tipo: 'documento',
        titulo: `Nuevo documento en ${c.codigo}`,
        mensaje: `${nombre(d.subido_por)} subió "${recortar(d.nombre_original, 80)}" (${TIPOS_DOCUMENTO[d.tipo_documento] ?? d.tipo_documento}).`,
        fecha: d.creado_en,
        convenio: resumen(c),
        destino: { pantalla: 'archivo', id: d.id },
      });
    }

    // Cambio de datos: se editó el convenio (ej: desde la web) sin un cambio de estado ni un documento que lo explique.
    // La tabla convenios no guarda quién lo editó, así que no se puede excluir al propio usuario.
    for (const c of novedadesRepository.conveniosActualizados(desde)) {
      if (!visible(c.id) || novedadesRepository.tieneMovimientoCerca(c.id, c.actualizado_en)) continue;
      novedades.push({
        id: `datos-${c.id}-${ms(c.actualizado_en)}`,
        tipo: 'cambio_datos',
        titulo: `Se actualizaron los datos de ${c.codigo}`,
        mensaje: `"${recortar(c.titulo, 80)}" (versión ${c.version}).`,
        fecha: c.actualizado_en,
        convenio: resumen(c),
        destino: { pantalla: 'convenio', id: c.id },
      });
    }

    for (const a of novedadesRepository.alertas(usuario.id, desde)) {
      const c = a.convenio_id ? visible(a.convenio_id) : null;
      novedades.push({
        id: `alerta-${a.id}`,
        tipo: 'alerta',
        titulo: a.titulo,
        mensaje: recortar(a.mensaje, 200),
        fecha: a.creado_en,
        convenio: c ? resumen(c) : null,
        destino: c ? { pantalla: 'convenio', id: c.id } : { pantalla: 'avisos', id: null },
      });
    }

    // Para el recordatorio "Aún tenés un convenio por firmar": cuántos esperan y desde cuándo (el más viejo).
    const porFirmar = ROLES_QUE_FIRMAN.includes(usuario.rol) ? [...visibles.values()].filter((c) => c.estado === 'aprobado') : [];
    const esperas = porFirmar
      .map((c) => movimientosRepository.fechaDeEstado(c.id, 'aprobado') ?? c.actualizado_en ?? c.creado_en)
      .filter(Boolean)
      .sort((a, b) => ms(a) - ms(b));

    return {
      generado_en: generadoEn,
      desde: desde.toISOString(),
      novedades: novedades.sort((a, b) => ms(b.fecha) - ms(a.fecha)).slice(0, MAXIMO),
      por_firmar: {
        cantidad: porFirmar.length,
        esperan_desde: esperas[0] ?? null,
        convenios: porFirmar.slice(0, 5).map(resumen),
      },
    };
  },
};