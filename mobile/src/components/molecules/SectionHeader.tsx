import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from '../atoms';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Molécula: título de sección con una acción opcional a la derecha ("Ver todos"). */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
      }}>
      <AppText variant="subtitle" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <AppText variant="bodyStrong" color="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
