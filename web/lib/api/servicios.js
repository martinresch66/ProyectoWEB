// Funciones que usan las pantallas para hablar con el backend.
// Las pantallas NUNCA llaman a fetch directo: siempre pasan por acá.
//
// Convención:
// - Las consultas devuelven { datos, desdeCache }. Si no hay conexión, devuelven la última
//   copia guardada en el navegador (desdeCache = true) o tiran ErrorSinConexion.
// - Crear y actualizar convenios sin conexión guardan el cambio en la cola de pendientes
//   y devuelven { pendiente: true }.

import { pedir, guardarArchivo } from "./cliente";
import { ENDPOINTS, METODOS, PARAMETROS_LISTADO, CAMPO_ARCHIVO } from "./endpoints";
import { POR_PAGINA } from "./config";
import { ErrorSinConexion } from "./errores";
import * as A from "./adaptadores";
import { guardarFicha, leerFicha, guardarConsulta, leerConsulta, encolar } from "@/lib/db/offline";

// Ejecuta una consulta en línea y guarda el resultado para reutilizarlo sin conexión.
// Si la falla se debe a falta de conexión, intenta devolver la copia local asociada a la clave.
async function conCopiaLocal(clave, cargar) {
  try {
    const datos = await cargar();
    // El guardado es secundario: un fallo al almacenar la copia no invalida la consulta exitosa.
    guardarConsulta(clave, datos).catch(() => {});
    return { datos, desdeCache: false };
  } catch (error) {
    if (error instanceof ErrorSinConexion) {
      const copia = await leerConsulta(clave);
      if (copia) return { datos: copia, desdeCache: true };
    }
    throw error;
  }
}

// ---------- Sesión ----------

export const auth = {
  // Envía las credenciales y adapta la respuesta al formato que usa la aplicación.
  async iniciarSesion(email, password) {
    const r = await pedir("POST", ENDPOINTS.login, { cuerpo: { email, password } });
    return A.adaptarLogin(r);
  },
  // Recupera la sesión vigente y normaliza los datos del usuario.
  async usuarioActual() {
    return A.adaptarUsuario(A.desenvolver(await pedir("GET", ENDPOINTS.usuarioActual)));
  },
  // Pide cerrar la sesión en el servidor; el cierre local puede continuar si falla la petición.
  async cerrarSesion() {
    try {
      await pedir("POST", ENDPOINTS.logout);
    } catch {
      // Si falla (por ejemplo, sin conexión) igual se borra la sesión local.
    }
  },
};

// ---------- Convenios ----------

// Convierte los filtros de la interfaz al nombre de parámetros que espera la API.
function parametrosListado(filtros = {}, pagina = 1, porPagina = POR_PAGINA) {
  const P = PARAMETROS_LISTADO;
  return {
    [P.texto]: filtros.texto,
    [P.tipo]: filtros.tipo,
    [P.estado]: filtros.estado,
    [P.unidad]: filtros.unidad_id,
    [P.vigencia]: filtros.vigencia,
    [P.desde]: filtros.desde,
    [P.hasta]: filtros.hasta,
    [P.pagina]: pagina,
    [P.porPagina]: porPagina,
  };
}

