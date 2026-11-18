import { Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/atoms';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import type { IndicadorResumen } from '@/models';
import { resumenService } from '@/services/resumen.service';

/**
 * Convenios de un box del Inicio (firmados, vigentes, en trámite o esperando firma).
 * Salen de GET /mobile/resumen/:indicador, con la misma condición que el número del box.
 */
export default function IndicadorScreen() {
  const { clave } = useLocalSearchParams<{ clave: IndicadorResumen }>();
  const { data, loading, error, reload } = useAsync(() => resumenService.listar(clave), [clave]);

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <Stack.Screen options={{ title: data?.titulo ?? 'Convenios' }} />
      {data && (
        <AppText color="textSecondary">
          {data.descripcion} {data.total === 1 ? 'Hay 1 convenio.' : `Hay ${data.total} convenios.`}
        </AppText>
      )}
      <ConvenioList
        convenios={data?.convenios ?? null}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="No hay convenios en este grupo."
      />
    </Screen>
  );
}