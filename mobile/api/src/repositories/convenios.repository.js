import { db } from '../data/db.js';
import { unidadesRepository } from './unidades.repository.js';
import { usuariosRepository } from './usuarios.repository.js';

const masNuevoPrimero = (a, b) => b.creado_en.localeCompare(a.creado_en);

function persona(id) {
  return db.personas.find((p) => p.id === id) ?? null;
}

function resumen(c) {
  return c ? { id: c.id, codigo: c.codigo, titulo: c.titulo, tipo: c.tipo, estado: c.estado } : null;
}

/**
 * Repositorio de convenios: única capa que accede a las tablas de convenios y sus relaciones.
 * Arma el JSON con la misma forma que devolvería Laravel (snake_case, relaciones anidadas, pivot).
 */
export const conveniosRepository = {
  findAll() {
    return db.convenios;
  },

  findById(id) {
    return db.convenios.find((c) => c.id === Number(id)) ?? null;
  },

  /** Convenio con su unidad: forma de cada ítem del listado (§4 GET /agreements). */
  conUnidad(c) {
    return { ...c, unidad: unidadesRepository.findById(c.unidad_id) };
  },

  /** Ficha completa con relaciones (§4 GET /agreements/{id}). */
  ficha(c) {
    const detalle = db.detalles_pasantia.find((d) => d.convenio_id === c.id);
    return {
      ...this.conUnidad(c),
      creador: usuariosRepository.resumen(c.creado_por),
      partes: db.partes_convenio
        .filter((pc) => pc.convenio_id === c.id)
        .map((pc) => ({ ...db.partes.find((p) => p.id === pc.parte_id), pivot: { rol_en_convenio: pc.rol_en_convenio } })),
      personas: db.personas_convenio
        .filter((pc) => pc.convenio_id === c.id)
        .map((pc) => ({ ...persona(pc.persona_id), pivot: { rol: pc.rol } })),
      detalle_pasantia: detalle
        ? {
            ...detalle,
            estudiante: persona(detalle.estudiante_persona_id),
            tutor_academico: persona(detalle.tutor_academico_persona_id),
            tutor_institucion: persona(detalle.tutor_institucion_persona_id),
          }
        : null,
      vinculos_origen: db.vinculos_convenio
        .filter((v) => v.convenio_origen_id === c.id)
        .map((v) => ({ ...v, convenio_destino: resumen(this.findById(v.convenio_destino_id)) })),
      vinculos_destino: db.vinculos_convenio
        .filter((v) => v.convenio_destino_id === c.id)
        .map((v) => ({ ...v, convenio_origen: resumen(this.findById(v.convenio_origen_id)) })),
      documentos: db.documentos
        .filter((d) => d.convenio_id === c.id)
        .sort(masNuevoPrimero)
        // eslint-disable-next-line no-unused-vars
        .map(({ ruta_archivo, ...d }) => ({ ...d, usuario: usuariosRepository.resumen(d.subido_por) })),
      transiciones: db.transiciones_estado
        .filter((t) => t.convenio_id === c.id)
        .sort(masNuevoPrimero)
        .map((t) => ({ ...t, usuario: usuariosRepository.resumen(t.cambiado_por) })),
      observaciones: db.observaciones_revision
        .filter((o) => o.convenio_id === c.id)
        .sort(masNuevoPrimero)
        .map((o) => ({ ...o, revisor: usuariosRepository.resumen(o.usuario_revisor_id) })),
    };
  },
};
