/**
 * ÚNICO lugar con las rutas de la API (igual que web/lib/api/endpoints.js).
 * Son relativas a env.apiUrl (ej.: http://192.168.0.10:4000/api).
 * Si el backend de Laravel termina usando otros nombres, se cambian acá.
 */


const id = (valor: number | string) => encodeURIComponent(String(valor));

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

  // Solo de la app móvil: Inicio, PDF y firma
  resumen: '/mobile/resumen',
  indicador: (clave: string) => `/mobile/resumen/${id(clave)}`,
  pdfConvenio: (convenioId: number | string) => `/mobile/convenios/${id(convenioId)}/pdf`,
  firmaConvenio: (convenioId: number | string) => `/mobile/convenios/${id(convenioId)}/firma`,
  comentarios: (convenioId: number | string) => `/mobile/convenios/${id(convenioId)}/comentarios`,
  documentosConvenio: (convenioId: number | string) => `/mobile/convenios/${id(convenioId)}/documentos`,
  documento: (documentoId: number | string) => `/mobile/documentos/${id(documentoId)}`,
  pdfDocumento: (documentoId: number | string) => `/mobile/documentos/${id(documentoId)}/pdf`,

  // Convenios (§4)
  convenios: '/agreements',
  convenio: (convenioId: number | string) => `/agreements/${id(convenioId)}`,

  // Catálogos y avisos (§8)
  unidades: '/units',
  alertas: '/alerts',
  alerta: (alertaId: number) => `/alerts/${alertaId}`,
};