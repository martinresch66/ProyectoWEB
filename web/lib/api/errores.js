// Errores que puede devolver la API, ya traducidos a algo que la interfaz entiende.

export class ErrorApi extends Error {
  constructor(mensaje, { estado = 0, datos = null } = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.datos = datos;
  }
}

// No hay conexión con el servidor (o el servidor no responde).
export class ErrorSinConexion extends ErrorApi {
  constructor() {
    super("No hay conexión con el servidor.");
    this.name = "ErrorSinConexion";
  }
}

// 401: falta iniciar sesión o el token venció.
export class ErrorNoAutenticado extends ErrorApi {
  constructor(mensaje = "Tu sesión terminó. Volvé a iniciar sesión.", datos) {
    super(mensaje, { estado: 401, datos });
    this.name = "ErrorNoAutenticado";
  }
}

// 403: el rol o la unidad no permiten la acción.
export class ErrorSinPermiso extends ErrorApi {
  constructor(mensaje = "No tenés permiso para hacer esto.", datos) {
    super(mensaje, { estado: 403, datos });
    this.name = "ErrorSinPermiso";
  }
}

// 404: no existe o está fuera del alcance del usuario.
export class ErrorNoEncontrado extends ErrorApi {
  constructor(mensaje = "No encontramos lo que buscabas.", datos) {
    super(mensaje, { estado: 404, datos });
    this.name = "ErrorNoEncontrado";
  }
}

// 409: otra persona guardó cambios antes (concurrencia optimista con "version").
export class ErrorConflicto extends ErrorApi {
  constructor(mensaje = "Alguien guardó cambios mientras editabas.", datos) {
    super(mensaje, { estado: 409, datos });
    this.name = "ErrorConflicto";
    // Versión actual del servidor, si el backend la manda en la respuesta.
    this.actual = datos?.actual ?? datos?.data ?? datos?.convenio ?? null;
  }
}

// 422: errores de validación. Formato estándar de Laravel:
// { "message": "...", "errors": { "titulo": ["El título es obligatorio."] } }
export class ErrorValidacion extends ErrorApi {
  constructor(mensaje = "Revisá los datos ingresados.", datos) {
    super(mensaje, { estado: 422, datos });
    this.name = "ErrorValidacion";
    this.campos = {};
    const errores = datos?.errors || {};
    for (const [campo, mensajes] of Object.entries(errores)) {
      this.campos[campo] = Array.isArray(mensajes) ? mensajes[0] : String(mensajes);
    }
  }
}

export function crearError(estado, datos) {
  const mensaje = datos?.message || datos?.mensaje;
  switch (estado) {
    case 401:
      return new ErrorNoAutenticado(mensaje || undefined, datos);
    case 403:
      return new ErrorSinPermiso(mensaje || undefined, datos);
    case 404:
      return new ErrorNoEncontrado(mensaje || undefined, datos);
    case 409:
      return new ErrorConflicto(mensaje || undefined, datos);
    case 413:
      return new ErrorValidacion("El archivo supera los 20 MB.", { errors: { archivo: ["El archivo supera los 20 MB."] } });
    case 415:
      return new ErrorValidacion("El archivo no es un PDF.", { errors: { archivo: ["El archivo no es un PDF."] } });
    case 422:
      return new ErrorValidacion(mensaje || undefined, datos);
    default:
      return new ErrorApi(mensaje || `El servidor respondió con un error (${estado}).`, { estado, datos });
  }
}

// Mensaje corto para mostrar al usuario.
export function mensajeDeError(error) {
  if (!error) return "";
  if (error instanceof ErrorApi) return error.message;
  return "Ocurrió un error inesperado.";
}
