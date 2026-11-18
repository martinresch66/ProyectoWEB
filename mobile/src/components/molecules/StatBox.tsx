import { View } from 'react-native';

import { toneColors, useAppTheme, type Tone } from '@/theme';

import { AppText, Card, Icon, type IconName } from '../atoms';

export interface StatBoxProps {
  label: string;
  /** null mientras se cargan los datos (muestra "—"). */
  value: number | null;
  icon: IconName;
  tone?: Tone;
  /** Texto chico debajo del número (ej: "1 por vencer"). */
  hint?: string;
  onPress?: () => void;
}

/** Molécula: box de resumen con un número grande (átomos Card + Icon + AppText). */
export function StatBox({ label, value, icon, tone = 'primary', hint, onPress }: StatBoxProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { fg, bg } = toneColors(colors, tone);
  const valor = value === null ? '—' : String(value);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${label}: ${valor}${hint ? `, ${hint}` : ''}`}
      style={{ flex: 1, gap: spacing.xs }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}>
        <Icon name={icon} size={20} rawColor={fg} />
      </View>
      <AppText variant="display">{valor}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      {hint && (
        <AppText variant="label" style={{ color: fg }}>
          {hint}
        </AppText>
      )}
    </Card>
  );
}