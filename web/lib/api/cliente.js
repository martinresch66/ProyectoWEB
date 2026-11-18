// Cliente HTTP único: todas las llamadas al backend pasan por acá.
// Agrega el token, arma la URL, convierte los errores HTTP en clases de errores.js
// y, en modo simulado, responde con el servidor falso de ./mock/servidor.js.

import { API_URL, USAR_SIMULADO } from "./config";
import { crearError, ErrorNoAutenticado, ErrorSinConexion } from "./errores";
import { ENDPOINTS } from "./endpoints";
import { obtenerToken, borrarSesion } from "@/lib/auth/sesion";

export const EVENTO_SESION_VENCIDA = "convenios:sesion-vencida";

/**
 * Envía una solicitud usando el servidor simulado o el backend configurado.
 * Si la API indica que la sesión no está autenticada, limpia la sesión local
 * y notifica al resto de la aplicación.
 *
 * @param {string} metodo  GET, POST, PUT, PATCH o DELETE
 * @param {string} ruta    ruta relativa (ver endpoints.js)
 * @param {object} [opciones]
 * @param {object} [opciones.cuerpo]      se envía como JSON
 * @param {FormData} [opciones.formulario] se envía como multipart (subida de PDF)
 * @param {object} [opciones.parametros]  query string
 * @param {"json"|"archivo"} [opciones.respuesta] "archivo" devuelve { blob, nombre }
 */
export async function pedir(metodo, ruta, opciones = {}) {
  try {
    if (USAR_SIMULADO) {
      // Carga el servidor falso solo cuando se necesita y le pasa el token actual.
      const { responderSimulado } = await import("./mock/servidor");
      return await responderSimulado(metodo, ruta, { ...opciones, token: obtenerToken() });
    }
    return await pedirAlBackend(metodo, ruta, opciones);
  } catch (error) {
    if (error instanceof ErrorNoAutenticado && ruta !== ENDPOINTS.login) {
      borrarSesion();
      if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA));
    }
    throw error;
  }
}

// Construye y ejecuta una solicitud HTTP real, transformando la respuesta al formato esperado.
async function pedirAlBackend(metodo, ruta, { cuerpo, formulario, parametros, respuesta = "json" }) {
  // Agrega a la URL solo los parámetros que tienen un valor definido y no vacío.
  const url = new URL(API_URL + ruta);
  for (const [clave, valor] of Object.entries(parametros || {})) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(clave, valor);
  }

  // Define el tipo de respuesta esperado y agrega autenticación si hay token guardado.
  const headers = { Accept: respuesta === "archivo" ? "*/*" : "application/json" };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Los formularios se envían tal cual para que el navegador configure su límite multipart.
  // El resto de los cuerpos se codifica como JSON.
  let body;
  if (formulario) {
    body = formulario; // el navegador pone el Content-Type multipart solo
  } else if (cuerpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(cuerpo);
  }

  // Distingue los problemas de conexión de las respuestas de error HTTP del servidor.
  let res;
  try {
    res = await fetch(url, { method: metodo, headers, body });
  } catch {
    throw new ErrorSinConexion();
  }

  // Convierte los estados HTTP fallidos en los errores definidos por la aplicación.
  if (!res.ok) {
    const datos = await leerJson(res);
    throw crearError(res.status, datos);
  }

  // 204 significa que la solicitud terminó correctamente pero no hay cuerpo que leer.
  if (res.status === 204) return null;

  // Puede devolver contenido binario para una descarga o JSON para las demás operaciones.
  if (respuesta === "archivo") {
    return { blob: await res.blob(), nombre: nombreDelArchivo(res) };
  }
  return leerJson(res);
}

// Lee el cuerpo como texto para manejar también respuestas vacías o JSON mal formado.
async function leerJson(res) {
  const texto = await res.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return { message: texto.slice(0, 200) };
  }
}

// Extrae el nombre de archivo indicado en el encabezado Content-Disposition.
function nombreDelArchivo(res) {
  const disposicion = res.headers.get("Content-Disposition") || "";
  const coincidencia = disposicion.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return coincidencia ? decodeURIComponent(coincidencia[1]) : null;
}

// Inicia una descarga en el navegador y luego libera la URL temporal del blob.
export function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
