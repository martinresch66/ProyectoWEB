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

async function conCopiaLocal(clave, cargar) {
  try {
    const datos = await cargar();
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
  async iniciarSesion(email, password) {
    const r = await pedir("POST", ENDPOINTS.login, { cuerpo: { email, password } });
    return A.adaptarLogin(r);
  },
  async usuarioActual() {
    return A.adaptarUsuario(A.desenvolver(await pedir("GET", ENDPOINTS.usuarioActual)));
  },
  async cerrarSesion() {
    try {
      await pedir("POST", ENDPOINTS.logout);
    } catch {
      // Si falla (por ejemplo, sin conexión) igual se borra la sesión local.
    }
  },
};

// ---------- Convenios ----------

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
  async listar(filtros = {}, pagina = 1, porPagina = POR_PAGINA) {
    const parametros = parametrosListado(filtros, pagina, porPagina);
    return conCopiaLocal(`convenios:${JSON.stringify(parametros)}`, async () => {
      const r = await pedir("GET", ENDPOINTS.convenios, { parametros });
      return A.normalizarPagina(r, A.adaptarConvenio);
    });
  },

  async obtener(id) {
    try {
      const convenio = A.adaptarConvenio(await pedir("GET", ENDPOINTS.convenio(id)));
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

  // Envío directo al servidor (lo usa también la sincronización de pendientes).
  async crearEnServidor(datos) {
    return A.adaptarConvenio(await pedir("POST", ENDPOINTS.convenios, { cuerpo: datos }));
  },

  async actualizarEnServidor(id, datos, version) {
    const r = await pedir(METODOS.actualizarConvenio, ENDPOINTS.convenio(id), { cuerpo: { ...datos, version } });
    return A.adaptarConvenio(r);
  },

  async crear(datos) {
    try {
      return await this.crearEnServidor(datos);
    } catch (error) {
      if (!(error instanceof ErrorSinConexion)) throw error;
      await encolar({ tipo: "crear", datos, descripcion: `Nuevo convenio ${datos.codigo || ""}`.trim() });
      return { pendiente: true };
    }
  },

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

  async cambiarEstado(id, { estado_nuevo, motivo, version }) {
    const r = await pedir("POST", ENDPOINTS.transicion(id), { cuerpo: { estado_nuevo, motivo, version } });
    return r ? A.adaptarConvenio(r) : null;
  },

  async exportarCsv(filtros = {}) {
    const parametros = parametrosListado(filtros, 1, 1000);
    delete parametros[PARAMETROS_LISTADO.pagina];
    delete parametros[PARAMETROS_LISTADO.porPagina];
    const { blob, nombre } = await pedir("GET", ENDPOINTS.exportarCsv, { parametros, respuesta: "archivo" });
    guardarArchivo(blob, nombre || "convenios.csv");
  },
};

// ---------- Vínculos, documentos y observaciones ----------

export const vinculos = {
  async crear(convenioId, { convenio_destino_id, tipo_vinculo }) {
    return pedir("POST", ENDPOINTS.vinculos(convenioId), { cuerpo: { convenio_destino_id, tipo_vinculo } });
  },
  async quitar(convenioId, vinculoId) {
    return pedir("DELETE", ENDPOINTS.vinculo(convenioId, vinculoId));
  },
};

export const documentos = {
  async subir(convenioId, archivo, tipo_documento) {
    const formulario = new FormData();
    formulario.append(CAMPO_ARCHIVO, archivo);
    formulario.append("tipo_documento", tipo_documento);
    return A.adaptarDocumento(A.desenvolver(await pedir("POST", ENDPOINTS.documentos(convenioId), { formulario })));
  },
  async descargar(documento) {
    const { blob, nombre } = await pedir("GET", ENDPOINTS.descargarDocumento(documento.id), { respuesta: "archivo" });
    guardarArchivo(blob, nombre || documento.nombre_original || "documento.pdf");
  },
};

export const observaciones = {
  async crear(convenioId, observacion) {
    return A.adaptarObservacion(A.desenvolver(await pedir("POST", ENDPOINTS.observaciones(convenioId), { cuerpo: { observacion } })));
  },
  async marcarResuelta(observacionId, esta_resuelta = true) {
    return pedir(METODOS.resolverObservacion, ENDPOINTS.observacion(observacionId), { cuerpo: { esta_resuelta } });
  },
};

// ---------- Catálogos ----------

export const partes = {
  async listar(texto = "") {
    return conCopiaLocal(`partes:${texto}`, async () =>
      A.normalizarLista(await pedir("GET", ENDPOINTS.partes, { parametros: { q: texto, per_page: 100 } }), A.adaptarParte),
    );
  },
  async crear(datos) {
    return A.adaptarParte(A.desenvolver(await pedir("POST", ENDPOINTS.partes, { cuerpo: datos })));
  },
};

export const personas = {
  async listar(texto = "") {
    return conCopiaLocal(`personas:${texto}`, async () =>
      A.normalizarLista(await pedir("GET", ENDPOINTS.personas, { parametros: { q: texto, per_page: 100 } }), A.adaptarPersona),
    );
  },
  async crear(datos) {
    return A.adaptarPersona(A.desenvolver(await pedir("POST", ENDPOINTS.personas, { cuerpo: datos })));
  },
};

export const unidades = {
  async listar() {
    return conCopiaLocal("unidades", async () => A.normalizarLista(await pedir("GET", ENDPOINTS.unidades), A.adaptarUnidad));
  },
};

export const usuarios = {
  async listar() {
    return conCopiaLocal("usuarios", async () => A.normalizarLista(await pedir("GET", ENDPOINTS.usuarios), A.adaptarUsuario));
  },
  async crear(datos) {
    return A.adaptarUsuario(A.desenvolver(await pedir("POST", ENDPOINTS.usuarios, { cuerpo: datos })));
  },
  async actualizar(id, datos) {
    return A.adaptarUsuario(A.desenvolver(await pedir(METODOS.actualizarUsuario, ENDPOINTS.usuario(id), { cuerpo: datos })));
  },
};

// ---------- Panel y avisos ----------

export const panel = {
  async obtener() {
    return conCopiaLocal("panel", async () => A.adaptarDashboard(await pedir("GET", ENDPOINTS.dashboard)));
  },
};

export const alertas = {
  async listar() {
    return A.normalizarLista(await pedir("GET", ENDPOINTS.alertas), A.adaptarNotificacion);
  },
  async marcarLeida(id) {
    return pedir(METODOS.marcarAlertaLeida, ENDPOINTS.alerta(id), { cuerpo: { leida: true } });
  },
};
