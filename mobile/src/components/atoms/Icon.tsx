import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { fontScales, useAppTheme, type ColorPalette } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ColorPalette;
  /** Color directo, para casos donde el color viene calculado (ej: tonos de estado). */
  rawColor?: string;
}

/** Átomo: ícono (Ionicons). Escala junto con el tamaño de letra. */
export function Icon({ name, size = 20, color = 'text', rawColor }: IconProps) {
  const { colors, fontSize } = useAppTheme();
  return <Ionicons name={name} size={Math.round(size * fontScales[fontSize])} color={rawColor ?? colors[color]} />;
}
