import { calcularVigencia, esVisible, hoySinHora, leerFecha } from '../domain/dominio.js';
import { alertasRepository } from '../repositories/alertas.repository.js';
import { conveniosRepository } from '../repositories/convenios.repository.js';
import { movimientosRepository } from '../repositories/movimientos.repository.js';
import { HttpError } from '../utils/HttpError.js';

const MAX_MOVIMIENTOS = 10;
const MAX_PENDIENTES = 10;
const EN_TRAMITE = ['borrador', 'revision', 'aprobado'];
const VIGENTES = ['vigente', 'proximo', 'sin_vencimiento'];

/** Roles que registran la firma (aprobado → firmado), igual que TRANSICIONES de web/lib/dominio.js. */
export const ROLES_QUE_FIRMAN = ['admin', 'gestion'];

/** "2026-03-15" (fecha sola) o "2026-03-15T12:00:00-03:00" (con hora) → Date. */
function aFecha(valor) {
  if (!valor) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? leerFecha(valor) : new Date(valor);
}

const ms = (valor) => aFecha(valor)?.getTime() ?? 0;

/** Ordena primero las fechas más cercanas; los que no tienen fecha van al final. */
const fechaAscendente = (campo) => (a, b) => (ms(a[campo]) || Infinity) - (ms(b[campo]) || Infinity);
const fechaDescendente = (campo) => (a, b) => ms(b[campo]) - ms(a[campo]);

function resumenConvenio(c) {
  const { id, codigo, titulo, tipo, estado } = c;
  return { id, codigo, titulo, tipo, estado };
}

/** Fecha de firma: la transición a "firmado"; si el seed no la tiene cargada, la fecha de inicio. */
function fechaDeFirma(c) {
  const registrada = movimientosRepository.fechaDeEstado(c.id, 'firmado');
  if (registrada) return registrada;
  return c.estado === 'firmado' ? c.fecha_inicio : null;
}

function haceUnAnio() {
  const fecha = hoySinHora();
  fecha.setFullYear(fecha.getFullYear() - 1);
  return fecha;
}

/**
 * Indicadores (boxes) del Inicio. Cada uno define qué convenios cuenta y cómo se listan al tocarlo:
 * el número del box y el listado salen de la MISMA condición, así nunca muestran cosas distintas.
 * - cumple: condición que tiene que cumplir el convenio.
 * - agregar: datos extra de cada ítem del listado (ej: la fecha de firma).
 * - orden: cómo se ordena el listado.
 */
const INDICADORES = {
  firmados: {
    titulo: 'Firmados en los últimos 12 meses',
    descripcion: 'Convenios firmados en el último año, del más reciente al más antiguo.',
    cumple: (c, ctx) => {
      const fecha = aFecha(fechaDeFirma(c));
      return fecha !== null && fecha >= ctx.haceUnAnio;
    },
    agregar: (c) => ({ firmado_en: fechaDeFirma(c) }),
    orden: fechaDescendente('firmado_en'),
  },
  vigentes: {
    titulo: 'Vigentes',
    descripcion: 'Convenios firmados que hoy están en vigencia. Primero los que vencen antes.',
    cumple: (c) => VIGENTES.includes(calcularVigencia(c)),
    orden: fechaAscendente('fecha_fin'),
  },
  proximos: {
    titulo: 'Próximos a vencer',
    descripcion: 'Convenios vigentes que entraron en el plazo de preaviso. Primero los que vencen antes.',
    cumple: (c) => calcularVigencia(c) === 'proximo',
    orden: fechaAscendente('fecha_fin'),
  },
  en_tramite: {
    titulo: 'En trámite',
    descripcion: 'Borradores, convenios en revisión y aprobados que todavía no se firmaron.',
    cumple: (c) => EN_TRAMITE.includes(c.estado),
    agregar: (c) => ({ ultimo_movimiento: movimientosRepository.ultimaFecha(c.id) ?? c.creado_en }),
    orden: fechaDescendente('ultimo_movimiento'),
  },
  por_firmar: {
    titulo: 'Esperando firma',
    descripcion: 'Convenios aprobados que esperan la firma, del más reciente al más antiguo.',
    cumple: (c) => c.estado === 'aprobado',
    agregar: (c) => ({ aprobado_en: movimientosRepository.fechaDeEstado(c.id, 'aprobado') ?? c.creado_en }),
    orden: fechaDescendente('aprobado_en'),
  },
};

