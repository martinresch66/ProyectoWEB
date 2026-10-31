// Envía al servidor los cambios guardados sin conexión, en el orden en que se hicieron.
// - Si el servidor responde 409 (otra versión), el pendiente queda como "conflicto"
//   y la pantalla de Pendientes muestra las dos versiones para elegir.
// - Si responde 422, queda como "error" con el mensaje.
// - Si se corta la conexión de nuevo, se detiene y sigue la próxima vez.

import { convenios } from "@/lib/api/servicios";
import { adaptarConvenio } from "@/lib/api/adaptadores";
import { ErrorConflicto, ErrorSinConexion, ErrorValidacion, mensajeDeError } from "@/lib/api/errores";
import { listarPendientes, quitarPendiente, actualizarPendiente } from "./offline";

let enCurso = null;

export function sincronizarPendientes() {
  if (!enCurso) {
    enCurso = ejecutar().finally(() => {
      enCurso = null;
    });
  }
  return enCurso;
}

async function ejecutar() {
  const resultado = { enviados: 0, conflictos: 0, errores: 0, sinConexion: false };
  const pendientes = (await listarPendientes()).filter((p) => p.estado === "pendiente");

  for (const p of pendientes) {
    try {
      if (p.tipo === "crear") {
        await convenios.crearEnServidor(p.datos);
      } else if (p.tipo === "actualizar") {
        await convenios.actualizarEnServidor(p.convenio_id, p.datos, p.version);
      }
      await quitarPendiente(p.id);
      resultado.enviados += 1;
    } catch (error) {
      if (error instanceof ErrorSinConexion) {
        resultado.sinConexion = true;
        break;
      }
      if (error instanceof ErrorConflicto) {
        let servidor = error.actual ? adaptarConvenio(error.actual) : null;
        if (!servidor && p.convenio_id) {
          try {
            servidor = (await convenios.obtener(p.convenio_id)).datos;
          } catch {
            servidor = null;
          }
        }
        await actualizarPendiente(p.id, { estado: "conflicto", servidor, error: error.message });
        resultado.conflictos += 1;
      } else {
        const detalle = error instanceof ErrorValidacion ? Object.values(error.campos).join(" ") : "";
        await actualizarPendiente(p.id, { estado: "error", error: `${mensajeDeError(error)} ${detalle}`.trim() });
        resultado.errores += 1;
      }
    }
  }
  return resultado;
}
