import { calcularVigencia } from '@/domain/dominio';
import type { Convenio } from '@/models';
import { vigenciaTone } from '@/theme';

import { Badge } from '../atoms';

/**
 * Molécula: vigencia de un convenio firmado ("Vigente", "Vence en 12 días", "Vencido"…).
 * Insignia con borde, como en la web. No muestra nada si el convenio no está firmado.
 */
export function VigenciaBadge({ convenio }: { convenio: Pick<Convenio, 'estado' | 'fecha_inicio' | 'fecha_fin' | 'dias_preaviso'> }) {
  const vigencia = calcularVigencia(convenio);
  if (!vigencia) return null;
  return <Badge label={vigencia.etiqueta} tone={vigenciaTone[vigencia.clave]} outline />;
}
