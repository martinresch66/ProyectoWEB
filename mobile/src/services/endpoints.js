// ÚNICO lugar con las rutas del backend.
// Si en Laravel las rutas terminan con otros nombres (por ejemplo /convenios en vez de /agreements),
// se cambian acá y el resto de la web no se toca.
// Todas son relativas a NEXT_PUBLIC_API_URL (ej.: http://localhost:8000/api).

export const ENDPOINTS = {
  // Sesión (Laravel Sanctum con token Bearer)
  login: "/auth/login",
  usuarioActual: "/auth/me",
  logout: "/auth/logout",

  // Convenios
  convenios: "/agreements",
  convenio: (id) => `/agreements/${id}`,
  exportarCsv: "/agreements/export",
  transicion: (id) => `/agreements/${id}/transitions`,

  // Vínculos entre instrumentos
  vinculos: (id) => `/agreements/${id}/links`,
  vinculo: (id, vinculoId) => `/agreements/${id}/links/${vinculoId}`,

  // Documentos
  documentos: (id) => `/agreements/${id}/documents`,
  descargarDocumento: (documentoId) => `/documents/${documentoId}/download`,

  // Observaciones de revisión
  observaciones: (id) => `/agreements/${id}/observations`,
  observacion: (observacionId) => `/observations/${observacionId}`,

  // Catálogos
  partes: "/parties",
  personas: "/people",
  unidades: "/units",
  usuarios: "/users",
  usuario: (id) => `/users/${id}`,

  // Panel y avisos
  dashboard: "/dashboard",
  alertas: "/alerts",
  alerta: (id) => `/alerts/${id}`,
};

// Métodos HTTP que pueden variar según cómo armen las rutas en Laravel.
export const METODOS = {
  actualizarConvenio: "PUT", // o "PATCH"
  actualizarUsuario: "PUT",
  marcarAlertaLeida: "PATCH",
  resolverObservacion: "PATCH",
};

// Nombres de los parámetros del listado de convenios (query string).
export const PARAMETROS_LISTADO = {
  texto: "q",
  tipo: "tipo",
  estado: "estado",
  unidad: "unidad_id",
  vigencia: "vigencia",
  desde: "desde", // fecha_inicio desde
  hasta: "hasta", // fecha_inicio hasta
  pagina: "page",
  porPagina: "per_page",
};

// Nombre del campo del archivo al subir un PDF (multipart/form-data).
export const CAMPO_ARCHIVO = "archivo";
