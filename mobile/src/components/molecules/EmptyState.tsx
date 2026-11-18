import { View } from 'react-native';
import type { ReactNode } from 'react';

import { useAppTheme } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Molécula: mensaje para pantallas o listas vacías, errores o secciones en construcción. */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors, spacing, radius } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.pill,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={32} color="primary" />
      </View>
      <AppText variant="subtitle" align="center">
        {title}
      </AppText>
      {message && (
        <AppText color="textSecondary" align="center">
          {message}
        </AppText>
      )}
      {action}
    </View>
  );
}
