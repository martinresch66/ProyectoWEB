// Reglas y textos del dominio que usa toda la web.
// Los valores (claves) son exactamente los de la base de datos de /database/schema.sql.

export const TIPOS = {
  marco: "Marco",
  especifico: "Específico",
  adenda: "Adenda",
  pasantia: "Pasantía",
};

export const ESTADOS = {
  borrador: "Borrador",
  revision: "En revisión",
  aprobado: "Aprobado",
  firmado: "Firmado",
  rescindido: "Rescindido",
  archivado: "Archivado",
};

export const ROLES = {
  admin: "Administración",
  gestion: "Gestión",
  revision: "Revisión",
  consulta: "Consulta",
};

export const TIPOS_VINCULO = {
  especifico_de: "Específico de",
  adenda_de: "Adenda de",
  renovacion_de: "Renovación de",
  sustitucion_de: "Sustitución de",
};

export const TIPOS_DOCUMENTO = {
  convenio_firmado: "Convenio firmado",
  anexo: "Anexo",
  dictamen: "Dictamen",
  resolucion: "Resolución",
  acta_pasantia: "Acta de pasantía",
  otro: "Otro",
};

// Campos de la ficha que pide el enunciado y que todavía no están en schema.sql.
// La web los muestra y los envía si el backend los agrega (ver CONTRATO-API.md).
export const CAMPOS_FICHA_EXTRA = {
  objeto: "Objeto",
  alcance: "Alcance",
  obligaciones: "Obligaciones",
  condiciones_rescision: "Condiciones de rescisión",
  marco_legal: "Marco legal",
  resolucion: "Resolución",
  expediente: "Expediente o referencia",
  condiciones_renovacion: "Condiciones de renovación",
  confidencialidad: "Confidencialidad",
  notas: "Notas internas",
};

// Circuito de estados: desde cada estado, a qué estados se puede pasar y quién puede hacerlo.
// El servidor vuelve a validar todo; esto solo sirve para mostrar los botones correctos.
export const TRANSICIONES = {
  borrador: {
    revision: { roles: ["admin", "gestion"], accion: "Enviar a revisión" },
    archivado: { roles: ["admin"], accion: "Descartar borrador" },
  },
  revision: {
    aprobado: { roles: ["admin", "revision"], accion: "Aprobar" },
    borrador: { roles: ["admin", "revision"], accion: "Devolver con observaciones", pideObservacion: true },
  },
  aprobado: {
    firmado: { roles: ["admin", "gestion"], accion: "Registrar firma" },
    borrador: { roles: ["admin"], accion: "Devolver a borrador" },
  },
  firmado: {
    rescindido: { roles: ["admin"], accion: "Rescindir" },
    archivado: { roles: ["admin"], accion: "Archivar" },
  },
  rescindido: {
    archivado: { roles: ["admin"], accion: "Archivar" },
  },
  archivado: {},
};

export const MINIMO_PARTES_PARA_APROBAR = 2;
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_HORAS_PASANTIA = 20; // Ley 26.427

// ---------- Fechas ----------

// Convierte "2026-11-10" (o "2026-11-10T00:00:00Z") en una fecha local sin corrimientos de zona horaria.
export function leerFecha(valor) {
  if (!valor) return null;
  const [anio, mes, dia] = String(valor).slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export function formatearFecha(valor) {
  const fecha = leerFecha(valor);
  if (!fecha) return "—";
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatearFechaHora(valor) {
  if (!valor) return "—";
  const fecha = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(fecha.getTime())) return formatearFecha(valor);
  return fecha.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function aFechaIso(fecha) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function hoySinHora() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

const MS_DIA = 24 * 60 * 60 * 1000;

export function diasEntre(desde, hasta) {
  return Math.round((hasta.getTime() - desde.getTime()) / MS_DIA);
}

export function restarDias(valor, dias) {
  const fecha = leerFecha(valor);
  if (!fecha) return null;
  fecha.setDate(fecha.getDate() - (Number(dias) || 0));
  return aFechaIso(fecha);
}

// ---------- Vigencia (no es un estado: se calcula) ----------

// Devuelve null si el convenio no está firmado.
export function calcularVigencia(convenio, hoy = hoySinHora()) {
  if (!convenio || convenio.estado !== "firmado") return null;
  const inicio = leerFecha(convenio.fecha_inicio);
  const fin = leerFecha(convenio.fecha_fin);
  if (inicio && hoy < inicio) return { clave: "aun_no_vigente", etiqueta: "Aún no vigente" };
  if (!fin) return { clave: "sin_vencimiento", etiqueta: "Sin vencimiento registrado" };
  const dias = diasEntre(hoy, fin);
  if (dias < 0) return { clave: "vencido", etiqueta: "Vencido", dias };
  const preaviso = convenio.dias_preaviso ?? 30;
  if (dias <= preaviso) {
    return { clave: "proximo", etiqueta: dias === 0 ? "Vence hoy" : `Vence en ${dias} días`, dias };
  }
  return { clave: "vigente", etiqueta: "Vigente", dias };
}

export const FILTROS_VIGENCIA = {
  vigente: "Vigente",
  proximo: "Próximo a vencer",
  vencido: "Vencido",
  sin_vencimiento: "Sin vencimiento registrado",
};

// ---------- Otros formatos ----------

export function formatearBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function formatearMonto(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function nombrePersona(persona) {
  if (!persona) return "—";
  return [persona.apellido, persona.nombre].filter(Boolean).join(", ");
}

export function hashCorto(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}
