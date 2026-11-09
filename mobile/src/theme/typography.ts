import type { TextStyle } from 'react-native';

/** Tamaño de letra elegido por el usuario en Mi Perfil. */
export type FontSizeOption = 'small' | 'medium' | 'large';

export const fontScales: Record<FontSizeOption, number> = {
  small: 0.88,
  medium: 1,
  large: 1.18,
};

/**
 * Tipografía Inter, la misma de la web. En Android una fuente propia no cambia de grosor con
 * fontWeight, así que cada grosor usa su propia familia (se cargan en app/_layout.tsx).
 */
export const FUENTES = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Familia de Inter para un grosor ('400', '600', 'bold'…). */
export function fuentePara(peso: TextStyle['fontWeight']): string {
  if (peso === '700' || peso === 'bold' || peso === '800' || peso === '900') return FUENTES.bold;
  if (peso === '600') return FUENTES.semibold;
  if (peso === '500') return FUENTES.medium;
  return FUENTES.regular;
}

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption' | 'label';

/** Tamaños base (para la opción "mediana"). */
const baseVariants: Record<TextVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.3 },
};

/** Genera los estilos de texto aplicando la escala elegida. */
export function buildTypography(option: FontSizeOption): Record<TextVariant, TextStyle> {
  const scale = fontScales[option];
  const result = {} as Record<TextVariant, TextStyle>;
  for (const [variant, style] of Object.entries(baseVariants) as [TextVariant, TextStyle][]) {
    const { fontWeight, ...resto } = style;
    result[variant] = {
      ...resto,
      fontFamily: fuentePara(fontWeight),
      fontSize: Math.round((style.fontSize ?? 15) * scale),
      lineHeight: Math.round((style.lineHeight ?? 22) * scale),
    };
  }
  return result;
}
