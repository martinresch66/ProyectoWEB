import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Si es false, el contenido no scrollea (útil para pantallas con listas propias). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Template: estructura base de todas las pantallas (fondo, márgenes, scroll y "tirar para actualizar").
 * Las pantallas (pages) solo se ocupan de su contenido.
 */
export function Screen({ children, scroll = true, refreshing = false, onRefresh }: ScreenProps) {
  const { colors, spacing } = useAppTheme();
  const contentStyle = { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.background }, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );
}