/** Convenios que el usuario puede ver (mismo alcance por rol y unidad que GET /agreements). */
function visiblesPara(usuario) {
  return conveniosRepository.findAll().filter((c) => esVisible(usuario, c));
}

/** Convenios de un indicador, con sus datos extra y ordenados. */
function conveniosDe(indicador, visibles, ctx) {
  return visibles
    .filter((c) => indicador.cumple(c, ctx))
    .map((c) => ({ ...conveniosRepository.conUnidad(c), ...indicador.agregar?.(c) }))
    .sort(indicador.orden);
}

/**
 * Datos de la pantalla de Inicio de la app. Todo se calcula sobre los convenios que el usuario
 * puede ver, así nunca ve números de otras unidades.
 */
export const resumenService = {
  obtener(usuario) {
    const visibles = visiblesPara(usuario);
    const idsVisibles = new Set(visibles.map((c) => c.id));
    const ctx = { haceUnAnio: haceUnAnio() };
    const cuantos = (clave) => visibles.filter((c) => INDICADORES[clave].cumple(c, ctx)).length;

    const totales = {
      firmados_ultimo_anio: cuantos('firmados'),
      vigentes: cuantos('vigentes'),
      proximos_a_vencer: cuantos('proximos'),
      en_tramite: cuantos('en_tramite'),
      por_firmar: cuantos('por_firmar'),
      avisos_sin_leer: alertasRepository.findByUsuario(usuario.id).filter((a) => !Number(a.leida)).length,
    };

    // Últimos movimientos: un ítem por convenio (su movimiento más reciente), del más nuevo al más viejo.
    const ultimoPorConvenio = new Map();
    for (const m of movimientosRepository.findAll()) {
      if (!idsVisibles.has(m.convenio_id)) continue;
      const actual = ultimoPorConvenio.get(m.convenio_id);
      if (!actual || ms(m.fecha) > ms(actual.fecha)) ultimoPorConvenio.set(m.convenio_id, m);
    }
    const ultimosMovimientos = [...ultimoPorConvenio.values()]
      .sort((a, b) => ms(b.fecha) - ms(a.fecha))
      .slice(0, MAX_MOVIMIENTOS)
      // eslint-disable-next-line no-unused-vars
      .map(({ convenio_id, ...m }) => ({ ...m, convenio: resumenConvenio(conveniosRepository.findById(convenio_id)) }));

    // Mis pendientes: solo para quien puede registrar la firma. Los aprobados más recientes primero.
    const puedeFirmar = ROLES_QUE_FIRMAN.includes(usuario.rol);
    const pendientesFirma = puedeFirmar ? conveniosDe(INDICADORES.por_firmar, visibles, ctx).slice(0, MAX_PENDIENTES) : [];

    return {
      generado_en: new Date().toISOString(),
      totales,
      puede_firmar: puedeFirmar,
      pendientes_firma: pendientesFirma,
      ultimos_movimientos: ultimosMovimientos,
    };
  },

  /** Listado de un box del Inicio (GET /mobile/resumen/:indicador). */
  listar(usuario, clave) {
    const indicador = Object.hasOwn(INDICADORES, clave) ? INDICADORES[clave] : null;
    if (!indicador) {
      throw new HttpError(404, `No existe el indicador "${clave}". Opciones: ${Object.keys(INDICADORES).join(', ')}.`);
    }
    const convenios = conveniosDe(indicador, visiblesPara(usuario), { haceUnAnio: haceUnAnio() });
    return {
      indicador: clave,
      titulo: indicador.titulo,
      descripcion: indicador.descripcion,
      total: convenios.length,
      convenios,
    };
  },
};