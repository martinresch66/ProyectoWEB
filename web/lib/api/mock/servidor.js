// Servidor FALSO para trabajar sin backend (NEXT_PUBLIC_USE_MOCK=true).
// Responde con la misma forma que esperamos de Laravel (ver CONTRATO-API.md)
// y aplica las reglas de negocio principales, así la web se prueba de punta a punta.
// Los cambios se guardan en el localStorage del navegador.

import { ENDPOINTS, METODOS, PARAMETROS_LISTADO, CAMPO_ARCHIVO } from "../endpoints";
import {
  ErrorConflicto,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorSinConexion,
  ErrorSinPermiso,
  ErrorValidacion,
} from "../errores";
import { datosIniciales } from "./datos";
import {
  TIPOS,
  ESTADOS,
  ROLES,
  TIPOS_VINCULO,
  TIPOS_DOCUMENTO,
  TRANSICIONES,
  CAMPOS_FICHA_EXTRA,
  MINIMO_PARTES_PARA_APROBAR,
  MAX_PDF_BYTES,
  MAX_HORAS_PASANTIA,
  calcularVigencia,
  aFechaIso,
  hoySinHora,
  leerFecha,
} from "@/lib/dominio";
import { generarCsv } from "@/lib/csv";

const CLAVE = "convenios.simulado.v1";
const DEMORA_MS = 250;
const archivosEnMemoria = new Map(); // PDFs subidos en esta sesión (no se guardan)

// ---------- Base en localStorage ----------

function cargar() {
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (texto) return JSON.parse(texto);
  } catch {
    // datos corruptos: se reinician
  }
  const db = datosIniciales();
  guardar(db);
  return db;
}

function guardar(db) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(db));
  } catch {
    // sin localStorage: los datos viven solo en memoria
  }
}

export function reiniciarDatosSimulados() {
  window.localStorage.removeItem(CLAVE);
}

// ---------- Utilidades ----------

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function ahora() {
  const d = new Date();
  const h = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  return `${aFechaIso(d)} ${h}`;
}

function siguienteId(lista) {
  return lista.reduce((max, x) => Math.max(max, Number(x.id)), 0) + 1;
}

function validacion(errores) {
  if (Object.keys(errores).length) {
    throw new ErrorValidacion("Revisá los datos ingresados.", { message: "Revisá los datos ingresados.", errors: errores });
  }
}

const textoValido = (v, min = 1) => typeof v === "string" && v.trim().length >= min;
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ---------- Rutas ----------

// Convierte una entrada de ENDPOINTS (texto o función) en una expresión regular.
function patron(entrada) {
  const ruta = typeof entrada === "function" ? entrada("__P1__", "__P2__") : entrada;
  const escapada = ruta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/__P1__|__P2__/g, "([^/]+)");
  return new RegExp(`^${escapada}$`);
}

const RUTAS = [
  ["POST", ENDPOINTS.login, login, { publica: true }],
  ["GET", ENDPOINTS.usuarioActual, (ctx) => usuarioPublico(ctx.db, ctx.usuario)],
  ["POST", ENDPOINTS.logout, () => null],
  ["GET", ENDPOINTS.exportarCsv, exportarCsv],
  ["GET", ENDPOINTS.convenios, listarConvenios],
  ["POST", ENDPOINTS.convenios, crearConvenio],
  ["POST", ENDPOINTS.transicion, cambiarEstado],
  ["POST", ENDPOINTS.vinculos, crearVinculo],
  ["DELETE", ENDPOINTS.vinculo, quitarVinculo],
  ["POST", ENDPOINTS.documentos, subirDocumento],
  ["POST", ENDPOINTS.observaciones, crearObservacion],
  ["GET", ENDPOINTS.convenio, obtenerConvenio],
  [METODOS.actualizarConvenio, ENDPOINTS.convenio, actualizarConvenio],
  ["GET", ENDPOINTS.descargarDocumento, descargarDocumento],
  [METODOS.resolverObservacion, ENDPOINTS.observacion, resolverObservacion],
  ["GET", ENDPOINTS.partes, listarPartes],
  ["POST", ENDPOINTS.partes, crearParte],
  ["GET", ENDPOINTS.personas, listarPersonas],
  ["POST", ENDPOINTS.personas, crearPersona],
  ["GET", ENDPOINTS.unidades, (ctx) => ctx.db.unidades],
  ["GET", ENDPOINTS.usuarios, listarUsuarios],
  ["POST", ENDPOINTS.usuarios, crearUsuario],
  [METODOS.actualizarUsuario, ENDPOINTS.usuario, actualizarUsuario],
  ["GET", ENDPOINTS.dashboard, armarPanel],
  ["GET", ENDPOINTS.alertas, listarAlertas],
  [METODOS.marcarAlertaLeida, ENDPOINTS.alerta, marcarAlertaLeida],
].map(([metodo, entrada, manejador, opciones = {}]) => ({ metodo, regex: patron(entrada), manejador, ...opciones }));

