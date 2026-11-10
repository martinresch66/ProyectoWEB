import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Button, Card } from '@/components/atoms';
import { Banner, FormField, PasswordField } from '@/components/molecules';
import { AuthHeader } from '@/components/organisms';
import { AuthScreen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Usuarios de database/seeds.sql, los mismos que muestra la web en modo simulado. En la API simulada la contraseña es 1234
 * (en Laravel sigue siendo password123, la del seed).
 * Solo aparecen mientras se desarrolla (__DEV__), no en el APK final.
 */
const USUARIOS_DE_PRUEBA = [
  { email: 'admin@unlpam.edu.ar', rol: 'Administración (global)' },
  { email: 'gestion.ing@unlpam.edu.ar', rol: 'Gestión · Ingeniería' },
  { email: 'revision@unlpam.edu.ar', rol: 'Revisión' },
  { email: 'consulta.exactas@unlpam.edu.ar', rol: 'Consulta · Exactas' },
];
const PASSWORD_DE_PRUEBA = '1234';

/**
 * Login (paso 1): email y contraseña, o ingreso con huella si está activado en este celular.
 * Si la contraseña es correcta, sigue a la verificación en dos pasos (MFA).
 */
export default function LoginScreen() {
  const { spacing, colors } = useAppTheme();
  const router = useRouter();
  const { iniciarLogin, ingresarConHuella, huellaDe, biometria } = useAuth();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoHuella, setCargandoHuella] = useState(false);

  async function ingresar() {
    const nuevos: typeof errores = {};
    if (!EMAIL_REGEX.test(email.trim())) nuevos.email = 'Ingresá un email válido.';
    if (!password) nuevos.password = 'Ingresá tu contraseña.';
    setErrores(nuevos);
    setError(null);
    if (Object.keys(nuevos).length) return;

    setCargando(true);
    try {
      await iniciarLogin(email, password);
      setPassword('');
      router.push('/verificacion');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  async function ingresarHuella() {
    setError(null);
    setCargandoHuella(true);
    try {
      await ingresarConHuella();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargandoHuella(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Convenios UNLPam" subtitle="Ingresá con tu cuenta institucional para gestionar y firmar convenios." />

      {error && <Banner tone="danger" message={error} />}

      <View style={{ gap: spacing.lg }}>
        <FormField
          label="Email institucional"
          placeholder="usuario@unlpam.edu.ar"
          value={email}
          onChangeText={setEmail}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <PasswordField
          ref={passwordRef}
          label="Contraseña"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          error={errores.password}
          returnKeyType="go"
          onSubmitEditing={ingresar}
        />
        <Button title="Ingresar" icon="log-in-outline" onPress={ingresar} loading={cargando} fullWidth />
      </View>

      {huellaDe && (
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <AppText variant="caption" color="textMuted">
              o
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
          <Button
            title={`Ingresar con ${biometria.tipo}`}
            icon={biometria.tipo === 'rostro' ? 'happy-outline' : 'finger-print'}
            variant="secondary"
            onPress={ingresarHuella}
            loading={cargandoHuella}
            fullWidth
          />
          <AppText variant="caption" color="textMuted" align="center">
            Como {huellaDe.nombre}
          </AppText>
        </View>
      )}

      <AppText variant="caption" color="textMuted" align="center">
        Por seguridad, después de la contraseña te vamos a pedir un código de verificación.
      </AppText>

      {__DEV__ && (
        <Card style={{ gap: spacing.xs, backgroundColor: colors.infoSoft, borderColor: colors.info }}>
          <AppText variant="bodyStrong" style={{ color: colors.info }}>
            Usuarios de prueba
          </AppText>
          <AppText variant="caption" style={{ color: colors.info }}>
            Contraseña de todos: {PASSWORD_DE_PRUEBA}. Tocá uno para completar el formulario.
          </AppText>
          {USUARIOS_DE_PRUEBA.map((u) => (
            <Pressable
              key={u.email}
              onPress={() => {
                setEmail(u.email);
                setPassword(PASSWORD_DE_PRUEBA);
                setErrores({});
              }}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${u.email}`}
              style={{ paddingVertical: spacing.sm }}>
              <AppText variant="label" style={{ color: colors.info }}>
                {u.rol}
              </AppText>
              <AppText variant="caption" style={{ color: colors.info }}>
                {u.email}
              </AppText>
            </Pressable>
          ))}
        </Card>
      )}
    </AuthScreen>
  );
}
