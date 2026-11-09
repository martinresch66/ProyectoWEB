import { View } from 'react-native';

import { TIPOS } from '@/domain/dominio';
import type { Convenio } from '@/models';
import { useAppTheme } from '@/theme';
import { formatDate } from '@/utils/format';

import { AppText, Card, Icon } from '../atoms';
import { EstadoBadge } from './EstadoBadge';
import { VigenciaBadge } from './VigenciaBadge';

export interface ConvenioCardProps {
  convenio: Convenio;
  onPress?: () => void;
}

/** Molécula: tarjeta con el resumen de un convenio (Card + textos + EstadoBadge + VigenciaBadge). */
export function ConvenioCard({ convenio, onPress }: ConvenioCardProps) {
  const { spacing } = useAppTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={`Convenio ${convenio.codigo}: ${convenio.titulo}`}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="label" color="textMuted">
            {convenio.codigo} · {TIPOS[convenio.tipo] ?? convenio.tipo}
          </AppText>
          {onPress && <Icon name="chevron-forward" size={16} color="textMuted" />}
        </View>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {convenio.titulo}
        </AppText>
        {convenio.unidad && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="school-outline" size={14} color="textSecondary" />
            <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
              {convenio.unidad.nombre}
            </AppText>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 }}>
            <EstadoBadge estado={convenio.estado} />
            <VigenciaBadge convenio={convenio} />
          </View>
          {convenio.fecha_inicio && (
            <AppText variant="caption" color="textMuted">
              Desde {formatDate(convenio.fecha_inicio)}
            </AppText>
          )}
        </View>
      </View>
    </Card>
  );
}
