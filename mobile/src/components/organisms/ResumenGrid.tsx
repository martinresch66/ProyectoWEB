import { View } from 'react-native';

import type { ResumenInicio } from '@/models';
import { useAppTheme } from '@/theme';

import { StatBox } from '../molecules';

export interface ResumenGridProps {
  /** null mientras cargan los datos. */
  totales: ResumenInicio['totales'] | null;
  /** Al tocar "Esperando firma" (ej: ir a la pestaña Firmar). */
  onPressPorFirmar?: () => void;
}

/** Organismo: los cuatro boxes del Inicio en una grilla de 2 x 2 (cada uno es una molécula StatBox). */
export function ResumenGrid({ totales, onPressPorFirmar }: ResumenGridProps) {
  const { spacing } = useAppTheme();
  const t = totales;
  const porVencer = t?.proximos_a_vencer ? `${t.proximos_a_vencer} por vencer` : undefined;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatBox
          label="Firmados en los últimos 12 meses"
          value={t?.firmados_ultimo_anio ?? null}
          icon="ribbon-outline"
          tone="success"
        />
        <StatBox label="Vigentes" value={t?.vigentes ?? null} icon="shield-checkmark-outline" tone="primary" hint={porVencer} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatBox label="En trámite" value={t?.en_tramite ?? null} icon="hourglass-outline" tone="info" />
        <StatBox
          label="Esperando firma"
          value={t?.por_firmar ?? null}
          icon="create-outline"
          tone="warning"
          onPress={onPressPorFirmar}
        />
      </View>
    </View>
  );
}