import type { ComponentProps, ReactNode } from 'react';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme';

export type InputProps = ComponentProps<typeof TextInput> & {
  hasError?: boolean;
  /** Elemento a la derecha del campo (ej: botón para mostrar la contraseña). */
  trailing?: ReactNode;
};

/** Átomo: campo de texto con los colores y el tamaño de letra del tema. */
export function Input({ hasError, trailing, style, ...rest }: InputProps) {
  const { colors, typography, radius, spacing } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: hasError ? colors.danger : colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        minHeight: 48,
      }}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[typography.body, { flex: 1, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 10 }, style]}
        {...rest}
      />
      {trailing}
    </View>
  );
}
