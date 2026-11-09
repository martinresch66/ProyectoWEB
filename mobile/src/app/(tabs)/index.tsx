import { View } from 'react-native';

import { AppText, Card } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import { conveniosService } from '@/services/convenios.service';
import { useAppTheme } from '@/theme';
import { primerNombre } from '@/utils/format';

/**
 * Inicio (Home).
 * Etapa 0: saludo + listado de convenios desde la API (el backend ya filtra por rol y unidad).
 * Etapa 2: boxes de resumen, últimos movimientos y mis pendientes.
 */
export default function HomeScreen() {
  const { spacing } = useAppTheme();
  const { usuario } = useAuth();
  const { data, loading, error, reload } = useAsync(() => conveniosService.listar({ per_page: 20 }), []);

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="textSecondary">
          Hola,
        </AppText>
        <AppText variant="title">{primerNombre(usuario?.nombre ?? '')}</AppText>
        {usuario && (
          <AppText variant="caption" color="textMuted">
            {ROLES[usuario.rol]} · {usuario.unidad?.nombre ?? 'Alcance global'}
          </AppText>
        )}
      </View>

      <Card>
        <AppText variant="bodyStrong">Resumen de convenios</AppText>
        <AppText variant="caption" color="textSecondary">
          Acá van a ir los boxes de firmados, vigentes, en trámite, últimos movimientos y mis pendientes (Etapa 2).
        </AppText>
      </Card>

      <View>
        <SectionHeader title={data ? `Convenios (${data.total})` : 'Convenios'} />
        <ConvenioList convenios={data?.data ?? null} loading={loading} error={error} onRetry={reload} />
      </View>
    </Screen>
  );
}
