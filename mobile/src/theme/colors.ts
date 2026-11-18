import type { EstadoConvenio, Vigencia } from '@/models';

/**
 * Paleta de la app. La versión clara usa los mismos colores que la web (Tailwind:
 * blue-700 de primario, fondo slate-50, bordes gray-200, insignias de estado iguales).
 * Cada color tiene su versión clara y oscura.
 * Las pantallas nunca usan colores sueltos: siempre `colors.<nombre>` del tema.
 */
export interface ColorPalette {
  primary: string;
  primarySoft: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  neutral: string;
  neutralSoft: string;
  /** Fondo oscuro con texto claro (insignia "Archivado", igual que en la web). */
  inverse: string;
  onInverse: string;
}

export const lightColors: ColorPalette = {
  primary: '#1D4ED8', // blue-700
  primarySoft: '#EFF6FF', // blue-50
  onPrimary: '#FFFFFF',
  background: '#F8FAFC', // slate-50
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6', // gray-100
  border: '#E5E7EB', // gray-200
  text: '#101828',
  textSecondary: '#4B5563', // gray-600
  textMuted: '#6B7280', // gray-500
  success: '#166534', // green-800
  successSoft: '#DCFCE7', // green-100
  warning: '#78350F', // amber-900
  warningSoft: '#FEF3C7', // amber-100
  danger: '#991B1B', // red-800
  dangerSoft: '#FEE2E2', // red-100
  info: '#5B21B6', // violet-800
  infoSoft: '#F5F3FF', // violet-50
  neutral: '#374151', // gray-700
  neutralSoft: '#F3F4F6', // gray-100
  inverse: '#374151', // gray-700
  onInverse: '#FFFFFF',
};

export const darkColors: ColorPalette = {
  primary: '#60A5FA', // blue-400
  primarySoft: '#172554', // blue-950
  onPrimary: '#0B1220',
  background: '#0B1120',
  surface: '#111827', // gray-900
  surfaceAlt: '#1F2937', // gray-800
  border: '#374151', // gray-700
  text: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  success: '#4ADE80',
  successSoft: '#052E16',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  info: '#C4B5FD',
  infoSoft: '#2E1065',
  neutral: '#D1D5DB',
  neutralSoft: '#1F2937',
  inverse: '#D1D5DB',
  onInverse: '#111827',
};

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'inverse';

/** Devuelve el color fuerte y el suave (fondo) de un tono. */
export function toneColors(colors: ColorPalette, tone: Tone) {
  const map = {
    primary: [colors.primary, colors.primarySoft],
    success: [colors.success, colors.successSoft],
    warning: [colors.warning, colors.warningSoft],
    danger: [colors.danger, colors.dangerSoft],
    info: [colors.info, colors.infoSoft],
    neutral: [colors.neutral, colors.neutralSoft],
    inverse: [colors.onInverse, colors.inverse],
  } as const;
  const [fg, bg] = map[tone];
  return { fg, bg };
}

/** Color de cada estado de convenio: los mismos que las insignias de la web. */
export const estadoTone: Record<EstadoConvenio, Tone> = {
  borrador: 'neutral',
  revision: 'info',
  aprobado: 'primary',
  firmado: 'success',
  rescindido: 'danger',
  archivado: 'inverse',
};

/** Color de cada vigencia (insignia con borde, como en la web). */
export const vigenciaTone: Record<Vigencia, Tone> = {
  vigente: 'success',
  proximo: 'warning',
  vencido: 'danger',
  sin_vencimiento: 'neutral',
  aun_no_vigente: 'neutral',
};
