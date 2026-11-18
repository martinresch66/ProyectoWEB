import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAsync } from '@/hooks/useAsync';
import type { FirmaDibujada, MetodoVerificacion, Ubicacion } from '@/models';
import { autenticarConBiometria, obtenerBiometria, type BiometriaInfo } from '@/services/biometrics';
import { obtenerUbicacion } from '@/services/ubicacion.service';
import { useAppTheme } from '@/theme';

import { AppText, Button, Icon, IconButton } from '../atoms';
import { Banner, FIRMA_VACIA, puntosDeFirma, SignaturePad } from '../molecules';

/** Puntos mínimos para considerar que hay una firma (no un toque suelto). */
const PUNTOS_MINIMOS = 10;

/** Lo que arma este modal; la pantalla lo manda a la API junto con la versión del convenio. */
export interface DatosFirma {
  firma: FirmaDibujada;
  ubicacion: Ubicacion;
  verificacion: MetodoVerificacion;
}

export interface FirmaModalProps {
  convenio: { codigo: string; titulo: string };
  /** Nombre de quien firma (el usuario de la sesión). */
  firmante: string;
  onCancel: () => void;
  /** Envía la firma. Si falla, el mensaje de error se muestra en el modal para reintentar. */
  onConfirm: (datos: DatosFirma) => Promise<void>;
}

const metodo = (b: BiometriaInfo): MetodoVerificacion => (b.tipo === 'huella' ? 'huella' : b.tipo === 'rostro' ? 'rostro' : 'biometria');

/** Encabezado de cada paso: número, título y (opcional) una acción a la derecha. */
function Paso({ numero, titulo, accion }: { numero: number; titulo: string; accion?: ReactNode }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <AppText variant="bodyStrong">
        {numero}. {titulo}
      </AppText>
      {accion}
    </View>
  );
}

/**
 * Organismo: modal para firmar un convenio (Firmador del T2).
 * 1. Firma manuscrita en el recuadro.  2. Ubicación (se busca sola al abrir).  3. Confirmación con la huella.
 * Se muestra solo mientras está montado: la pantalla lo agrega al tocar "Firmar" y lo saca al terminar.
 */
export function FirmaModal({ convenio, firmante, onCancel, onConfirm }: FirmaModalProps) {
  const { colors, spacing } = useAppTheme();
  const [firma, setFirma] = useState<FirmaDibujada>(FIRMA_VACIA);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La ubicación se pide apenas se abre, así está lista cuando se termina de firmar.
  const ubicacion = useAsync(() => obtenerUbicacion(), []);
  const biometria = useAsync(() => obtenerBiometria(), []);

  const hayFirma = puntosDeFirma(firma) >= PUNTOS_MINIMOS;
  const huellaDisponible = biometria.data?.disponible === true;
  const listo = hayFirma && !!ubicacion.data && huellaDisponible && !enviando;

  async function confirmar() {
    const lugar = ubicacion.data;
    const bio = biometria.data;
    if (!lugar || !bio) return;
    setError(null);

    let confirmada = false;
    try {
      confirmada = await autenticarConBiometria(`Confirmá con tu ${bio.tipo} para firmar ${convenio.codigo}`);
    } catch {
      confirmada = false;
    }
    if (!confirmada) {
      setError(`No se confirmó tu ${bio.tipo}. Probá de nuevo.`);
      return;
    }

    setEnviando(true);
    try {
      await onConfirm({ firma, ubicacion: lugar, verificacion: metodo(bio) });
      // Si salió bien, la pantalla cierra el modal.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la firma.');
      setEnviando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={enviando ? () => {} : onCancel}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">Firmar convenio</AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {convenio.codigo} · {convenio.titulo}
              </AppText>
            </View>
            {!enviando && <IconButton icon="close" label="Cancelar la firma" onPress={onCancel} />}
          </View>

          <AppText variant="caption" color="textSecondary">
            Firmás como <AppText variant="caption">{firmante}</AppText>. Junto a tu firma se guardan la fecha, la hora y el
            lugar.
          </AppText>

          <Paso
            numero={1}
            titulo="Tu firma"
            accion={
              firma.trazos.length > 0 && !enviando ? (
                <Button title="Borrar" icon="trash-outline" variant="ghost" onPress={() => setFirma((f) => ({ ...f, trazos: [] }))} />
              ) : undefined
            }
          />
          {/* El recuadro ocupa el lugar libre (entre 140 y 260 de alto), así el modal entra en pantallas chicas. */}
          <SignaturePad
            value={firma}
            onChange={setFirma}
            disabled={enviando}
            style={{ flexGrow: 1, minHeight: 140, maxHeight: 260 }}
          />

          <Paso numero={2} titulo="Ubicación" />
          {ubicacion.data ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Icon name="location" size={18} color="success" />
              <AppText variant="caption" color="textSecondary">
                Lat {ubicacion.data.latitud.toFixed(5)}, Long {ubicacion.data.longitud.toFixed(5)}
                {ubicacion.data.precision_m !== null ? ` (±${ubicacion.data.precision_m} m)` : ''}
              </AppText>
            </View>
          ) : ubicacion.error ? (
            <View style={{ gap: spacing.sm }}>
              <Banner tone="warning" message={ubicacion.error} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Reintentar" icon="refresh" variant="secondary" onPress={ubicacion.reload} />
                <Button title="Ajustes" icon="settings-outline" variant="ghost" onPress={() => Linking.openSettings()} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption" color="textSecondary">
                Buscando tu ubicación…
              </AppText>
            </View>
          )}

          <Paso numero={3} titulo="Confirmación" />
          {biometria.data && !huellaDisponible ? (
            <Banner
              tone="warning"
              message="Tu celular no tiene una huella registrada. Agregala en los ajustes de seguridad del celular para poder firmar."
            />
          ) : (
            <AppText variant="caption" color="textSecondary">
              Al tocar el botón, el celular te pide tu {biometria.data?.tipo ?? 'huella'}. La huella no sale del celular.
            </AppText>
          )}

          {error && <Banner tone="danger" message={error} />}

          <View style={{ flexGrow: 1 }} />
          <Button
            title={enviando ? 'Firmando…' : `Firmar con ${biometria.data?.tipo ?? 'huella'}`}
            icon="finger-print"
            onPress={confirmar}
            loading={enviando}
            disabled={!listo}
            fullWidth
          />
          {!hayFirma && (
            <AppText variant="caption" color="textMuted" align="center">
              Dibujá tu firma en el recuadro para continuar.
            </AppText>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}