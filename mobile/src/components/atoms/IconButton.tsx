import { Pressable } from 'react-native';

import { useAppTheme, type ColorPalette } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  /** Texto que lee el lector de pantalla (el botón no tiene texto visible). */
  label: string;
  color?: keyof ColorPalette;
  size?: number;
}

/** Átomo: botón que es solo un ícono. Área táctil mínima de 44x44. */
export function IconButton({ icon, onPress, label, color = 'text', size = 22 }: IconButtonProps) {
  const { radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} color={color} size={size} />
    </Pressable>
  );
}