export async function responderSimulado(metodo, ruta, { cuerpo, formulario, parametros, token }) {
  await esperar(DEMORA_MS);
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ErrorSinConexion();

  const db = cargar();
  for (const r of RUTAS) {
    if (r.metodo !== metodo) continue;
    const coincidencia = ruta.match(r.regex);
    if (!coincidencia) continue;

    const usuario = autenticar(db, token);
    if (!r.publica && !usuario) throw new ErrorNoAutenticado();
    const ctx = { db, usuario, cuerpo: cuerpo || {}, formulario, parametros: parametros || {}, p: coincidencia.slice(1) };
    const resultado = await r.manejador(ctx);
    guardar(db);
    if (resultado === undefined || resultado === null) return null;
    return resultado.blob ? resultado : structuredClone(resultado);
  }
  throw new ErrorNoEncontrado(`Ruta simulada inexistente: ${metodo} ${ruta}`);
}

// ---------- Autenticación ----------

function autenticar(db, token) {
  const id = Number(String(token || "").replace("simulado-", ""));
  const usuario = db.usuarios.find((u) => u.id === id && Number(u.activo) === 1);
  return usuario || null;
}

function usuarioPublico(db, u) {
  if (!u) return null;
  const { clave: _clave, ...resto } = u;
  return { ...resto, unidad: db.unidades.find((x) => x.id === u.unidad_id) ?? null };
}

function login({ db, cuerpo }) {
  const u = db.usuarios.find((x) => x.email.toLowerCase() === String(cuerpo.email || "").trim().toLowerCase());
  if (!u || u.clave !== cuerpo.password) {
    throw new ErrorNoAutenticado("El email o la contraseña no son correctos.");
  }
  if (Number(u.activo) !== 1) throw new ErrorSinPermiso("Tu usuario está deshabilitado.");
  return { token: `simulado-${u.id}`, user: usuarioPublico(db, u) };
}

function exigirRol(usuario, roles) {
  if (!roles.includes(usuario.rol)) throw new ErrorSinPermiso();
}

// ---------- Alcance ----------

// Revisión se trata como global (el seed tiene al "Revisor Central" con unidad Rectorado).
function veTodo(u) {
  return u.rol === "admin" || u.rol === "revision" || u.unidad_id === null;
}

function esVisible(u, c) {
  if (!veTodo(u) && c.unidad_id !== u.unidad_id) return false;
  if (u.rol === "consulta") {
    const vigencia = calcularVigencia(c);
    return c.estado === "firmado" && vigencia?.clave !== "vencido";
  }
  return true;
}

function buscarConvenio(db, u, id) {
  const c = db.convenios.find((x) => x.id === Number(id));
  if (!c || !esVisible(u, c)) throw new ErrorNoEncontrado("No encontramos este convenio.");
  return c;
}

function puedeGestionar(u, c) {
  if (u.rol === "admin") return true;
  return u.rol === "gestion" && (u.unidad_id === null || u.unidad_id === c.unidad_id);
}

// ---------- Armado de respuestas ----------

function resumen(db, c) {
  return c ? { id: c.id, codigo: c.codigo, titulo: c.titulo, tipo: c.tipo, estado: c.estado } : null;
}

function conUnidad(db, c) {
  return { ...c, unidad: db.unidades.find((u) => u.id === c.unidad_id) ?? null };
}

function nombreUsuario(db, id) {
  const u = db.usuarios.find((x) => x.id === id);
  return u ? { id: u.id, nombre: u.nombre } : null;
}

function ficha(db, c) {
  const persona = (id) => db.personas.find((p) => p.id === id) ?? null;
  const detalle = db.detalles_pasantia.find((d) => d.convenio_id === c.id);
  return {
    ...conUnidad(db, c),
    creador: nombreUsuario(db, c.creado_por),
    partes: db.partes_convenio
      .filter((pc) => pc.convenio_id === c.id)
      .map((pc) => ({ ...db.partes.find((p) => p.id === pc.parte_id), pivot: { rol_en_convenio: pc.rol_en_convenio } })),
    personas: db.personas_convenio
      .filter((pc) => pc.convenio_id === c.id)
      .map((pc) => ({ ...persona(pc.persona_id), pivot: { rol: pc.rol } })),
    detalle_pasantia: detalle
      ? {
          ...detalle,
          estudiante: persona(detalle.estudiante_persona_id),
          tutor_academico: persona(detalle.tutor_academico_persona_id),
          tutor_institucion: persona(detalle.tutor_institucion_persona_id),
        }
      : null,
    vinculos_origen: db.vinculos_convenio
      .filter((v) => v.convenio_origen_id === c.id)
      .map((v) => ({ ...v, convenio_destino: resumen(db, db.convenios.find((x) => x.id === v.convenio_destino_id)) })),
    vinculos_destino: db.vinculos_convenio
      .filter((v) => v.convenio_destino_id === c.id)
      .map((v) => ({ ...v, convenio_origen: resumen(db, db.convenios.find((x) => x.id === v.convenio_origen_id)) })),
    documentos: db.documentos
      .filter((d) => d.convenio_id === c.id)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
      .map(({ ruta_archivo: _ruta, ...d }) => ({ ...d, usuario: nombreUsuario(db, d.subido_por) })),
    transiciones: db.transiciones_estado
      .filter((t) => t.convenio_id === c.id)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
      .map((t) => ({ ...t, usuario: nombreUsuario(db, t.cambiado_por) })),
    observaciones: db.observaciones_revision
      .filter((o) => o.convenio_id === c.id)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
      .map((o) => ({ ...o, revisor: nombreUsuario(db, o.usuario_revisor_id) })),
  };
}

