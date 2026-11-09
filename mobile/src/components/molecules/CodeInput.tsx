import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from '../atoms';

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  hasError?: boolean;
  autoFocus?: boolean;
}

/**
 * Molécula: casilleros para un código numérico (MFA).
 * Los casilleros son solo visuales: encima hay un único campo transparente que recibe los toques,
 * así funciona pegar el código y el autocompletado de SMS de Android.
 */
export function CodeInput({ value, onChange, length = 6, hasError, autoFocus }: CodeInputProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? '';
          const activo = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                width: 46,
                height: 56,
                borderRadius: radius.md,
                borderWidth: activo ? 2 : 1,
                borderColor: hasError ? colors.danger : activo ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText style={[typography.title, { lineHeight: undefined }]}>{char}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        accessibilityLabel="Código de verificación"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          color: 'transparent',
          backgroundColor: 'transparent',
          opacity: 0.02,
        }}
      />
    </View>
  );
}
