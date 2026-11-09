import { AppText } from '@/components/atoms';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { conveniosService } from '@/services/convenios.service';

/**
 * Firmador.
 * Etapa 0: convenios en estado "aprobado" (en el circuito de la web, aprobado → firmado es "Registrar firma").
 * Etapa 5: máx. 10, los más nuevos primero, y el flujo de firma.
 */
export default function FirmarScreen() {
  const { data, loading, error, reload } = useAsync(() => conveniosService.listar({ estado: 'aprobado', per_page: 10 }), []);

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <AppText color="textSecondary">Convenios aprobados que esperan la firma de las autoridades.</AppText>
      <ConvenioList
        convenios={data?.data ?? null}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="No hay convenios pendientes de firma."
      />
    </Screen>
  );
}