function notificar(db, usuarioId, titulo, mensaje, convenioId) {
  db.notificaciones.push({ id: siguienteId(db.notificaciones), usuario_id: usuarioId, titulo, mensaje, leida: 0, convenio_id: convenioId, creado_en: ahora() });
}

// ---------- Convenios ----------

function filtrar(db, u, parametros) {
  const P = PARAMETROS_LISTADO;
  const texto = String(parametros[P.texto] || "").trim().toLowerCase();
  return db.convenios
    .filter((c) => esVisible(u, c))
    .filter((c) => !texto || [c.codigo, c.titulo, c.resumen].some((v) => (v || "").toLowerCase().includes(texto)))
    .filter((c) => !parametros[P.tipo] || c.tipo === parametros[P.tipo])
    .filter((c) => !parametros[P.estado] || c.estado === parametros[P.estado])
    .filter((c) => !parametros[P.unidad] || c.unidad_id === Number(parametros[P.unidad]))
    .filter((c) => !parametros[P.vigencia] || calcularVigencia(c)?.clave === parametros[P.vigencia])
    .filter((c) => !parametros[P.desde] || (c.fecha_inicio && c.fecha_inicio >= parametros[P.desde]))
    .filter((c) => !parametros[P.hasta] || (c.fecha_inicio && c.fecha_inicio <= parametros[P.hasta]))
    .sort((a, b) => b.codigo.localeCompare(a.codigo));
}

function listarConvenios({ db, usuario, parametros }) {
  const P = PARAMETROS_LISTADO;
  const todos = filtrar(db, usuario, parametros);
  const porPagina = Math.min(Number(parametros[P.porPagina]) || 10, 100);
  const pagina = Math.max(Number(parametros[P.pagina]) || 1, 1);
  const ultima = Math.max(Math.ceil(todos.length / porPagina), 1);
  return {
    data: todos.slice((pagina - 1) * porPagina, pagina * porPagina).map((c) => conUnidad(db, c)),
    current_page: pagina,
    last_page: ultima,
    per_page: porPagina,
    total: todos.length,
  };
}

function obtenerConvenio({ db, usuario, p }) {
  return ficha(db, buscarConvenio(db, usuario, p[0]));
}

function validarConvenio(db, datos, idActual) {
  const e = {};
  const codigo = String(datos.codigo || "").trim();
  if (!codigo) e.codigo = ["El código es obligatorio."];
  else if (db.convenios.some((c) => c.codigo.toLowerCase() === codigo.toLowerCase() && c.id !== idActual)) {
    e.codigo = ["Ya existe un convenio con ese código."];
  }
  if (!textoValido(datos.titulo, 5)) e.titulo = ["El título debe tener al menos 5 caracteres."];
  if (!TIPOS[datos.tipo]) e.tipo = ["Elegí un tipo de instrumento."];
  if (!db.unidades.some((u) => u.id === Number(datos.unidad_id))) e.unidad_id = ["Elegí la unidad responsable."];
  if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) {
    e.fecha_fin = ["La fecha de fin tiene que ser posterior a la de inicio."];
  }
  const preaviso = Number(datos.dias_preaviso ?? 30);
  if (!Number.isInteger(preaviso) || preaviso < 0 || preaviso > 365) e.dias_preaviso = ["Ingresá un número entre 0 y 365."];

  const idsPartes = (datos.partes || []).map((x) => Number(x.parte_id));
  if (new Set(idsPartes).size !== idsPartes.length) e.partes = ["Hay partes repetidas."];
  else if (idsPartes.some((id) => !db.partes.some((p) => p.id === id))) e.partes = ["Una de las partes no existe."];

  if (datos.tipo === "pasantia") {
    const d = datos.detalle_pasantia || {};
    if (!db.personas.some((p) => p.id === Number(d.estudiante_persona_id))) e["detalle_pasantia.estudiante_persona_id"] = ["Elegí al estudiante."];
    if (!textoValido(d.carrera, 3)) e["detalle_pasantia.carrera"] = ["Indicá la carrera."];
    const horas = Number(d.horas_semanales);
    if (!Number.isInteger(horas) || horas < 1 || horas > MAX_HORAS_PASANTIA) {
      e["detalle_pasantia.horas_semanales"] = [`Entre 1 y ${MAX_HORAS_PASANTIA} horas (Ley 26.427).`];
    }
  }
  validacion(e);
}

