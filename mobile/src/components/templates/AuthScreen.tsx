import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

/**
 * Template: pantallas de acceso (login, verificación, activar huella).
 * Contenido centrado, ancho máximo y se acomoda cuando aparece el teclado.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.xl }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
