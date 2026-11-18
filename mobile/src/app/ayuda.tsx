import { EmptyState } from '@/components/molecules';
import { Screen } from '@/components/templates';

/** Ayuda al usuario (Etapa 12): manual de uso. */
export default function AyudaScreen() {
  return (
    <Screen>
      <EmptyState
        icon="help-buoy-outline"
        title="Manual de usuario"
        message="Acá va a estar el instructivo para registrar tu identidad y firmar un convenio. Disponible en la Etapa 12."
      />
    </Screen>
  );
}
