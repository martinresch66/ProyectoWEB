import { db } from '../data/db.js';
import { usuariosRepository } from './usuarios.repository.js';

const ms = (fecha) => new Date(fecha).getTime();

/**
 * Movimientos de los convenios: todo lo que le pasó a un convenio, en un solo formato.
 * Hoy junta los cambios de estado (tabla transiciones_estado) y los documentos subidos (tabla documentos).
 * Cuando se agreguen las firmas y los comentarios, se suman acá y el resto de la API no cambia.
 *
 * Forma de cada movimiento: { id, tipo, convenio_id, fecha, usuario, detalle }
 */
export const movimientosRepository = {
  findAll() {
    const cambiosDeEstado = db.transiciones_estado.map((t) => ({
      id: `estado-${t.id}`,
      tipo: 'estado',
      convenio_id: t.convenio_id,
      fecha: t.creado_en,
      usuario: usuariosRepository.resumen(t.cambiado_por),
      detalle: { estado_anterior: t.estado_anterior, estado_nuevo: t.estado_nuevo, motivo: t.motivo },
    }));

    const documentos = db.documentos.map((d) => ({
      id: `documento-${d.id}`,
      tipo: 'documento',
      convenio_id: d.convenio_id,
      fecha: d.creado_en,
      usuario: usuariosRepository.resumen(d.subido_por),
      detalle: { tipo_documento: d.tipo_documento, nombre_original: d.nombre_original },
    }));

    return [...cambiosDeEstado, ...documentos];
  },

  /** Fecha (ISO) de la última vez que el convenio pasó a `estado`, o null si no está registrada. */
  fechaDeEstado(convenioId, estado) {
    const fechas = db.transiciones_estado
      .filter((t) => t.convenio_id === convenioId && t.estado_nuevo === estado)
      .map((t) => t.creado_en)
      .sort((a, b) => ms(b) - ms(a));
    return fechas[0] ?? null;
  },
};