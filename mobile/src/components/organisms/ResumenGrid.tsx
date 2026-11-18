import { View } from 'react-native';

import type { IndicadorResumen, ResumenInicio } from '@/models';
import { useAppTheme } from '@/theme';

import { StatBox } from '../molecules';

export interface ResumenGridProps {
  /** null mientras cargan los datos. */
  totales: ResumenInicio['totales'] | null;
  /** Al tocar un box: abre los convenios de ese indicador. */
  onPressIndicador?: (indicador: IndicadorResumen) => void;
}

/** Organismo: los cuatro boxes del Inicio en una grilla de 2 x 2 (cada uno es una molécula StatBox). */
export function ResumenGrid({ totales, onPressIndicador }: ResumenGridProps) {
  const { spacing } = useAppTheme();
  const t = totales;
  const porVencer = t?.proximos_a_vencer ? `${t.proximos_a_vencer} por vencer` : undefined;
  const abrir = (indicador: IndicadorResumen) => (onPressIndicador ? () => onPressIndicador(indicador) : undefined);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatBox
          label="Firmados en los últimos 12 meses"
          value={t?.firmados_ultimo_anio ?? null}
          icon="ribbon-outline"
          tone="success"
          onPress={abrir('firmados')}
        />
        <StatBox
          label="Vigentes"
          value={t?.vigentes ?? null}
          icon="shield-checkmark-outline"
          tone="primary"
          hint={porVencer}
          onPress={abrir('vigentes')}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatBox
          label="En trámite"
          value={t?.en_tramite ?? null}
          icon="hourglass-outline"
          tone="info"
          onPress={abrir('en_tramite')}
        />
        <StatBox
          label="Esperando firma"
          value={t?.por_firmar ?? null}
          icon="create-outline"
          tone="warning"
          onPress={abrir('por_firmar')}
        />
      </View>
    </View>
  );
}