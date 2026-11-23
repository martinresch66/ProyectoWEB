import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from '../atoms';

export interface ListaPasosProps {
  /** Cada paso: texto solo, o título y texto. */
  pasos: (string | { titulo: string; texto: string })[];
}

/** Molécula: pasos numerados (1, 2, 3…) para la ayuda y el manual. */
export function ListaPasos({ pasos }: ListaPasosProps) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {pasos.map((paso, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: radius.pill,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <AppText variant="label" color="primary">
              {i + 1}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {typeof paso === 'string' ? (
              <AppText>{paso}</AppText>
            ) : (
              <>
                <AppText variant="bodyStrong">{paso.titulo}</AppText>
                <AppText color="textSecondary">{paso.texto}</AppText>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}