function aplicarDatos(db, c, datos) {
  c.codigo = String(datos.codigo).trim();
  c.titulo = datos.titulo.trim();
  c.tipo = datos.tipo;
  c.unidad_id = Number(datos.unidad_id);
  c.resumen = datos.resumen || null;
  c.fecha_inicio = datos.fecha_inicio || null;
  c.fecha_fin = datos.fecha_fin || null;
  c.dias_preaviso = Number(datos.dias_preaviso ?? 30);
  for (const campo of Object.keys(CAMPOS_FICHA_EXTRA)) {
    if (campo in datos) c[campo] = datos[campo] || null;
  }

  if (Array.isArray(datos.partes)) {
    db.partes_convenio = db.partes_convenio.filter((pc) => pc.convenio_id !== c.id);
    for (const p of datos.partes) {
      db.partes_convenio.push({ id: siguienteId(db.partes_convenio), convenio_id: c.id, parte_id: Number(p.parte_id), rol_en_convenio: p.rol_en_convenio || null });
    }
  }
  if (Array.isArray(datos.personas)) {
    db.personas_convenio = db.personas_convenio.filter((pc) => pc.convenio_id !== c.id);
    for (const p of datos.personas) {
      db.personas_convenio.push({ id: siguienteId(db.personas_convenio), convenio_id: c.id, persona_id: Number(p.persona_id), rol: p.rol || "Interviniente" });
    }
  }
  db.detalles_pasantia = db.detalles_pasantia.filter((d) => d.convenio_id !== c.id);
  if (c.tipo === "pasantia" && datos.detalle_pasantia) {
    const d = datos.detalle_pasantia;
    db.detalles_pasantia.push({
      id: siguienteId(db.detalles_pasantia),
      convenio_id: c.id,
      estudiante_persona_id: Number(d.estudiante_persona_id),
      tutor_academico_persona_id: d.tutor_academico_persona_id ? Number(d.tutor_academico_persona_id) : null,
      tutor_institucion_persona_id: d.tutor_institucion_persona_id ? Number(d.tutor_institucion_persona_id) : null,
      carrera: d.carrera,
      horas_semanales: Number(d.horas_semanales),
      monto_estimulo: d.monto_estimulo === "" || d.monto_estimulo === undefined ? null : Number(d.monto_estimulo),
      aseguradora: d.aseguradora || null,
      numero_poliza: d.numero_poliza || null,
    });
  }
}

function crearConvenio({ db, usuario, cuerpo }) {
  exigirRol(usuario, ["admin", "gestion"]);
  if (usuario.rol === "gestion" && usuario.unidad_id !== null && Number(cuerpo.unidad_id) !== usuario.unidad_id) {
    throw new ErrorSinPermiso("Solo podés crear convenios de tu unidad.");
  }
  validarConvenio(db, cuerpo, null);
  const c = { id: siguienteId(db.convenios), estado: "borrador", version: 1, creado_por: usuario.id, creado_en: ahora(), actualizado_en: ahora() };
  db.convenios.push(c);
  aplicarDatos(db, c, cuerpo);
  db.transiciones_estado.push({ id: siguienteId(db.transiciones_estado), convenio_id: c.id, estado_anterior: null, estado_nuevo: "borrador", motivo: "Alta del borrador.", cambiado_por: usuario.id, creado_en: ahora() });
  return ficha(db, c);
}

function actualizarConvenio({ db, usuario, cuerpo, p }) {
  const c = buscarConvenio(db, usuario, p[0]);
  if (!puedeGestionar(usuario, c)) throw new ErrorSinPermiso();
  if (Number(cuerpo.version) !== Number(c.version)) {
    throw new ErrorConflicto("Otra persona guardó cambios en este convenio mientras lo editabas.", {
      message: "Conflicto de versión.",
      actual: ficha(db, c),
    });
  }
  if (c.estado !== "borrador") validacion({ estado: ["Solo se pueden editar convenios en borrador."] });
  validarConvenio(db, cuerpo, c.id);
  aplicarDatos(db, c, cuerpo);
  c.version += 1;
  c.actualizado_en = ahora();
  return ficha(db, c);
}

