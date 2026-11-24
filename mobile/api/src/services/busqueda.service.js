import { esVisible } from '../domain/dominio.js';
import { conveniosRepository } from '../repositories/convenios.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { conveniosService } from './convenios.service.js';

const ANIO = /^\d{4}$/;

/** Año de un convenio: el de su fecha de inicio o, si todavía no tiene, el de su carga. */
const anioDe = (c) => String(c.fecha_inicio ?? c.creado_en ?? '').slice(0, 4);

/**
 * Buscador avanzado de la app (GET /mobile/buscar).
 * Usa los mismos filtros que GET /agreements (q, tipo, estado, unidad_id, vigencia) más `anio`,
 * y devuelve los resultados como un árbol: convenio padre → convenios hijos, cada uno con sus
 * resoluciones asignadas y el resto de su documentación.
 */
export const busquedaService = {
  buscar(usuario, p = {}) {
    if (p.anio && !ANIO.test(String(p.anio))) {
      throw new HttpError(422, 'Hay filtros con valores inválidos.', { anio: ['El año tiene que tener 4 números (ej: 2026).'] });
    }

    const coinciden = conveniosService.filtrar(usuario, p).filter((c) => !p.anio || anioDe(c) === String(p.anio));
    const idsQueCoinciden = new Set(coinciden.map((c) => c.id));
    const visible = (c) => esVisible(usuario, c);

    /** Sube por los padres hasta el convenio de más arriba que el usuario puede ver. */
    const raizDe = (convenio) => {
      let actual = convenio;
      const vistos = new Set([convenio.id]); // por si un vínculo mal cargado arma un círculo
      for (;;) {
        const padre = conveniosRepository.padreDe(actual.id);
        if (!padre || vistos.has(padre.convenio.id) || !visible(padre.convenio)) return actual;
        vistos.add(padre.convenio.id);
        actual = padre.convenio;
      }
    };

    const nodo = (convenio, tipoVinculo, camino) => {
      const documentos = conveniosRepository.documentosDe(convenio.id);
      return {
        convenio: conveniosRepository.conUnidad(convenio),
        /** Cómo cuelga de su padre (especifico_de, adenda_de…); null en la raíz. */
        tipo_vinculo: tipoVinculo,
        /** true si este convenio cumple la búsqueda (los demás aparecen para mostrar el árbol completo). */
        coincide: idsQueCoinciden.has(convenio.id),
        resoluciones: documentos.filter((d) => d.tipo_documento === 'resolucion'),
        documentos: documentos.filter((d) => d.tipo_documento !== 'resolucion'),
        hijos: conveniosRepository
          .hijosDe(convenio.id)
          .filter((h) => visible(h.convenio) && !camino.has(h.convenio.id))
          .map((h) => nodo(h.convenio, h.tipo_vinculo, new Set([...camino, h.convenio.id]))),
      };
    };

    // Una sola rama por familia de convenios, aunque coincidan el padre y varios hijos.
    const raices = [];
    for (const c of coinciden) {
      const raiz = raizDe(c);
      if (!raices.some((r) => r.id === raiz.id)) raices.push(raiz);
    }

    return {
      total: coinciden.length,
      arboles: raices.map((r) => nodo(r, null, new Set([r.id]))),
    };
  },
};
