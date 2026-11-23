import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import { AppText, Avatar, Button, Card, Icon } from '@/components/atoms';
import { Banner, ListItem, SegmentedControl } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/domain/dominio';
import { avisosStore, useAvisos, type FrecuenciaRecordatorio } from '@/services/avisos.store';
import { elegirFotoPerfil, type OrigenFoto } from '@/services/camara.service';
import { fotoPerfilService, useFotoPerfil } from '@/services/fotoPerfil.service';
import { mostrarNotificacion } from '@/services/notifications';
import { useAppTheme, type FontSizeOption, type ThemeMode } from '@/theme';
import { confirmar, mensajeDeError } from '@/utils/confirm';

/**
 * Mi Perfil.
 * - Datos del usuario logueado.
 * - Apariencia: modo claro/oscuro y tamaño de letra (se aplican en toda la app).
 * - Seguridad: ingreso con huella y cerrar sesión.
  * - Foto de perfil: miniatura guardada en el celular (cámara o galería).
 */
export default function PerfilScreen() {
  const { mode, setMode, fontSize, setFontSize, spacing, colors } = useAppTheme();
  const { usuario, biometria, huellaActiva, activarHuella, desactivarHuella, cerrarSesion } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cambiandoHuella, setCambiandoHuella] = useState(false);
  const { frecuencia } = useAvisos();
  const [sinPermiso, setSinPermiso] = useState(false);

  const foto = useFotoPerfil(usuario?.id ?? null);
  const [cambiandoFoto, setCambiandoFoto] = useState<OrigenFoto | 'quitar' | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  async function cambiarFoto(origen: OrigenFoto) {
    if (!usuario) return;
    setErrorFoto(null);
    setCambiandoFoto(origen);
    try {
      const temporal = await elegirFotoPerfil(origen);
      if (temporal) await fotoPerfilService.guardar(usuario.id, temporal);
    } catch (err) {
      setErrorFoto(mensajeDeError(err));
    } finally {
      setCambiandoFoto(null);
    }
  }

  async function quitarFoto() {
    if (!usuario) return;
    const ok = await confirmar('Quitar foto de perfil', 'Vas a volver a ver tus iniciales.', 'Quitar');
    if (!ok) return;
    setErrorFoto(null);
    setCambiandoFoto('quitar');
    try {
      await fotoPerfilService.quitar(usuario.id);
    } catch (err) {
      setErrorFoto(mensajeDeError(err));
    } finally {
      setCambiandoFoto(null);
    }
  }

  async function probarNotificacion() {
    const ok = await mostrarNotificacion(
      'Notificación de prueba',
      'Así te van a llegar los avisos de tus convenios. Tocala para abrir Avisos.',
      { destino: { pantalla: 'avisos', id: null } },
      'novedades',
    );
    setSinPermiso(!ok);
  }

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
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Avatar name={usuario.nombre} uri={foto} size={72} />
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
        {errorFoto && <Banner tone="danger" message={errorFoto} />}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cámara"
              icon="camera-outline"
              variant="secondary"
              onPress={() => cambiarFoto('camara')}
              loading={cambiandoFoto === 'camara'}
              disabled={cambiandoFoto !== null}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Galería"
              icon="images-outline"
              variant="secondary"
              onPress={() => cambiarFoto('galeria')}
              loading={cambiandoFoto === 'galeria'}
              disabled={cambiandoFoto !== null}
              fullWidth
            />
          </View>
        </View>
        {foto && (
          <Button
            title="Quitar foto"
            icon="trash-outline"
            variant="ghost"
            onPress={quitarFoto}
            loading={cambiandoFoto === 'quitar'}
            disabled={cambiandoFoto !== null}
            fullWidth
          />
        )}
        <AppText variant="caption" color="textMuted">
          Tu foto se guarda solo en este celular, recortada y en miniatura.
        </AppText>
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
        <AppText variant="bodyStrong">Notificaciones</AppText>
        <AppText variant="caption" color="textSecondary">
          Recordarme si tengo convenios por firmar, o si no entro a la app, después de:
        </AppText>
        <SegmentedControl<FrecuenciaRecordatorio>
          accessibilityLabel="Tiempo de los recordatorios"
          value={frecuencia}
          onChange={(valor) => avisosStore.cambiarFrecuencia(valor)}
          options={[
            { value: 'demo', label: '1 min' },
            { value: 'h4', label: '4 h' },
            { value: 'h24', label: '24 h' },
            { value: 'nunca', label: 'Nunca' },
          ]}
        />
        <AppText variant="caption" color="textMuted">
          «1 min» es para la demostración. Las novedades (convenios nuevos, comentarios, cambios de estado o de datos)
          llegan siempre, mientras la app esté abierta o al volver a ella.
        </AppText>
        {sinPermiso && (
          <Banner
            tone="warning"
            message="No se pudo mostrar la notificación. Permití las notificaciones de la app en los ajustes del celular."
          />
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Probar" icon="notifications-outline" variant="secondary" onPress={probarNotificacion} fullWidth />
          </View>
          {sinPermiso && (
            <View style={{ flex: 1 }}>
              <Button title="Ajustes" icon="settings-outline" variant="ghost" onPress={() => Linking.openSettings()} fullWidth />
            </View>
          )}
        </View>
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
          icon="notifications-outline"
          title="Avisos"
          subtitle="Novedades de los últimos 7 días"
          onPress={() => router.push('/avisos')}
        />
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
