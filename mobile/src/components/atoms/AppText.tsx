import { Text, type TextProps } from 'react-native';

import { useAppTheme, type ColorPalette, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: keyof ColorPalette;
  align?: 'left' | 'center' | 'right';
}

/**
 * Átomo: texto de la app. Toma el tamaño de letra elegido en Mi Perfil y los colores del tema.
 * Todos los textos de la app deberían usar este componente.
 */
export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const { typography, colors } = useAppTheme();
  return <Text style={[typography[variant], { color: colors[color], textAlign: align }, style]} {...rest} />;
}
