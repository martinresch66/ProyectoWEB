import { calcularVigencia, esVisible, hoySinHora, leerFecha } from '../domain/dominio.js';
import { alertasRepository } from '../repositories/alertas.repository.js';
import { conveniosRepository } from '../repositories/convenios.repository.js';
import { movimientosRepository } from '../repositories/movimientos.repository.js';

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

/**
 * Datos de la pantalla de Inicio de la app. Todo se calcula sobre los convenios que el usuario
 * puede ver (mismo alcance por rol y unidad que GET /agreements), así nunca ve números de otras unidades.
 */
export const resumenService = {
  obtener(usuario) {
    const visibles = conveniosRepository.findAll().filter((c) => esVisible(usuario, c));
    const idsVisibles = new Set(visibles.map((c) => c.id));

    const haceUnAnio = hoySinHora();
    haceUnAnio.setFullYear(haceUnAnio.getFullYear() - 1);

    const totales = {
      firmados_ultimo_anio: visibles.filter((c) => {
        const fecha = aFecha(fechaDeFirma(c));
        return fecha !== null && fecha >= haceUnAnio;
      }).length,
      vigentes: visibles.filter((c) => VIGENTES.includes(calcularVigencia(c))).length,
      proximos_a_vencer: visibles.filter((c) => calcularVigencia(c) === 'proximo').length,
      en_tramite: visibles.filter((c) => EN_TRAMITE.includes(c.estado)).length,
      por_firmar: visibles.filter((c) => c.estado === 'aprobado').length,
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
    const pendientesFirma = puedeFirmar
      ? visibles
          .filter((c) => c.estado === 'aprobado')
          .map((c) => ({
            ...conveniosRepository.conUnidad(c),
            aprobado_en: movimientosRepository.fechaDeEstado(c.id, 'aprobado') ?? c.creado_en,
          }))
          .sort((a, b) => ms(b.aprobado_en) - ms(a.aprobado_en))
          .slice(0, MAX_PENDIENTES)
      : [];

    return {
      generado_en: new Date().toISOString(),
      totales,
      puede_firmar: puedeFirmar,
      pendientes_firma: pendientesFirma,
      ultimos_movimientos: ultimosMovimientos,
    };
  },
};