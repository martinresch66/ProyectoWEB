import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppText, Avatar, Button, Card, Icon } from '@/components/atoms';
import { Banner, ListItem, SegmentedControl } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/domain/dominio';
import { useAppTheme, type FontSizeOption, type ThemeMode } from '@/theme';
import { confirmar, mensajeDeError } from '@/utils/confirm';

/**
 * Mi Perfil.
 * - Datos del usuario logueado.
 * - Apariencia: modo claro/oscuro y tamaño de letra (se aplican en toda la app).
 * - Seguridad: ingreso con huella y cerrar sesión.
 * Etapa 7: foto de perfil.
 */
export default function PerfilScreen() {
  const { mode, setMode, fontSize, setFontSize, spacing, colors } = useAppTheme();
  const { usuario, biometria, huellaActiva, activarHuella, desactivarHuella, cerrarSesion } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cambiandoHuella, setCambiandoHuella] = useState(false);

  async function cambiarHuella(activar: boolean) {
    setError(null);
    setCambiandoHuella(true);
    try {
      if (activar) {
        const ok = await activarHuella();
        if (!ok) setError(`No se pudo validar tu ${biometria.tipo}.`);
      } else {
        await desactivarHuella();
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCambiandoHuella(false);
    }
  }

  async function salir() {
    const ok = await confirmar(
      'Cerrar sesión',
      huellaActiva
        ? `Vas a tener que volver a ingresar. Podrás hacerlo con tu ${biometria.tipo}.`
        : 'Vas a tener que volver a ingresar con tu contraseña y un código de verificación.',
      'Cerrar sesión',
    );
    if (ok) await cerrarSesion();
  }

  if (!usuario) return null;

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Avatar name={usuario.nombre} size={64} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{usuario.nombre}</AppText>
            <AppText variant="caption" color="textSecondary">
              {ROLES[usuario.rol] ?? usuario.rol} · {usuario.unidad?.nombre ?? 'Alcance global'}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {usuario.email}
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">Apariencia</AppText>
        <SegmentedControl<ThemeMode>
          accessibilityLabel="Modo de color"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Claro', icon: 'sunny-outline' },
            { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
            { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
          ]}
        />

        <AppText variant="bodyStrong" style={{ marginTop: spacing.sm }}>
          Tamaño de letra
        </AppText>
        <SegmentedControl<FontSizeOption>
          accessibilityLabel="Tamaño de letra"
          value={fontSize}
          onChange={setFontSize}
          options={[
            { value: 'small', label: 'Chica' },
            { value: 'medium', label: 'Mediana' },
            { value: 'large', label: 'Grande' },
          ]}
        />
        <AppText variant="caption" color="textMuted">
          El cambio se aplica en toda la app y queda guardado en el celular.
        </AppText>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">Seguridad</AppText>
        {error && <Banner tone="danger" message={error} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Icon name="finger-print" size={22} color={biometria.disponible ? 'primary' : 'textMuted'} />
          <View style={{ flex: 1 }}>
            <AppText>Ingreso con {biometria.tipo}</AppText>
            <AppText variant="caption" color="textSecondary">
              {biometria.disponible
                ? huellaActiva
                  ? 'Activo en este celular'
                  : 'Entrá sin contraseña ni código'
                : 'Este dispositivo no tiene biometría configurada'}
            </AppText>
          </View>
          <Switch
            value={huellaActiva}
            onValueChange={cambiarHuella}
            disabled={!biometria.disponible || cambiandoHuella}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel={`Ingreso con ${biometria.tipo}`}
          />
        </View>
        <Button title="Cerrar sesión" icon="log-out-outline" variant="ghost" onPress={salir} fullWidth />
      </Card>

      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem
          icon="finger-print-outline"
          title="Registrar mi identidad"
          subtitle="Firma, rostro y huella"
          onPress={() => router.push('/identidad')}
        />
        <ListItem
          icon="help-circle-outline"
          title="Ayuda"
          subtitle="Manual de usuario"
          onPress={() => router.push('/ayuda')}
        />
        <ListItem
          icon="grid-outline"
          title="Componentes"
          subtitle="Catálogo de Atomic Design"
          onPress={() => router.push('/componentes')}
        />
      </Card>
    </Screen>
  );
}
