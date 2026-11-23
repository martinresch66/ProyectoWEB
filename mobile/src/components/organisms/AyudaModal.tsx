import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AYUDAS, type SeccionAyuda } from '@/domain/ayuda';
import { useAppTheme } from '@/theme';

import { AppText, Button, Icon, IconButton } from '../atoms';
import { ListaPasos } from '../molecules';

/** Velo detrás de la hoja de ayuda: negro semitransparente, sirve igual en modo claro y oscuro. */
const VELO = 'rgba(0, 0, 0, 0.45)';

export interface AyudaModalProps {
  seccion: SeccionAyuda;
  visible: boolean;
  onClose: () => void;
}

/**
 * Organismo: ayuda contextual (T2). Hoja que sube desde abajo con la ayuda de la pantalla actual,
 * sin salir de ella, y un acceso al manual completo.
 */
export function AyudaModal({ seccion, visible, onClose }: AyudaModalProps) {
  const { colors, radius, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ayuda = AYUDAS[seccion];

  function abrirManual() {
    onClose();
    router.push('/ayuda');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: VELO }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar la ayuda"
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: insets.bottom + spacing.lg,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingLeft: spacing.lg,
              paddingRight: spacing.sm,
              paddingTop: spacing.md,
            }}>
            <Icon name={ayuda.icono} size={22} color="primary" />
            <AppText variant="subtitle" accessibilityRole="header" style={{ flex: 1 }}>
              Ayuda: {ayuda.titulo}
            </AppText>
            <IconButton icon="close" label="Cerrar la ayuda" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
            <AppText color="textSecondary">{ayuda.resumen}</AppText>
            <ListaPasos pasos={ayuda.pasos} />
            {ayuda.consejos?.map((consejo) => (
              <View key={consejo} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Icon name="bulb-outline" size={18} color="warning" />
                <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  {consejo}
                </AppText>
              </View>
            ))}
            <View style={{ gap: spacing.sm }}>
              <Button title="Ver el manual completo" icon="book-outline" variant="secondary" onPress={abrirManual} fullWidth />
              <Button title="Entendido" onPress={onClose} fullWidth />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export interface BotonAyudaProps {
  seccion: SeccionAyuda;
}

/** Organismo: botón "?" del encabezado que abre la ayuda de esa pantalla. */
export function BotonAyuda({ seccion }: BotonAyudaProps) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <IconButton icon="help-circle-outline" label={`Ayuda de ${AYUDAS[seccion].titulo}`} onPress={() => setAbierta(true)} />
      <AyudaModal seccion={seccion} visible={abierta} onClose={() => setAbierta(false)} />
    </>
  );
}