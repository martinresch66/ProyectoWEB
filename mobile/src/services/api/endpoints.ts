/**
 * ÚNICO lugar con las rutas de la API (igual que web/lib/api/endpoints.js).
 * Son relativas a env.apiUrl (ej.: http://192.168.0.10:4000/api).
 * Si el backend de Laravel termina usando otros nombres, se cambian acá.
 */
export const ENDPOINTS = {
  // Sesión (CONTRATO-API.md §3)
  usuarioActual: '/auth/me',
  logout: '/auth/logout',

  // Sesión de la app móvil (no están en el contrato: ver mobile/README.md)
  loginMovil: '/auth/mobile/login',
  enviarCodigo: '/auth/mobile/mfa/send',
  verificarCodigo: '/auth/mobile/mfa/verify',
  refrescar: '/auth/mobile/refresh',
  activarHuella: '/auth/mobile/biometric/enable',
  loginConHuella: '/auth/mobile/biometric/login',
  desactivarHuella: '/auth/mobile/biometric/disable',

  // Convenios (§4)
  convenios: '/agreements',
  convenio: (id: number | string) => `/agreements/${encodeURIComponent(String(id))}`,

  // Catálogos y avisos (§8)
  unidades: '/units',
  alertas: '/alerts',
  alerta: (id: number) => `/alerts/${id}`,
};
