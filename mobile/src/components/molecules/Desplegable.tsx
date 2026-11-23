import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface DesplegableProps {
  titulo: string;
  icono?: IconName;
  abierto: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Molécula: título que se toca para mostrar u ocultar su contenido (manual y preguntas frecuentes). */
export function Desplegable({ titulo, icono, abierto, onToggle, children }: DesplegableProps) {
  const { spacing } = useAppTheme();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={titulo}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}>
        {icono && <Icon name={icono} size={20} color="primary" />}
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {titulo}
        </AppText>
        <Icon name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color="textMuted" />
      </Pressable>
      {abierto && <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>{children}</View>}
    </View>
  );
}