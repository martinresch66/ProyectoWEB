// Matriz de permisos del lado de la web (informe de indagación del grupo, sección 2.B).
// Solo decide qué botones y pantallas se muestran: el backend SIEMPRE vuelve a validar.

import { TRANSICIONES } from "./dominio";

export function esGlobal(usuario) {
  return !!usuario && (usuario.unidad_id === null || usuario.unidad_id === undefined);
}

// ¿El convenio está dentro del alcance del usuario?
export function enSuAlcance(usuario, convenio) {
  if (!usuario || !convenio) return false;
  if (usuario.rol === "admin" || esGlobal(usuario)) return true;
  return Number(convenio.unidad_id) === Number(usuario.unidad_id);
}

export function puedeCrearConvenio(usuario) {
  return ["admin", "gestion"].includes(usuario?.rol);
}

export function puedeEditarConvenio(usuario, convenio) {
  if (!convenio || convenio.estado !== "borrador") return false;
  return puedeCrearConvenio(usuario) && enSuAlcance(usuario, convenio);
}

export function puedeSubirDocumentos(usuario, convenio) {
  if (!convenio || ["rescindido", "archivado"].includes(convenio.estado)) return false;
  if (usuario?.rol === "admin") return true;
  if (usuario?.rol === "revision") return convenio.estado === "revision"; // dictámenes
  return usuario?.rol === "gestion" && enSuAlcance(usuario, convenio);
}

export function puedeObservar(usuario, convenio) {
  return ["admin", "revision"].includes(usuario?.rol) && convenio?.estado === "revision";
}

export function puedeResolverObservacion(usuario) {
  return ["admin", "revision"].includes(usuario?.rol);
}

export function puedeGestionarCatalogos(usuario) {
  return ["admin", "gestion"].includes(usuario?.rol);
}

export function puedeAdministrarUsuarios(usuario) {
  return usuario?.rol === "admin";
}

export function puedeRevisar(usuario) {
  return ["admin", "revision"].includes(usuario?.rol);
}

// Transiciones que este usuario puede ejecutar sobre este convenio.
export function transicionesDisponibles(usuario, convenio) {
  if (!usuario || !convenio) return [];
  const desde = TRANSICIONES[convenio.estado] || {};
  return Object.entries(desde)
    .filter(([, regla]) => regla.roles.includes(usuario.rol))
    .filter(() => usuario.rol !== "gestion" || enSuAlcance(usuario, convenio))
    .map(([hacia, regla]) => ({ hacia, ...regla }));
}
