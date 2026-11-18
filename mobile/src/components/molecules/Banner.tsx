import { View } from 'react-native';

import { toneColors, useAppTheme, type Tone } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface BannerProps {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  message: string;
}

const iconoPorTono: Record<Tone, IconName> = {
  primary: 'information-circle',
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  danger: 'alert-circle',
  neutral: 'information-circle',
  inverse: 'information-circle',
};

/** Molécula: aviso destacado (error, éxito, información). */
export function Banner({ tone = 'info', icon, title, message }: BannerProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: bg, borderRadius: radius.md, padding: spacing.md }}>
      <Icon name={icon ?? iconoPorTono[tone]} size={20} rawColor={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && (
          <AppText variant="bodyStrong" style={{ color: fg }}>
            {title}
          </AppText>
        )}
        <AppText variant="caption" style={{ color: tone === 'neutral' ? colors.textSecondary : fg }}>
          {message}
        </AppText>
      </View>
    </View>
  );
}
