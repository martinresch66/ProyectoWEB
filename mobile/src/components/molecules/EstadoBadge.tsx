import { ESTADOS } from '@/domain/dominio';
import type { EstadoConvenio } from '@/models';
import { estadoTone } from '@/theme';

import { Badge, type IconName } from '../atoms';

const estadoIcon: Record<EstadoConvenio, IconName> = {
  borrador: 'create-outline',
  revision: 'eye-outline',
  aprobado: 'checkmark-outline',
  firmado: 'checkmark-done-outline',
  rescindido: 'close-circle-outline',
  archivado: 'archive-outline',
};

/** Molécula: Badge (átomo) + ícono + color según el estado del convenio (mismos colores que la web). */
export function EstadoBadge({ estado }: { estado: EstadoConvenio }) {
  return <Badge label={ESTADOS[estado] ?? estado} tone={estadoTone[estado] ?? 'neutral'} icon={estadoIcon[estado]} />;
}
