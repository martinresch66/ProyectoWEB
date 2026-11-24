import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

import { AppText, Icon } from '../atoms';

export interface OpcionFiltro<T extends string | number> {
  valor: T;
  etiqueta: string;
  /** Texto corto para el campo (ej: la sigla de la unidad); en la lista se ve la etiqueta completa. */
  corta?: string;
}

export interface SelectorFiltroProps<T extends string | number> {
  titulo: string;
  opciones: OpcionFiltro<T>[];
  /** Opción elegida, o undefined si no se filtra por esto ("Todos"). */
  valor: T | undefined;
  onChange: (valor: T | undefined) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Molécula: un filtro del buscador avanzado como campo de selección (como un "select" de un formulario web).
 * Muestra el título y lo elegido; al tocarlo se abre una lista desde abajo para elegir una opción o "Todos".
 */
export function SelectorFiltro<T extends string | number>({ titulo, opciones, valor, onChange, style }: SelectorFiltroProps<T>) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.valor === valor);
  const activo = elegida !== undefined;

  const elegir = (v: T | undefined) => {
    onChange(v);
    setAbierto(false);
  };

  const fila = (clave: string, etiqueta: string, marcada: boolean, onPress: () => void) => (
    <Pressable
      key={clave}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: marcada }}
      accessibilityLabel={etiqueta}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 48,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: marcada ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent',
      })}>
      <AppText style={{ flex: 1, color: marcada ? colors.primary : colors.text }}>{etiqueta}</AppText>
      {marcada && <Icon name="checkmark" size={20} color="primary" />}
    </Pressable>
  );

  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}: ${elegida?.etiqueta ?? 'Todos'}. Tocá para cambiar.`}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: 52,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: activo ? colors.primary : colors.border,
            backgroundColor: activo ? colors.primarySoft : colors.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          },
          style,
        ]}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="textSecondary" numberOfLines={1}>
            {titulo}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ color: activo ? colors.primary : colors.text }}>
            {elegida ? (elegida.corta ?? elegida.etiqueta) : 'Todos'}
          </AppText>
        </View>
        <Icon name="chevron-down" size={16} color={activo ? 'primary' : 'textMuted'} />
      </Pressable>

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Fondo oscuro: tocarlo cierra la lista sin cambiar nada. */}
          <Pressable
            accessibilityLabel="Cerrar"
            onPress={() => setAbierto(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
          <View
            style={{
              maxHeight: '75%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
            }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {titulo}
              </AppText>
              <Pressable onPress={() => setAbierto(false)} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
                <Icon name="close" size={22} color="textSecondary" />
              </Pressable>
            </View>
            <ScrollView accessibilityRole="radiogroup" contentContainerStyle={{ gap: spacing.xs }}>
              {fila('todos', 'Todos', !activo, () => elegir(undefined))}
              {opciones.map((o) => fila(String(o.valor), o.etiqueta, o.valor === valor, () => elegir(o.valor)))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
