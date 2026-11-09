import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText, Input, type InputProps } from '../atoms';

export interface FormFieldProps extends InputProps {
  label: string;
  error?: string | null;
  helper?: string;
}

/** Molécula: etiqueta + campo de texto + mensaje de error o ayuda. */
export function FormField({ label, error, helper, ...inputProps }: FormFieldProps) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <Input accessibilityLabel={label} hasError={!!error} {...inputProps} />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="textMuted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