function cambiarEstado({ db, usuario, cuerpo, p }) {
  const c = buscarConvenio(db, usuario, p[0]);
  if (cuerpo.version !== undefined && Number(cuerpo.version) !== Number(c.version)) {
    throw new ErrorConflicto("El convenio cambió mientras lo mirabas. Recargá la ficha.", { message: "Conflicto de versión.", actual: ficha(db, c) });
  }
  const regla = TRANSICIONES[c.estado]?.[cuerpo.estado_nuevo];
  if (!regla) {
    validacion({ estado_nuevo: [`No se puede pasar de ${ESTADOS[c.estado]} a ${ESTADOS[cuerpo.estado_nuevo] || cuerpo.estado_nuevo}.`] });
  }
  if (!regla.roles.includes(usuario.rol)) throw new ErrorSinPermiso();
  if (usuario.rol === "gestion" && !puedeGestionar(usuario, c)) throw new ErrorSinPermiso();
  if (!textoValido(cuerpo.motivo, 5)) validacion({ motivo: ["Escribí el fundamento (al menos 5 caracteres)."] });

  const pendientes = db.observaciones_revision.filter((o) => o.convenio_id === c.id && !Number(o.esta_resuelta));
  if (cuerpo.estado_nuevo === "aprobado") {
    const e = {};
    const cantidadPartes = db.partes_convenio.filter((pc) => pc.convenio_id === c.id).length;
    if (cantidadPartes < MINIMO_PARTES_PARA_APROBAR) e.partes = [`Hacen falta al menos ${MINIMO_PARTES_PARA_APROBAR} partes para aprobar (hay ${cantidadPartes}).`];
    if (pendientes.length) e.observaciones = [`Hay ${pendientes.length} observación(es) sin resolver.`];
    validacion(e);
  }
  if (c.estado === "revision" && cuerpo.estado_nuevo === "borrador" && !pendientes.length) {
    validacion({ observaciones: ["Para devolver, cargá al menos una observación."] });
  }
  if (cuerpo.estado_nuevo === "firmado" && !c.fecha_inicio) c.fecha_inicio = aFechaIso(hoySinHora());

  const anterior = c.estado;
  c.estado = cuerpo.estado_nuevo;
  c.version += 1;
  c.actualizado_en = ahora();
  db.transiciones_estado.push({ id: siguienteId(db.transiciones_estado), convenio_id: c.id, estado_anterior: anterior, estado_nuevo: c.estado, motivo: cuerpo.motivo.trim(), cambiado_por: usuario.id, creado_en: ahora() });

  if (c.estado === "revision") {
    for (const r of db.usuarios.filter((x) => x.rol === "revision" && Number(x.activo) === 1)) {
      notificar(db, r.id, "Nuevo convenio enviado a revisión", `${usuario.nombre} envió ${c.codigo} · ${c.titulo} para revisión.`, c.id);
    }
  }
  if (c.creado_por !== usuario.id) {
    notificar(db, c.creado_por, `${c.codigo} pasó a ${ESTADOS[c.estado]}`, `${c.titulo}. Fundamento: ${cuerpo.motivo.trim()}`, c.id);
  }
  return ficha(db, c);
}

function exportarCsv({ db, usuario, parametros }) {
  const filas = filtrar(db, usuario, parametros);
  const unidad = (c) => db.unidades.find((u) => u.id === c.unidad_id)?.nombre ?? "";
  const csv = generarCsv(
    [
      { titulo: "Código", valor: (c) => c.codigo },
      { titulo: "Título", valor: (c) => c.titulo },
      { titulo: "Tipo", valor: (c) => TIPOS[c.tipo] },
      { titulo: "Estado", valor: (c) => ESTADOS[c.estado] },
      { titulo: "Unidad", valor: unidad },
      { titulo: "Inicio", valor: (c) => c.fecha_inicio ?? "" },
      { titulo: "Vencimiento", valor: (c) => c.fecha_fin ?? "Sin vencimiento registrado" },
      { titulo: "Vigencia", valor: (c) => calcularVigencia(c)?.etiqueta ?? "" },
    ],
    filas,
  );
  return { blob: new Blob([csv], { type: "text/csv;charset=utf-8" }), nombre: `convenios-${aFechaIso(new Date())}.csv` };
}

// ---------- Vínculos ----------

const COMPATIBLES = {
  especifico_de: (origen, destino) => ["especifico", "pasantia"].includes(origen.tipo) && destino.tipo === "marco",
  adenda_de: (origen) => origen.tipo === "adenda",
  renovacion_de: (origen, destino) => origen.tipo === destino.tipo,
  sustitucion_de: (origen, destino) => origen.tipo === destino.tipo,
};

