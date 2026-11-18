import { AppText } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import { resumenService } from '@/services/resumen.service';

/**
 * Firmador: convenios aprobados que esperan la firma, máximo 10, del más reciente al más antiguo.
 * Usa los pendientes de GET /mobile/resumen (la API ya filtra por rol y unidad).
 * Al tocar uno se abre la ficha (procedencia, partes firmantes, fechas, convenio padre)
 * y desde ahí "Leer y firmar" abre el PDF.
 */
export default function FirmarScreen() {
  const { data, loading, error, reload } = useAsync(() => resumenService.obtener(), []);

  // Al volver de firmar, el convenio firmado deja de aparecer en la lista.
  useRecargarAlVolver(reload);

  if (data && !data.puede_firmar) {
    return (
      <Screen refreshing={loading} onRefresh={reload}>
        <EmptyState
          icon="lock-closed-outline"
          title="Tu rol no firma convenios"
          message="Solo administración y gestión registran firmas. Podés consultar los convenios desde el buscador."
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <AppText color="textSecondary">Convenios aprobados que esperan tu firma, del más reciente al más antiguo.</AppText>
      <ConvenioList
        convenios={data?.pendientes_firma ?? null}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="No tenés convenios pendientes de firma."
      />
    </Screen>
  );
}