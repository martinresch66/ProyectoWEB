// Base local en IndexedDB (con Dexie) para trabajar sin conexión.
// - fichas:     copia de cada convenio consultado
// - consultas:  copia de listados, panel y catálogos (por clave de consulta)
// - pendientes: cola de cambios hechos sin conexión, que se envían al reconectar

import Dexie from "dexie";

export const EVENTO_PENDIENTES = "convenios:pendientes-cambiaron";

let base = null;

function db() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  if (!base) {
    base = new Dexie("convenios_unlpam");
    base.version(1).stores({
      fichas: "id, guardado_en",
      consultas: "clave, guardado_en",
      pendientes: "++id, estado, creado_en",
    });
  }
  return base;
}

// ---------- Copias para leer sin conexión ----------

export async function guardarFicha(convenio) {
  const d = db();
  if (!d || !convenio?.id) return;
  await d.fichas.put({ id: String(convenio.id), datos: convenio, guardado_en: Date.now() });
}

export async function leerFicha(id) {
  const d = db();
  if (!d) return null;
  const fila = await d.fichas.get(String(id));
  return fila?.datos ?? null;
}

export async function guardarConsulta(clave, datos) {
  const d = db();
  if (!d) return;
  await d.consultas.put({ clave, datos, guardado_en: Date.now() });
}

export async function leerConsulta(clave) {
  const d = db();
  if (!d) return null;
  const fila = await d.consultas.get(clave);
  return fila?.datos ?? null;
}

// ---------- Cola de pendientes ----------

function avisarCambio() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PENDIENTES));
}

/**
 * Agrega un cambio a la cola.
 * @param {{tipo: "crear"|"actualizar", convenio_id?: number|string, datos: object, descripcion: string}} cambio
 */
export async function encolar(cambio) {
  const d = db();
  if (!d) throw new Error("Este navegador no permite guardar datos sin conexión.");
  const id = await d.pendientes.add({ ...cambio, estado: "pendiente", error: null, servidor: null, creado_en: Date.now() });
  avisarCambio();
  return id;
}

export async function listarPendientes() {
  const d = db();
  if (!d) return [];
  return d.pendientes.orderBy("creado_en").toArray();
}

export async function contarPendientes() {
  const d = db();
  if (!d) return 0;
  return d.pendientes.count();
}

export async function actualizarPendiente(id, cambios) {
  const d = db();
  if (!d) return;
  await d.pendientes.update(id, cambios);
  avisarCambio();
}

export async function quitarPendiente(id) {
  const d = db();
  if (!d) return;
  await d.pendientes.delete(id);
  avisarCambio();
}

// Usuario dueño de la copia local. Si entra otra persona en la misma compu, se borra todo
// antes, para que no vea fichas ajenas ni envíe con su cuenta los pendientes del otro.
const CLAVE_DUENO = "convenios.local.dueno";

export function leerDueno() {
  try {
    return localStorage.getItem(CLAVE_DUENO);
  } catch {
    return null;
  }
}

export function guardarDueno(usuarioId) {
  try {
    if (usuarioId === null || usuarioId === undefined) localStorage.removeItem(CLAVE_DUENO);
    else localStorage.setItem(CLAVE_DUENO, String(usuarioId));
  } catch {
    // Sin localStorage (modo privado estricto): no pasa nada, se sigue sin esta protección.
  }
}

export async function borrarTodoLoLocal() {
  const d = db();
  if (!d) return;
  await Promise.all([d.fichas.clear(), d.consultas.clear(), d.pendientes.clear()]);
  avisarCambio();
}