function crearVinculo({ db, usuario, cuerpo, p }) {
  const origen = buscarConvenio(db, usuario, p[0]);
  if (!puedeGestionar(usuario, origen)) throw new ErrorSinPermiso();
  if (origen.estado !== "borrador") validacion({ convenio_destino_id: ["Los vínculos solo se cambian en borrador."] });
  const destino = db.convenios.find((c) => c.id === Number(cuerpo.convenio_destino_id));
  const e = {};
  if (!TIPOS_VINCULO[cuerpo.tipo_vinculo]) e.tipo_vinculo = ["Elegí el tipo de vínculo."];
  if (!destino) e.convenio_destino_id = ["Elegí el convenio antecedente."];
  else if (destino.id === origen.id) e.convenio_destino_id = ["Un convenio no se puede vincular consigo mismo."];
  else if (TIPOS_VINCULO[cuerpo.tipo_vinculo] && !COMPATIBLES[cuerpo.tipo_vinculo](origen, destino)) {
    e.tipo_vinculo = [`Un ${TIPOS[origen.tipo].toLowerCase()} no puede ser "${TIPOS_VINCULO[cuerpo.tipo_vinculo].toLowerCase()}" un ${TIPOS[destino.tipo].toLowerCase()}.`];
  } else if (db.vinculos_convenio.some((v) => v.convenio_origen_id === origen.id && v.convenio_destino_id === destino.id && v.tipo_vinculo === cuerpo.tipo_vinculo)) {
    e.convenio_destino_id = ["Ese vínculo ya existe."];
  }
  validacion(e);
  const v = { id: siguienteId(db.vinculos_convenio), convenio_origen_id: origen.id, convenio_destino_id: destino.id, tipo_vinculo: cuerpo.tipo_vinculo, creado_en: ahora() };
  db.vinculos_convenio.push(v);
  return { ...v, convenio_destino: resumen(db, destino) };
}

function quitarVinculo({ db, usuario, p }) {
  const origen = buscarConvenio(db, usuario, p[0]);
  if (!puedeGestionar(usuario, origen)) throw new ErrorSinPermiso();
  if (origen.estado !== "borrador") validacion({ vinculo: ["Los vínculos solo se cambian en borrador."] });
  db.vinculos_convenio = db.vinculos_convenio.filter((v) => !(v.id === Number(p[1]) && v.convenio_origen_id === origen.id));
  return null;
}

// ---------- Documentos ----------

async function subirDocumento({ db, usuario, formulario, p }) {
  const c = buscarConvenio(db, usuario, p[0]);
  const permitido =
    usuario.rol === "admin" ||
    (usuario.rol === "gestion" && puedeGestionar(usuario, c)) ||
    (usuario.rol === "revision" && c.estado === "revision");
  if (!permitido || ["rescindido", "archivado"].includes(c.estado)) throw new ErrorSinPermiso();

  const archivo = formulario?.get(CAMPO_ARCHIVO);
  const tipo = formulario?.get("tipo_documento") || "otro";
  const e = {};
  if (!archivo || typeof archivo === "string") e.archivo = ["Elegí un archivo PDF."];
  else {
    const cabecera = await archivo.slice(0, 5).text();
    if (cabecera !== "%PDF-") e.archivo = ["El archivo no es un PDF válido."];
    else if (archivo.size > MAX_PDF_BYTES) e.archivo = ["El archivo supera los 20 MB."];
  }
  if (!TIPOS_DOCUMENTO[tipo]) e.tipo_documento = ["Elegí el tipo de documento."];
  validacion(e);

  const buffer = await archivo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (db.documentos.some((d) => d.convenio_id === c.id && d.hash_sha256 === hash)) {
    validacion({ archivo: ["Ese archivo ya está cargado en este convenio (mismo SHA-256)."] });
  }
  const version = db.documentos.filter((d) => d.convenio_id === c.id && d.tipo_documento === tipo).length + 1;
  const d = {
    id: siguienteId(db.documentos),
    convenio_id: c.id,
    tipo_documento: tipo,
    nombre_original: archivo.name,
    ruta_archivo: `storage/app/private/agreements/${c.id}/v${version}_${tipo}.pdf`,
    tamano_bytes: archivo.size,
    tipo_mime: "application/pdf",
    hash_sha256: hash,
    version,
    subido_por: usuario.id,
    creado_en: ahora(),
  };
  db.documentos.push(d);
  archivosEnMemoria.set(d.id, archivo);
  const { ruta_archivo: _ruta, ...publico } = d;
  return { ...publico, usuario: nombreUsuario(db, usuario.id) };
}

function descargarDocumento({ db, usuario, p }) {
  const d = db.documentos.find((x) => x.id === Number(p[0]));
  if (!d) throw new ErrorNoEncontrado();
  buscarConvenio(db, usuario, d.convenio_id); // controla el alcance
  const guardado = archivosEnMemoria.get(d.id);
  return { blob: guardado || pdfDeEjemplo(d.nombre_original), nombre: d.nombre_original };
}

