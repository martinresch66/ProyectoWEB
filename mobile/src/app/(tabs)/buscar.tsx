import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/components/atoms';
import { EmptyState, SearchBar } from '@/components/molecules';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { conveniosService } from '@/services/convenios.service';

/**
 * Buscador.
 * Etapa 0: búsqueda simple por texto en código, título y resumen (parámetro q de GET /agreements).
 * Etapa 3: filtros avanzados (año, estado, unidad académica…) y resultados en árbol.
 */
export default function BuscarScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const query = q ?? '';

  const { data, loading, error, reload } = useAsync(
    () => (query ? conveniosService.listar({ q: query, per_page: 50 }) : Promise.resolve(null)),
    [query],
  );

  return (
    <Screen>
      <SearchBar key={query} initialValue={query} onSubmit={(text) => router.setParams({ q: text || undefined })} />

      {!query ? (
        <EmptyState
          icon="search-outline"
          title="Buscá un convenio"
          message="Escribí parte del título, del código (ej: CONV-2026) o del resumen. Los filtros avanzados llegan en la Etapa 3."
        />
      ) : (
        <>
          {data && (
            <AppText variant="caption" color="textSecondary">
              {data.total} {data.total === 1 ? 'resultado' : 'resultados'} para “{query}”
            </AppText>
          )}
          <ConvenioList
            convenios={data?.data ?? null}
            loading={loading}
            error={error}
            onRetry={reload}
            emptyMessage="Probá con otras palabras."
          />
        </>
      )}
    </Screen>
  );
}
