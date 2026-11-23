import { Pressable, View } from 'react-native';

import type { Novedad, TipoNovedad } from '@/models';
import { estadoTone, toneColors, useAppTheme, type Tone } from '@/theme';
import { timeAgo } from '@/utils/format';

import { AppText, Icon, type IconName } from '../atoms';

const ICONOS: Record<TipoNovedad, IconName> = {
  nuevo_convenio: 'add-circle-outline',
  comentario: 'chatbubble-ellipses-outline',
  cambio_estado: 'swap-horizontal-outline',
  cancelado: 'close-circle-outline',
  documento: 'document-attach-outline',
  cambio_datos: 'create-outline',
  alerta: 'alarm-outline',
};

function tono(n: Novedad): Tone {
  switch (n.tipo) {
    case 'cancelado':
      return 'danger';
    case 'cambio_estado':
      return n.convenio ? estadoTone[n.convenio.estado] : 'primary';
    case 'cambio_datos':
    case 'alerta':
      return 'warning';
    case 'comentario':
      return 'info';
    default:
      return 'primary';
  }
}

export interface NovedadItemProps {
  novedad: Novedad;
  onPress?: () => void;
}

/** Molécula: una novedad de la pantalla Avisos (qué pasó, en qué convenio y hace cuánto). */
export function NovedadItem({ novedad, onPress }: NovedadItemProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { fg, bg } = toneColors(colors, tono(novedad));
  const cuando = timeAgo(novedad.fecha);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${novedad.titulo}. ${novedad.mensaje}. ${cuando}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={ICONOS[novedad.tipo]} size={18} rawColor={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" color="textMuted">
          {novedad.convenio ? `${novedad.convenio.codigo} · ${cuando}` : cuando}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {novedad.titulo}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={3}>
          {novedad.mensaje}
        </AppText>
      </View>
      {onPress && <Icon name="chevron-forward" size={18} color="textMuted" />}
    </Pressable>
  );
}