// PDF mínimo de una página para simular la descarga de los documentos del seed.
function pdfDeEjemplo(nombre) {
  const texto = `Documento simulado: ${nombre}`.replace(/[()\\]/g, "");
  const contenido = `BT /F1 14 Tf 72 720 Td (${texto}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const posiciones = [];
  objetos.forEach((o, i) => {
    posiciones.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posiciones.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

// ---------- Observaciones ----------

function crearObservacion({ db, usuario, cuerpo, p }) {
  const c = buscarConvenio(db, usuario, p[0]);
  exigirRol(usuario, ["admin", "revision"]);
  if (c.estado !== "revision") validacion({ observacion: ["Solo se observan convenios en revisión."] });
  if (!textoValido(cuerpo.observacion, 5)) validacion({ observacion: ["Escribí la observación (al menos 5 caracteres)."] });
  const o = { id: siguienteId(db.observaciones_revision), convenio_id: c.id, usuario_revisor_id: usuario.id, observacion: cuerpo.observacion.trim(), esta_resuelta: 0, creado_en: ahora() };
  db.observaciones_revision.push(o);
  notificar(db, c.creado_por, "Observación emitida", `${usuario.nombre} dejó una observación en ${c.codigo}.`, c.id);
  return { ...o, revisor: nombreUsuario(db, usuario.id) };
}

function resolverObservacion({ db, usuario, cuerpo, p }) {
  exigirRol(usuario, ["admin", "revision"]);
  const o = db.observaciones_revision.find((x) => x.id === Number(p[0]));
  if (!o) throw new ErrorNoEncontrado();
  buscarConvenio(db, usuario, o.convenio_id);
  o.esta_resuelta = cuerpo.esta_resuelta ? 1 : 0;
  return { ...o, revisor: nombreUsuario(db, o.usuario_revisor_id) };
}

// ---------- Catálogos ----------

function listarPartes({ db, parametros }) {
  const q = String(parametros.q || "").toLowerCase();
  return db.partes.filter((x) => !q || x.nombre.toLowerCase().includes(q) || (x.cuit_cuil || "").includes(q));
}

function crearParte({ db, usuario, cuerpo }) {
  exigirRol(usuario, ["admin", "gestion"]);
  const e = {};
  if (!textoValido(cuerpo.nombre, 3)) e.nombre = ["Indicá el nombre o la razón social."];
  if (cuerpo.cuit_cuil && !/^\d{2}-\d{8}-\d$/.test(cuerpo.cuit_cuil)) e.cuit_cuil = ["Formato NN-NNNNNNNN-N."];
  if (!["fisica", "juridica"].includes(cuerpo.tipo_personeria)) e.tipo_personeria = ["Elegí el tipo de personería."];
  if (cuerpo.email && !emailValido(cuerpo.email)) e.email = ["El email no es válido."];
  validacion(e);
  const parte = { id: siguienteId(db.partes), nombre: cuerpo.nombre.trim(), cuit_cuil: cuerpo.cuit_cuil || null, tipo_personeria: cuerpo.tipo_personeria, email: cuerpo.email || null, telefono: cuerpo.telefono || null, direccion: cuerpo.direccion || null };
  db.partes.push(parte);
  return parte;
}

function listarPersonas({ db, usuario, parametros }) {
  const q = String(parametros.q || "").toLowerCase();
  const lista = db.personas.filter((x) => !q || `${x.apellido} ${x.nombre}`.toLowerCase().includes(q) || x.dni.includes(q));
  // Consulta solo ve nombres (sin datos de contacto).
  if (usuario.rol === "consulta") return lista.map(({ id, nombre, apellido }) => ({ id, nombre, apellido }));
  return lista;
}

function crearPersona({ db, usuario, cuerpo }) {
  exigirRol(usuario, ["admin", "gestion"]);
  const e = {};
  if (!textoValido(cuerpo.nombre, 2)) e.nombre = ["Indicá el nombre."];
  if (!textoValido(cuerpo.apellido, 2)) e.apellido = ["Indicá el apellido."];
  if (!/^\d{7,8}$/.test(String(cuerpo.dni || ""))) e.dni = ["El DNI tiene que tener 7 u 8 números, sin puntos."];
  else if (db.personas.some((p) => p.dni === String(cuerpo.dni))) e.dni = ["Ya existe una persona con ese DNI."];
  if (cuerpo.email && !emailValido(cuerpo.email)) e.email = ["El email no es válido."];
  validacion(e);
  const persona = { id: siguienteId(db.personas), nombre: cuerpo.nombre.trim(), apellido: cuerpo.apellido.trim(), dni: String(cuerpo.dni), email: cuerpo.email || null, telefono: cuerpo.telefono || null };
  db.personas.push(persona);
  return persona;
}

// ---------- Usuarios ----------

function listarUsuarios({ db, usuario }) {
  exigirRol(usuario, ["admin"]);
  return db.usuarios.map((u) => usuarioPublico(db, u));
}

function validarUsuario(db, datos, idActual) {
  const e = {};
  if (!textoValido(datos.nombre, 3)) e.nombre = ["Indicá el nombre."];
  if (!emailValido(String(datos.email || ""))) e.email = ["El email no es válido."];
  else if (db.usuarios.some((u) => u.email.toLowerCase() === datos.email.toLowerCase() && u.id !== idActual)) e.email = ["Ya existe un usuario con ese email."];
  if (!ROLES[datos.rol]) e.rol = ["Elegí un rol."];
  if (datos.unidad_id && !db.unidades.some((u) => u.id === Number(datos.unidad_id))) e.unidad_id = ["La unidad no existe."];
  if (datos.rol === "admin" && datos.unidad_id) e.unidad_id = ["Administración siempre tiene alcance global."];
  return e;
}

function crearUsuario({ db, usuario, cuerpo }) {
  exigirRol(usuario, ["admin"]);
  const e = validarUsuario(db, cuerpo, null);
  if (!textoValido(cuerpo.password, 8)) e.password = ["La contraseña inicial necesita al menos 8 caracteres."];
  validacion(e);
  const nuevo = { id: siguienteId(db.usuarios), nombre: cuerpo.nombre.trim(), email: cuerpo.email.trim(), clave: cuerpo.password, rol: cuerpo.rol, unidad_id: cuerpo.unidad_id ? Number(cuerpo.unidad_id) : null, activo: 1 };
  db.usuarios.push(nuevo);
  return usuarioPublico(db, nuevo);
}

function actualizarUsuario({ db, usuario, cuerpo, p }) {
  exigirRol(usuario, ["admin"]);
  const u = db.usuarios.find((x) => x.id === Number(p[0]));
  if (!u) throw new ErrorNoEncontrado();
  const datos = { ...usuarioPublico(db, u), ...cuerpo };
  validacion(validarUsuario(db, datos, u.id));
  if (u.id === usuario.id && (datos.rol !== "admin" || !datos.activo)) {
    validacion({ rol: ["No podés quitarte el rol de administración ni deshabilitarte."] });
  }
  u.nombre = datos.nombre.trim();
  u.email = datos.email.trim();
  u.rol = datos.rol;
  u.unidad_id = datos.unidad_id ? Number(datos.unidad_id) : null;
  u.activo = datos.activo ? 1 : 0;
  return usuarioPublico(db, u);
}

// ---------- Panel y avisos ----------

function armarPanel({ db, usuario }) {
  const visibles = db.convenios.filter((c) => esVisible(usuario, c));
  const contar = (clave, valores) => Object.keys(valores).map((v) => ({ [clave]: v, cantidad: visibles.filter((c) => c[clave] === v).length }));
  const conVigencia = visibles.map((c) => ({ c, v: calcularVigencia(c) }));
  const personasUnicas = new Set([
    ...db.personas_convenio.filter((pc) => visibles.some((c) => c.id === pc.convenio_id)).map((pc) => pc.persona_id),
    ...db.detalles_pasantia
      .filter((d) => visibles.some((c) => c.id === d.convenio_id))
      .flatMap((d) => [d.estudiante_persona_id, d.tutor_academico_persona_id, d.tutor_institucion_persona_id])
      .filter(Boolean),
  ]);
  const porAnio = {};
  for (const c of visibles.filter((x) => ["firmado", "rescindido", "archivado"].includes(x.estado) && x.fecha_inicio)) {
    const anio = leerFecha(c.fecha_inicio).getFullYear();
    porAnio[anio] = (porAnio[anio] || 0) + 1;
  }
  const plazos = conVigencia
    .filter(({ v }) => v && ["proximo", "vencido"].includes(v.clave))
    .sort((a, b) => (a.c.fecha_fin || "").localeCompare(b.c.fecha_fin || ""))
    .map(({ c }) => conUnidad(db, c));

  return {
    total: visibles.length,
    firmados_vigentes: conVigencia.filter(({ v }) => v && ["vigente", "proximo", "sin_vencimiento"].includes(v.clave)).length,
    proximos_a_vencer: conVigencia.filter(({ v }) => v?.clave === "proximo").length,
    personas_unicas: personasUnicas.size,
    por_estado: contar("estado", ESTADOS),
    por_tipo: contar("tipo", TIPOS),
    por_unidad: db.unidades
      .map((u) => ({ unidad: u.codigo || u.nombre, cantidad: visibles.filter((c) => c.unidad_id === u.id).length }))
      .filter((x) => x.cantidad > 0),
    por_anio: Object.entries(porAnio).sort().map(([anio, cantidad]) => ({ anio, cantidad })),
    plazos,
  };
}

function listarAlertas({ db, usuario }) {
  return db.notificaciones
    .filter((n) => n.usuario_id === usuario.id)
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
}

function marcarAlertaLeida({ db, usuario, p }) {
  const n = db.notificaciones.find((x) => x.id === Number(p[0]) && x.usuario_id === usuario.id);
  if (!n) throw new ErrorNoEncontrado();
  n.leida = 1;
  return n;
}
