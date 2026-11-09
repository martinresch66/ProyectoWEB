/**
 * Reglas del dominio, iguales a las de la web (web/lib/dominio.js) y a los ENUM de database/schema.sql.
 */

export const ESTADOS = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];
export const TIPOS = ['marco', 'especifico', 'adenda', 'pasantia'];
export const ROLES = ['admin', 'gestion', 'revision', 'consulta'];
export const VIGENCIAS = ['vigente', 'proximo', 'vencido', 'sin_vencimiento'];

/** "2026-11-10" → fecha local sin hora (evita corrimientos por zona horaria). */
export function leerFecha(valor) {
  if (!valor) return null;
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export function hoySinHora() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Vigencia de un convenio firmado (no es un estado: se calcula). Devuelve null si no está firmado.
 * Misma lógica que calcularVigencia() de la web y que la tabla del §8 de CONTRATO-API.md.
 */
export function calcularVigencia(convenio, hoy = hoySinHora()) {
  if (!convenio || convenio.estado !== 'firmado') return null;
  const inicio = leerFecha(convenio.fecha_inicio);
  const fin = leerFecha(convenio.fecha_fin);
  if (inicio && hoy < inicio) return 'aun_no_vigente';
  if (!fin) return 'sin_vencimiento';
  const dias = Math.round((fin.getTime() - hoy.getTime()) / MS_DIA);
  if (dias < 0) return 'vencido';
  if (dias <= (convenio.dias_preaviso ?? 30)) return 'proximo';
  return 'vigente';
}

/**
 * Alcance por rol (§4 del contrato). Revisión se trata como global, igual que en la web,
 * porque el seed tiene al revisor con unidad Rectorado (ver §10.6 del contrato).
 */
export function veTodo(usuario) {
  return usuario.rol === 'admin' || usuario.rol === 'revision' || usuario.unidad_id === null;
}

export function esVisible(usuario, convenio) {
  if (!veTodo(usuario) && convenio.unidad_id !== usuario.unidad_id) return false;
  if (usuario.rol === 'consulta') {
    return convenio.estado === 'firmado' && calcularVigencia(convenio) !== 'vencido';
  }
  return true;
}
