// Adaptadores: convierten lo que devuelve Laravel en la forma que usa la web.
// Aceptan varias formas posibles (API Resources con "data", relaciones con "pivot",
// tablas intermedias con el objeto anidado, etc.), así el front no se rompe
// si el backend arma las respuestas un poco distinto. Si algo no coincide, se arregla acá.

// { data: {...} } -> {...}
export function desenvolver(respuesta) {
  if (respuesta && typeof respuesta === "object" && !Array.isArray(respuesta) && "data" in respuesta && !Array.isArray(respuesta.data)) {
    return respuesta.data;
  }
  return respuesta;
}

// Paginación de Laravel (paginate() o API Resources) -> { items, pagina, ultimaPagina, total }
export function normalizarPagina(respuesta, adaptarItem = (x) => x) {
  if (Array.isArray(respuesta)) {
    return { items: respuesta.map(adaptarItem), pagina: 1, ultimaPagina: 1, total: respuesta.length };
  }
  const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
  const meta = respuesta?.meta || respuesta || {};
  return {
    items: lista.map(adaptarItem),
    pagina: Number(meta.current_page ?? 1),
    ultimaPagina: Number(meta.last_page ?? 1),
    total: Number(meta.total ?? lista.length),
  };
}

// Lista que puede venir sola o paginada.
export function normalizarLista(respuesta, adaptarItem = (x) => x) {
  return normalizarPagina(respuesta, adaptarItem).items;
}

export function adaptarUnidad(u) {
  if (!u) return null;
  return { id: u.id, nombre: u.nombre, codigo: u.codigo ?? null, descripcion: u.descripcion ?? null };
}

export function adaptarUsuario(u) {
  if (!u) return null;
  return {
    id: u.id,
    nombre: u.nombre ?? u.name ?? "",
    email: u.email,
    rol: u.rol,
    unidad_id: u.unidad_id ?? null,
    unidad: adaptarUnidad(u.unidad),
    activo: u.activo === undefined ? true : Boolean(Number(u.activo)),
  };
}

export function adaptarParte(p) {
  // Puede venir como parte con pivot (belongsToMany) o como fila de partes_convenio con "parte" adentro.
  const base = p?.parte ?? p;
  return {
    id: base?.id ?? p?.parte_id,
    nombre: base?.nombre ?? "",
    cuit_cuil: base?.cuit_cuil ?? null,
    tipo_personeria: base?.tipo_personeria ?? null,
    email: base?.email ?? null,
    telefono: base?.telefono ?? null,
    direccion: base?.direccion ?? null,
    rol_en_convenio: p?.pivot?.rol_en_convenio ?? p?.rol_en_convenio ?? null,
  };
}

export function adaptarPersona(p) {
  const base = p?.persona ?? p;
  return {
    id: base?.id ?? p?.persona_id,
    nombre: base?.nombre ?? "",
    apellido: base?.apellido ?? "",
    dni: base?.dni ?? null,
    email: base?.email ?? null,
    telefono: base?.telefono ?? null,
    rol: p?.pivot?.rol ?? p?.rol ?? null,
  };
}

function resumenConvenio(c) {
  if (!c) return null;
  return { id: c.id, codigo: c.codigo, titulo: c.titulo, tipo: c.tipo, estado: c.estado };
}

// Vínculos vistos desde el convenio actual:
// - "antecedente": este convenio es el origen (ej. esta adenda modifica a otro)
// - "derivado": este convenio es el destino (ej. un específico cuelga de este marco)
function adaptarVinculos(c) {
  const id = Number(c.id);
  const crudos = [
    ...(c.vinculos ?? []),
    ...(c.vinculos_origen ?? c.vinculos_como_origen ?? []),
    ...(c.vinculos_destino ?? c.vinculos_como_destino ?? []),
  ];
  const vistos = new Set();
  const resultado = [];
  for (const v of crudos) {
    if (!v || vistos.has(v.id)) continue;
    vistos.add(v.id);
    const esOrigen = Number(v.convenio_origen_id) === id;
    const otro = esOrigen ? v.convenio_destino ?? v.destino : v.convenio_origen ?? v.origen;
    resultado.push({
      id: v.id,
      tipo_vinculo: v.tipo_vinculo,
      direccion: esOrigen ? "antecedente" : "derivado",
      convenio: resumenConvenio(otro) ?? { id: esOrigen ? v.convenio_destino_id : v.convenio_origen_id },
      creado_en: v.creado_en ?? v.created_at ?? null,
    });
  }
  return resultado;
}

