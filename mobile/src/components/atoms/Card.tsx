import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useAppTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Átomo: superficie con borde redondeado. Si recibe onPress, se puede tocar. */
export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const { colors, radius, spacing } = useAppTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, { opacity: pressed ? 0.8 : 1 }, style]}>
      {children}
    </Pressable>
  );
}
