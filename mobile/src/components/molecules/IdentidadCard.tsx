import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';

import { AppText, Badge, Card, Icon, type IconName } from '../atoms';

export interface IdentidadCardProps {
  icon: IconName;
  titulo: string;
  descripcion: string;
  /** Fecha en que se registró (ISO), o null si todavía no se registró. */
  registradoEn: string | null;
  children?: ReactNode;
}

/** Molécula: un dato de identidad (firma, rostro o huella) con su estado y sus acciones. */
export function IdentidadCard({ icon, titulo, descripcion, registradoEn, children }: IdentidadCardProps) {
  const { spacing } = useAppTheme();
  const listo = registradoEn !== null;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <Icon name={icon} size={26} color={listo ? 'success' : 'primary'} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">{titulo}</AppText>
          <AppText variant="caption" color="textSecondary">
            {descripcion}
          </AppText>
        </View>
        <Badge label={listo ? 'Listo' : 'Pendiente'} tone={listo ? 'success' : 'warning'} icon={listo ? 'checkmark' : 'time-outline'} />
      </View>
      {registradoEn && (
        <AppText variant="caption" color="textMuted">
          Registrado el {formatDateTime(registradoEn)}
        </AppText>
      )}
      {children}
    </Card>
  );
}