export function adaptarDocumento(d) {
  return {
    id: d.id,
    convenio_id: d.convenio_id,
    tipo_documento: d.tipo_documento,
    nombre_original: d.nombre_original,
    tamano_bytes: Number(d.tamano_bytes ?? 0),
    tipo_mime: d.tipo_mime ?? "application/pdf",
    hash_sha256: d.hash_sha256 ?? null,
    version: Number(d.version ?? 1),
    subido_por: d.subido_por,
    subido_por_nombre: d.usuario?.nombre ?? d.subidor?.nombre ?? null,
    creado_en: d.creado_en ?? d.created_at ?? null,
  };
}

export function adaptarTransicion(t) {
  return {
    id: t.id,
    estado_anterior: t.estado_anterior,
    estado_nuevo: t.estado_nuevo,
    motivo: t.motivo,
    cambiado_por: t.cambiado_por,
    usuario_nombre: t.usuario?.nombre ?? t.cambiado_por_usuario?.nombre ?? null,
    creado_en: t.creado_en ?? t.created_at ?? null,
  };
}

export function adaptarObservacion(o) {
  return {
    id: o.id,
    convenio_id: o.convenio_id,
    observacion: o.observacion,
    esta_resuelta: Boolean(Number(o.esta_resuelta)),
    respuesta: o.respuesta ?? null, // el enunciado pide guardar la respuesta del equipo gestor
    usuario_revisor_id: o.usuario_revisor_id,
    revisor_nombre: o.revisor?.nombre ?? o.usuario_revisor?.nombre ?? null,
    creado_en: o.creado_en ?? o.created_at ?? null,
  };
}

function adaptarPasantia(d) {
  if (!d) return null;
  return {
    id: d.id,
    estudiante_persona_id: d.estudiante_persona_id,
    tutor_academico_persona_id: d.tutor_academico_persona_id ?? null,
    tutor_institucion_persona_id: d.tutor_institucion_persona_id ?? null,
    estudiante: d.estudiante ? adaptarPersona(d.estudiante) : null,
    tutor_academico: d.tutor_academico ? adaptarPersona(d.tutor_academico) : null,
    tutor_institucion: d.tutor_institucion ? adaptarPersona(d.tutor_institucion) : null,
    carrera: d.carrera ?? "",
    horas_semanales: d.horas_semanales ?? null,
    monto_estimulo: d.monto_estimulo ?? null,
    aseguradora: d.aseguradora ?? null,
    numero_poliza: d.numero_poliza ?? null,
  };
}

const CAMPOS_BASE = [
  "id", "codigo", "titulo", "tipo", "estado", "unidad_id", "resumen",
  "fecha_inicio", "fecha_fin", "dias_preaviso", "version", "creado_por",
];

