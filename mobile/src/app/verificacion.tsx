import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Icon, type IconName } from '@/components/atoms';
import { Banner, CodeInput } from '@/components/molecules';
import { AuthHeader } from '@/components/organisms';
import { AuthScreen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import type { CanalMfa } from '@/models';
import { useAppTheme } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';

const CODIGO_LARGO = 6;

const canalInfo: Record<CanalMfa, { titulo: string; icono: IconName }> = {
  email: { titulo: 'Correo electrónico', icono: 'mail-outline' },
  sms: { titulo: 'Mensaje de texto (SMS)', icono: 'chatbubble-ellipses-outline' },
  push: { titulo: 'Notificación push', icono: 'notifications-outline' },
};

/**
 * Verificación en dos pasos (MFA), paso 2 del login:
 * 1) elegir por dónde recibir el código, 2) ingresarlo.
 * El envío de mail y SMS es simulado: el mensaje llega como notificación al celular.
 */
export default function VerificacionScreen() {
  const { spacing, colors, radius } = useAppTheme();
  const router = useRouter();
  const { mfa, enviarCodigo, verificarCodigo, cancelarLogin } = useAuth();

  const [canal, setCanal] = useState<CanalMfa | null>(null);
  const [destino, setDestino] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<CanalMfa | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [reenviarEn, setReenviarEn] = useState(0);
  /** Mensaje simulado que se muestra en pantalla si no se pudo mostrar la notificación. */
  const [mensajeEnPantalla, setMensajeEnPantalla] = useState<{ titulo: string; cuerpo: string } | null>(null);

  // Cuenta regresiva para poder pedir otro código.
  useEffect(() => {
    if (reenviarEn <= 0) return;
    const t = setTimeout(() => setReenviarEn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviarEn]);

  if (!mfa) return <Redirect href="/login" />;

  async function pedirCodigo(c: CanalMfa) {
    setError(null);
    setEnviando(c);
    try {
      const res = await enviarCodigo(c);
      setCanal(c);
      setDestino(res.destino);
      setCodigo('');
      setReenviarEn(res.reenviar_en_segundos);
      setMensajeEnPantalla(!res.notificado && res.simulacion ? res.simulacion : null);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(null);
    }
  }

  async function verificar(valor: string) {
    if (valor.length !== CODIGO_LARGO) {
      setError(`El código tiene ${CODIGO_LARGO} dígitos.`);
      return;
    }
    setError(null);
    setVerificando(true);
    try {
      await verificarCodigo(valor);
      // Al abrirse la sesión, la navegación pasa sola a la app.
    } catch (err) {
      setError(mensajeDeError(err));
      setCodigo('');
      setVerificando(false);
    }
  }

  function cambiarCodigo(valor: string) {
    setCodigo(valor);
    if (error) setError(null);
    if (valor.length === CODIGO_LARGO) verificar(valor);
  }

  function volver() {
    cancelarLogin();
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  return (
    <AuthScreen>
      <AuthHeader
        icon="shield-checkmark-outline"
        title="Verificá tu identidad"
        subtitle={
          canal
            ? `Te enviamos un código de ${CODIGO_LARGO} dígitos a ${destino}.`
            : '¿Por dónde querés recibir el código de verificación?'
        }
      />

      {error && <Banner tone="danger" message={error} />}

      {!canal ? (
        <View style={{ gap: spacing.md }}>
          {mfa.canales.map((d) => (
            <Card
              key={d.canal}
              onPress={enviando ? undefined : () => pedirCodigo(d.canal)}
              accessibilityLabel={`Recibir código por ${canalInfo[d.canal].titulo}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={canalInfo[d.canal].icono} size={22} color="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{canalInfo[d.canal].titulo}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {d.destino}
                  </AppText>
                </View>
                <Icon name={enviando === d.canal ? 'hourglass-outline' : 'chevron-forward'} size={18} color="textMuted" />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {mensajeEnPantalla && (
            <Banner tone="info" icon="mail-unread-outline" title={mensajeEnPantalla.titulo} message={mensajeEnPantalla.cuerpo} />
          )}

          <CodeInput value={codigo} onChange={cambiarCodigo} hasError={!!error} autoFocus />

          <Button
            title="Verificar"
            icon="checkmark-circle-outline"
            onPress={() => verificar(codigo)}
            loading={verificando}
            fullWidth
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => setCanal(null)} accessibilityRole="button" hitSlop={8}>
              <AppText variant="bodyStrong" color="primary">
                Cambiar método
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => pedirCodigo(canal)}
              disabled={reenviarEn > 0 || !!enviando}
              accessibilityRole="button"
              accessibilityState={{ disabled: reenviarEn > 0 }}
              hitSlop={8}>
              <AppText variant="bodyStrong" color={reenviarEn > 0 ? 'textMuted' : 'primary'}>
                {reenviarEn > 0 ? `Reenviar en ${reenviarEn} s` : 'Reenviar código'}
              </AppText>
            </Pressable>
          </View>

          <AppText variant="caption" color="textMuted" align="center">
            El código vence en 5 minutos. Simulación: el {canal === 'push' ? 'aviso' : canal === 'sms' ? 'SMS' : 'correo'} llega
            como notificación a este celular.
          </AppText>
        </View>
      )}

      <Button title="Volver al inicio de sesión" variant="ghost" icon="arrow-back" onPress={volver} fullWidth />
    </AuthScreen>
  );
}