export const convenios = {
  // Lista convenios con filtros y paginación, guardando la respuesta para uso sin conexión.
  async listar(filtros = {}, pagina = 1, porPagina = POR_PAGINA) {
    const parametros = parametrosListado(filtros, pagina, porPagina);
    return conCopiaLocal(`convenios:${JSON.stringify(parametros)}`, async () => {
      const r = await pedir("GET", ENDPOINTS.convenios, { parametros });
      return A.normalizarPagina(r, A.adaptarConvenio);
    });
  },

  // Obtiene el detalle de un convenio y mantiene una copia local específica por identificador.
  async obtener(id) {
    try {
      const convenio = A.adaptarConvenio(await pedir("GET", ENDPOINTS.convenio(id)));
      // La copia se guarda en segundo plano para no retrasar la respuesta a la pantalla.
      guardarFicha(convenio).catch(() => {});
      return { datos: convenio, desdeCache: false };
    } catch (error) {
      if (error instanceof ErrorSinConexion) {
        const copia = await leerFicha(id);
        if (copia) return { datos: copia, desdeCache: true };
      }
      throw error;
    }
  },

  // Envío directo al servidor, sin encolar; también lo utiliza la sincronización de pendientes.
  async crearEnServidor(datos) {
    return A.adaptarConvenio(await pedir("POST", ENDPOINTS.convenios, { cuerpo: datos }));
  },

  // Actualiza el convenio en el servidor e incluye la versión para controlar conflictos.
  async actualizarEnServidor(id, datos, version) {
    const r = await pedir(METODOS.actualizarConvenio, ENDPOINTS.convenio(id), { cuerpo: { ...datos, version } });
    return A.adaptarConvenio(r);
  },

  // Intenta crear en línea; si no hay conexión, deja la operación en la cola de sincronización.
  async crear(datos) {
    try {
      return await this.crearEnServidor(datos);
    } catch (error) {
      if (!(error instanceof ErrorSinConexion)) throw error;
      await encolar({ tipo: "crear", datos, descripcion: `Nuevo convenio ${datos.codigo || ""}`.trim() });
      return { pendiente: true };
    }
  },

  // Intenta actualizar en línea; sin conexión, conserva los datos y la versión para sincronizarlos después.
  async actualizar(id, datos, version) {
    try {
      return await this.actualizarEnServidor(id, datos, version);
    } catch (error) {
      if (!(error instanceof ErrorSinConexion)) throw error;
      await encolar({
        tipo: "actualizar",
        convenio_id: id,
        datos,
        version,
        descripcion: `Cambios en ${datos.codigo || `el convenio ${id}`}`,
      });
      return { pendiente: true };
    }
  },

  // Solicita una transición de estado, enviando motivo y versión para validar el cambio.
  async cambiarEstado(id, { estado_nuevo, motivo, version }) {
    const r = await pedir("POST", ENDPOINTS.transicion(id), { cuerpo: { estado_nuevo, motivo, version } });
    return r ? A.adaptarConvenio(r) : null;
  },

  // Descarga la exportación CSV con los filtros actuales y dispara su guardado en el dispositivo.
  async exportarCsv(filtros = {}) {
    const parametros = parametrosListado(filtros, 1, 1000);
    // La exportación devuelve todos los resultados en una sola respuesta, sin datos de paginación.
    delete parametros[PARAMETROS_LISTADO.pagina];
    delete parametros[PARAMETROS_LISTADO.porPagina];
    const { blob, nombre } = await pedir("GET", ENDPOINTS.exportarCsv, { parametros, respuesta: "archivo" });
    guardarArchivo(blob, nombre || "convenios.csv");
  },
};

// ---------- Vínculos, documentos y observaciones ----------

export const vinculos = {
  // Asocia este convenio con otro mediante el tipo de vínculo indicado.
  async crear(convenioId, { convenio_destino_id, tipo_vinculo }) {
    return pedir("POST", ENDPOINTS.vinculos(convenioId), { cuerpo: { convenio_destino_id, tipo_vinculo } });
  },
  // Elimina un vínculo existente de un convenio.
  async quitar(convenioId, vinculoId) {
    return pedir("DELETE", ENDPOINTS.vinculo(convenioId, vinculoId));
  },
};

export const documentos = {
  // Envía el archivo y su categoría como datos multipart/form-data.
  async subir(convenioId, archivo, tipo_documento) {
    const formulario = new FormData();
    formulario.append(CAMPO_ARCHIVO, archivo);
    formulario.append("tipo_documento", tipo_documento);
    return A.adaptarDocumento(A.desenvolver(await pedir("POST", ENDPOINTS.documentos(convenioId), { formulario })));
  },
  // Descarga el archivo y utiliza un nombre de respaldo si el servidor no informa uno.
  async descargar(documento) {
    const { blob, nombre } = await pedir("GET", ENDPOINTS.descargarDocumento(documento.id), { respuesta: "archivo" });
    guardarArchivo(blob, nombre || documento.nombre_original || "documento.pdf");
  },
};

