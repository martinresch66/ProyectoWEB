/** Formatos de fechas y nombres. Las etiquetas de estados, tipos y roles están en domain/dominio.ts. */

/**
 * "Juan Ponkosky (Gestor ING)" → "Juan". Salta títulos como Dr., Ing., Prof.
 * y saca lo que va entre paréntesis (el seed lo usa para aclarar el rol).
 */
export function primerNombre(nombreCompleto: string): string {
  const partes = nombreCompleto.replace(/\(.*?\)/g, '').split(' ').filter(Boolean);
  return partes.find((p) => !p.endsWith('.')) ?? partes[0] ?? '';
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Convierte "2026-10-27" (fecha sola, sin corrimiento de zona horaria) o una fecha ISO con hora. */
function aFecha(valor: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(valor.replace(' ', 'T'));
}

/** "2026-10-27" o "2026-10-27T14:30:00Z" → "27 oct 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-10-27T14:30:00Z" → "27 oct 2026, 11:30" (hora local) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(iso)}, ${hh}:${mm}`;
}

/** Tiempo relativo corto: "hace 5 min", "hace 3 h", "hace 2 días" o la fecha si es más viejo. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - aFecha(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  return formatDate(iso);
}
