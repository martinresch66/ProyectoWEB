import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface AuthHeaderProps {
  /** Sin ícono se muestra la marca "CU", igual que el logo de la web. */
  icon?: IconName;
  title: string;
  subtitle?: string;
}

/** Organismo: encabezado de las pantallas de acceso (ícono destacado + título + subtítulo). */
export function AuthHeader({ icon, title, subtitle }: AuthHeaderProps) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: radius.lg + 6,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {icon ? (
          <Icon name={icon} size={38} rawColor={colors.onPrimary} />
        ) : (
          <AppText variant="title" style={{ color: colors.onPrimary, fontSize: 26, lineHeight: 32 }} accessibilityLabel="Convenios UNLPam">
            CU
          </AppText>
        )}
      </View>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <AppText variant="title" align="center" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle && (
          <AppText color="textSecondary" align="center">
            {subtitle}
          </AppText>
        )}
      </View>
    </View>
  );
}
