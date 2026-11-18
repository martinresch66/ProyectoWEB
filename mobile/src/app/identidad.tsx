import { EmptyState } from '@/components/molecules';
import { Screen } from '@/components/templates';

/** Registrar mi identidad (Etapa 8): firma, reconocimiento facial y huella. */
export default function IdentidadScreen() {
  return (
    <Screen>
      <EmptyState
        icon="finger-print-outline"
        title="Registrar mi identidad"
        message="Acá vas a poder registrar tu firma, tu rostro y tu huella para firmar convenios. Disponible en la Etapa 8."
      />
    </Screen>
  );
}