export function adaptarConvenio(entrada) {
  const c = desenvolver(entrada);
  if (!c) return null;
  const convenio = {};
  for (const campo of CAMPOS_BASE) convenio[campo] = c[campo] ?? null;
  convenio.id = c.id;
  convenio.version = Number(c.version ?? 1);
  convenio.dias_preaviso = c.dias_preaviso === null || c.dias_preaviso === undefined ? 30 : Number(c.dias_preaviso);
  convenio.fecha_inicio = c.fecha_inicio ? String(c.fecha_inicio).slice(0, 10) : null;
  convenio.fecha_fin = c.fecha_fin ? String(c.fecha_fin).slice(0, 10) : null;
  convenio.creado_en = c.creado_en ?? c.created_at ?? null;
  convenio.actualizado_en = c.actualizado_en ?? c.updated_at ?? null;
  convenio.unidad = adaptarUnidad(c.unidad);
  convenio.creador_nombre = c.creador?.nombre ?? c.usuario?.nombre ?? null;

  // Relaciones: solo vienen en la ficha (GET /agreements/{id}).
  convenio.partes = (c.partes ?? c.partes_convenio ?? []).map(adaptarParte);
  convenio.personas = (c.personas ?? c.personas_convenio ?? []).map(adaptarPersona);
  convenio.detalle_pasantia = adaptarPasantia(c.detalle_pasantia ?? c.detalles_pasantia ?? null);
  convenio.vinculos = adaptarVinculos(c);
  convenio.documentos = (c.documentos ?? []).map(adaptarDocumento);
  convenio.transiciones = (c.transiciones ?? c.transiciones_estado ?? []).map(adaptarTransicion);
  convenio.observaciones = (c.observaciones ?? c.observaciones_revision ?? []).map(adaptarObservacion);

  // Campos extra de la ficha (si el backend los agrega a la tabla convenios).
  convenio.extras = {};
  for (const [clave, valor] of Object.entries(c)) {
    if (!(clave in convenio) && !CLAVES_RELACIONES.has(clave) && (typeof valor !== "object" || valor === null)) {
      convenio.extras[clave] = valor;
    }
  }
  return convenio;
}

const CLAVES_RELACIONES = new Set([
  "partes_convenio", "personas_convenio", "detalles_pasantia", "transiciones_estado",
  "observaciones_revision", "vinculos_origen", "vinculos_destino", "vinculos_como_origen",
  "vinculos_como_destino", "created_at", "updated_at", "creador", "usuario",
]);

export function adaptarNotificacion(n) {
  return {
    id: n.id,
    titulo: n.titulo,
    mensaje: n.mensaje,
    leida: Boolean(Number(n.leida)),
    convenio_id: n.convenio_id ?? null, // el enunciado pide un enlace al convenio
    creado_en: n.creado_en ?? n.created_at ?? null,
  };
}

// GET /dashboard. Acepta listas [{clave, cantidad}] u objetos {clave: cantidad}.
export function adaptarDashboard(entrada) {
  const d = desenvolver(entrada) || {};
  const aLista = (valor, nombreClave) => {
    if (!valor) return [];
    if (Array.isArray(valor)) {
      return valor.map((x) => ({
        clave: String(x[nombreClave] ?? x.clave ?? x.nombre ?? x.unidad ?? x.anio ?? ""),
        cantidad: Number(x.cantidad ?? x.total ?? 0),
      }));
    }
    return Object.entries(valor).map(([clave, cantidad]) => ({ clave, cantidad: Number(cantidad) }));
  };
  return {
    total: Number(d.total ?? 0),
    firmados_vigentes: Number(d.firmados_vigentes ?? 0),
    proximos_a_vencer: Number(d.proximos_a_vencer ?? d.cantidad_proximos ?? 0),
    personas_unicas: Number(d.personas_unicas ?? 0),
    por_estado: aLista(d.por_estado, "estado"),
    por_tipo: aLista(d.por_tipo, "tipo"),
    por_unidad: aLista(d.por_unidad, "unidad"),
    por_anio: aLista(d.por_anio, "anio"),
    plazos: (d.plazos ?? d.proximos ?? []).map((c) => adaptarConvenio(c)),
  };
}

export function adaptarLogin(respuesta) {
  const r = desenvolver(respuesta) || {};
  return {
    token: r.token ?? r.access_token ?? r.plainTextToken ?? null,
    usuario: adaptarUsuario(r.usuario ?? r.user ?? null),
  };
}
