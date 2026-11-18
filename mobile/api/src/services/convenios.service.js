import { calcularVigencia, ESTADOS, esVisible, TIPOS, VIGENCIAS } from '../domain/dominio.js';
import { conveniosRepository } from '../repositories/convenios.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { normalize } from '../utils/text.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida los filtros del listado y devuelve 422 con el formato de Laravel si alguno no sirve. */
function validarFiltros(p) {
  const errores = {};
  if (p.tipo && !TIPOS.includes(p.tipo)) errores.tipo = [`El tipo tiene que ser uno de: ${TIPOS.join(', ')}.`];
  if (p.estado && !ESTADOS.includes(p.estado)) errores.estado = [`El estado tiene que ser uno de: ${ESTADOS.join(', ')}.`];
  if (p.vigencia && !VIGENCIAS.includes(p.vigencia)) errores.vigencia = [`La vigencia tiene que ser una de: ${VIGENCIAS.join(', ')}.`];
  if (p.desde && !FECHA.test(p.desde)) errores.desde = ['La fecha tiene que tener el formato AAAA-MM-DD.'];
  if (p.hasta && !FECHA.test(p.hasta)) errores.hasta = ['La fecha tiene que tener el formato AAAA-MM-DD.'];
  if (Object.keys(errores).length) throw new HttpError(422, 'Hay filtros con valores inválidos.', errores);
}

/**
 * Lógica de negocio de convenios: alcance por rol, filtros y paginación (§4 de CONTRATO-API.md).
 * No sabe nada de HTTP ni de dónde se guardan los datos.
 */
export const conveniosService = {
  listar(usuario, p = {}) {
    validarFiltros(p);
    const texto = normalize(p.q);
    const todos = conveniosRepository
      .findAll()
      .filter((c) => esVisible(usuario, c))
      .filter((c) => !texto || [c.codigo, c.titulo, c.resumen].some((v) => normalize(v).includes(texto)))
      .filter((c) => !p.tipo || c.tipo === p.tipo)
      .filter((c) => !p.estado || c.estado === p.estado)
      .filter((c) => !p.unidad_id || c.unidad_id === Number(p.unidad_id))
      .filter((c) => !p.vigencia || calcularVigencia(c) === p.vigencia)
      .filter((c) => !p.desde || (c.fecha_inicio && c.fecha_inicio >= p.desde))
      .filter((c) => !p.hasta || (c.fecha_inicio && c.fecha_inicio <= p.hasta))
      .sort((a, b) => b.codigo.localeCompare(a.codigo));

    // Paginador con la forma de Laravel (paginate()).
    const porPagina = Math.min(Math.max(Number(p.per_page) || 15, 1), 100);
    const ultima = Math.max(Math.ceil(todos.length / porPagina), 1);
    const pagina = Math.min(Math.max(Number(p.page) || 1, 1), ultima);
    return {
      data: todos.slice((pagina - 1) * porPagina, pagina * porPagina).map((c) => conveniosRepository.conUnidad(c)),
      current_page: pagina,
      last_page: ultima,
      per_page: porPagina,
      total: todos.length,
    };
  },

  obtener(usuario, id) {
    const convenio = conveniosRepository.findById(id);
    // 404 también si existe pero no está en su alcance: no se revela que existe.
    if (!convenio || !esVisible(usuario, convenio)) throw new HttpError(404, 'No encontramos este convenio.');
    return conveniosRepository.ficha(convenio);
  },
};
