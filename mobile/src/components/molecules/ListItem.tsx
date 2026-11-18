import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface ListItemProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

/** Molécula: fila de menú con ícono, texto y flecha (ej: opciones de Mi Perfil). */
export function ListItem({ icon, title, subtitle, onPress }: ListItemProps) {
  const { colors, spacing, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={18} color="primary" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle && (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        )}
      </View>
      <Icon name="chevron-forward" size={18} color="textMuted" />
    </Pressable>
  );
}
