import { Pressable, View } from 'react-native';

import { ESTADOS, TIPOS_DOCUMENTO } from '@/domain/dominio';
import type { Movimiento } from '@/models';
import { estadoTone, toneColors, useAppTheme, type Tone } from '@/theme';
import { timeAgo } from '@/utils/format';

import { AppText, Icon, type IconName } from '../atoms';

/** Ícono, color y texto de cada tipo de movimiento. Al sumar firmas y comentarios se agrega un caso acá. */
function describir(m: Movimiento): { icon: IconName; tone: Tone; texto: string } {
  switch (m.tipo) {
    case 'estado':
      return {
        icon: 'swap-horizontal-outline',
        tone: estadoTone[m.detalle.estado_nuevo],
        texto: `Pasó a ${ESTADOS[m.detalle.estado_nuevo]}: ${m.detalle.motivo}`,
      };
    case 'documento':
      return {
        icon: 'document-attach-outline',
        tone: 'primary',
        texto: `Se agregó ${TIPOS_DOCUMENTO[m.detalle.tipo_documento].toLowerCase()}: ${m.detalle.nombre_original}`,
      };
  }
}

export interface MovimientoItemProps {
  movimiento: Movimiento;
  onPress?: () => void;
}

/** Molécula: un movimiento de un convenio (qué pasó, en qué convenio y hace cuánto). */
export function MovimientoItem({ movimiento, onPress }: MovimientoItemProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { icon, tone, texto } = describir(movimiento);
  const { fg, bg } = toneColors(colors, tone);
  const { convenio } = movimiento;
  const cuando = timeAgo(movimiento.fecha);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${convenio.codigo}, ${convenio.titulo}. ${texto}. ${cuando}`}
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
        <Icon name={icon} size={18} rawColor={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" color="textMuted">
          {convenio.codigo} · {cuando}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {convenio.titulo}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {texto}
        </AppText>
      </View>
    </Pressable>
  );
}