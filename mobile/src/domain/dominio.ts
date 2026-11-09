/**
 * Textos y reglas del dominio. Son los mismos de la web (web/lib/dominio.js) para que
 * la app y la web muestren las mismas etiquetas y calculen la vigencia igual.
 */
import type { Convenio, EstadoConvenio, Persona, Rol, TipoConvenio, TipoDocumento, TipoVinculo, Vigencia } from '@/models';

export const TIPOS: Record<TipoConvenio, string> = {
  marco: 'Marco',
  especifico: 'Específico',
  adenda: 'Adenda',
  pasantia: 'Pasantía',
};

export const ESTADOS: Record<EstadoConvenio, string> = {
  borrador: 'Borrador',
  revision: 'En revisión',
  aprobado: 'Aprobado',
  firmado: 'Firmado',
  rescindido: 'Rescindido',
  archivado: 'Archivado',
};

export const ROLES: Record<Rol, string> = {
  admin: 'Administración',
  gestion: 'Gestión',
  revision: 'Revisión',
  consulta: 'Consulta',
};

export const TIPOS_VINCULO: Record<TipoVinculo, string> = {
  especifico_de: 'Específico de',
  adenda_de: 'Adenda de',
  renovacion_de: 'Renovación de',
  sustitucion_de: 'Sustitución de',
};

/** El mismo vínculo visto desde el convenio antecedente (ej.: el marco ve a su específico como "Específico derivado"). */
export const TIPOS_VINCULO_INVERSO: Record<TipoVinculo, string> = {
  especifico_de: 'Específico derivado',
  adenda_de: 'Adenda',
  renovacion_de: 'Renovado por',
  sustitucion_de: 'Sustituido por',
};

export const TIPOS_DOCUMENTO: Record<TipoDocumento, string> = {
  convenio_firmado: 'Convenio firmado',
  anexo: 'Anexo',
  dictamen: 'Dictamen',
  resolucion: 'Resolución',
  acta_pasantia: 'Acta de pasantía',
  otro: 'Otro',
};

// ---------- Fechas ----------

/** "2026-11-10" → fecha local sin hora (evita corrimientos por zona horaria). */
export function leerFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function hoySinHora() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

const MS_DIA = 24 * 60 * 60 * 1000;

export interface InfoVigencia {
  clave: Vigencia;
  etiqueta: string;
  dias?: number;
}

type DatosVigencia = Pick<Convenio, 'estado' | 'fecha_inicio' | 'fecha_fin' | 'dias_preaviso'>;

/** Vigencia de un convenio firmado; null si no está firmado. Igual que calcularVigencia() de la web. */
export function calcularVigencia(convenio: DatosVigencia, hoy = hoySinHora()): InfoVigencia | null {
  if (convenio.estado !== 'firmado') return null;
  const inicio = leerFecha(convenio.fecha_inicio);
  const fin = leerFecha(convenio.fecha_fin);
  if (inicio && hoy < inicio) return { clave: 'aun_no_vigente', etiqueta: 'Aún no vigente' };
  if (!fin) return { clave: 'sin_vencimiento', etiqueta: 'Sin vencimiento' };
  const dias = Math.round((fin.getTime() - hoy.getTime()) / MS_DIA);
  if (dias < 0) return { clave: 'vencido', etiqueta: 'Vencido', dias };
  if (dias <= (convenio.dias_preaviso ?? 30)) {
    const etiqueta = dias === 0 ? 'Vence hoy' : dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;
    return { clave: 'proximo', etiqueta, dias };
  }
  return { clave: 'vigente', etiqueta: 'Vigente', dias };
}

// ---------- Otros formatos ----------

export function nombrePersona(persona: Persona | null | undefined): string {
  if (!persona) return '—';
  return [persona.nombre, persona.apellido].filter(Boolean).join(' ');
}

export function formatearBytes(bytes: number): string {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatearMonto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `$ ${Math.round(Number(valor)).toLocaleString('es-AR')}`;
}
