import { View } from 'react-native';

import { toneColors, useAppTheme, type Tone } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  /** Solo borde, sin fondo (la web lo usa para la vigencia). */
  outline?: boolean;
}

/** Átomo: etiqueta chica de color (estado, tipo, etc.). */
export function Badge({ label, tone = 'neutral', icon, outline = false }: BadgeProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { fg, bg } = toneColors(colors, tone);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        backgroundColor: outline ? 'transparent' : bg,
        borderWidth: outline ? 1 : 0,
        borderColor: fg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
      }}>
      {icon && <Icon name={icon} size={12} rawColor={fg} />}
      <AppText variant="label" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}