export const observaciones = {
  // Crea una observación asociada al convenio y adapta la respuesta recibida.
  async crear(convenioId, observacion) {
    return A.adaptarObservacion(A.desenvolver(await pedir("POST", ENDPOINTS.observaciones(convenioId), { cuerpo: { observacion } })));
  },
  // Cambia si una observación está resuelta; por defecto, la marca como resuelta.
  async marcarResuelta(observacionId, esta_resuelta = true) {
    return pedir(METODOS.resolverObservacion, ENDPOINTS.observacion(observacionId), { cuerpo: { esta_resuelta } });
  },
};

// ---------- Catálogos ----------

export const partes = {
  // Busca partes por texto y usa una copia local si la consulta no puede conectarse.
  async listar(texto = "") {
    return conCopiaLocal(`partes:${texto}`, async () =>
      A.normalizarLista(await pedir("GET", ENDPOINTS.partes, { parametros: { q: texto, per_page: 100 } }), A.adaptarParte),
    );
  },
  // Crea una parte y normaliza el objeto devuelto por la API.
  async crear(datos) {
    return A.adaptarParte(A.desenvolver(await pedir("POST", ENDPOINTS.partes, { cuerpo: datos })));
  },
};

export const personas = {
  // Busca personas por texto y permite consultar resultados previamente guardados sin conexión.
  async listar(texto = "") {
    return conCopiaLocal(`personas:${texto}`, async () =>
      A.normalizarLista(await pedir("GET", ENDPOINTS.personas, { parametros: { q: texto, per_page: 100 } }), A.adaptarPersona),
    );
  },
  // Crea una persona y adapta la respuesta de la API al formato de la aplicación.
  async crear(datos) {
    return A.adaptarPersona(A.desenvolver(await pedir("POST", ENDPOINTS.personas, { cuerpo: datos })));
  },
};

export const unidades = {
  // Obtiene y normaliza el catálogo de unidades, con respaldo local sin conexión.
  async listar() {
    return conCopiaLocal("unidades", async () => A.normalizarLista(await pedir("GET", ENDPOINTS.unidades), A.adaptarUnidad));
  },
};

export const usuarios = {
  // Lista usuarios y guarda los resultados para poder reutilizarlos sin conexión.
  async listar() {
    return conCopiaLocal("usuarios", async () => A.normalizarLista(await pedir("GET", ENDPOINTS.usuarios), A.adaptarUsuario));
  },
  // Crea un usuario y normaliza los datos devueltos.
  async crear(datos) {
    return A.adaptarUsuario(A.desenvolver(await pedir("POST", ENDPOINTS.usuarios, { cuerpo: datos })));
  },
  // Actualiza un usuario existente y adapta la respuesta.
  async actualizar(id, datos) {
    return A.adaptarUsuario(A.desenvolver(await pedir(METODOS.actualizarUsuario, ENDPOINTS.usuario(id), { cuerpo: datos })));
  },
};

// ---------- Panel y avisos ----------

export const panel = {
  // Obtiene los datos resumidos del dashboard, usando la última copia local si no hay conexión.
  async obtener() {
    return conCopiaLocal("panel", async () => A.adaptarDashboard(await pedir("GET", ENDPOINTS.dashboard)));
  },
};

// Evento que avisa que cambió algún aviso (por ejemplo, se marcó como leído),
// para que la campanita de la barra superior vuelva a contar sin recargar la página.
export const EVENTO_AVISOS = "convenios:avisos-cambio";

export const alertas = {
  async listar() {
    return A.normalizarLista(await pedir("GET", ENDPOINTS.alertas), A.adaptarNotificacion);
  },
  async marcarLeida(id) {
    const respuesta = await pedir(METODOS.marcarAlertaLeida, ENDPOINTS.alerta(id), { cuerpo: { leida: true } });
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_AVISOS));
    return respuesta;
  },
};
