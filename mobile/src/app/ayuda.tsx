import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Card, Icon } from '@/components/atoms';
import { Desplegable, ListaPasos } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { AYUDAS, MANUALES, type SeccionAyuda } from '@/domain/ayuda';
import { useAppTheme } from '@/theme';

const SECCIONES = Object.keys(AYUDAS) as SeccionAyuda[];

/**
 * Ayuda al usuario (T2): manual de uso.
 * - Paso a paso para registrar la identidad y para firmar un convenio, con qué hacer si algo falla.
 * - La ayuda de cada pantalla (la misma que abre el botón "?" de su encabezado).
 */
export default function AyudaScreen() {
  const { colors, spacing } = useAppTheme();
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  // Se puede abrir directo en una parte: /ayuda?seccion=firma
  const [abierto, setAbierto] = useState<string | null>(seccion ?? 'identidad');
  const alternar = (id: string) => setAbierto((actual) => (actual === id ? null : id));

  return (
    <Screen>
      <AppText color="textSecondary">
        Tocá un tema para ver el paso a paso. En cada pantalla también tenés el botón{' '}
        <Icon name="help-circle-outline" size={16} color="primary" /> con su ayuda.
      </AppText>

      {MANUALES.map((manual) => (
        <Card key={manual.id} style={{ paddingVertical: spacing.xs }}>
          <Desplegable
            titulo={manual.titulo}
            icono={manual.icono}
            abierto={abierto === manual.id}
            onToggle={() => alternar(manual.id)}>
            <AppText color="textSecondary">{manual.resumen}</AppText>
            <ListaPasos pasos={manual.pasos} />
            <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
              <AppText variant="label" color="textMuted">
                SI ALGO FALLA
              </AppText>
              {manual.problemas.map((p) => (
                <View key={p.pregunta} style={{ gap: 2 }}>
                  <AppText variant="bodyStrong">{p.pregunta}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {p.respuesta}
                  </AppText>
                </View>
              ))}
            </View>
          </Desplegable>
        </Card>
      ))}

      <AppText variant="bodyStrong" style={{ marginTop: spacing.sm }}>
        Ayuda de cada pantalla
      </AppText>
      <Card style={{ paddingVertical: spacing.xs }}>
        {SECCIONES.map((id, i) => {
          const ayuda = AYUDAS[id];
          return (
            <View key={id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
              <Desplegable titulo={ayuda.titulo} icono={ayuda.icono} abierto={abierto === id} onToggle={() => alternar(id)}>
                <AppText color="textSecondary">{ayuda.resumen}</AppText>
                <ListaPasos pasos={ayuda.pasos} />
                {ayuda.consejos?.map((consejo) => (
                  <AppText key={consejo} variant="caption" color="textSecondary">
                    • {consejo}
                  </AppText>
                ))}
              </Desplegable>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}