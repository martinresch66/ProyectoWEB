import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Icon, type IconName } from '@/components/atoms';
import { Banner } from '@/components/molecules';
import { AuthHeader } from '@/components/organisms';
import { AuthScreen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';

function Beneficio({ icon, texto }: { icon: IconName; texto: string }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <Icon name={icon} size={20} color="success" />
      <AppText style={{ flex: 1 }}>{texto}</AppText>
    </View>
  );
}

/** Se ofrece después del primer login con contraseña: activar el ingreso con huella en este celular. */
export default function ActivarHuellaScreen() {
  const { spacing } = useAppTheme();
  const router = useRouter();
  const { activarHuella, descartarOfertaHuella, biometria } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function salir() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function activar() {
    setError(null);
    setCargando(true);
    try {
      const ok = await activarHuella();
      if (ok) salir();
      else setError(`No se pudo validar tu ${biometria.tipo}. Probá de nuevo.`);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  function ahoraNo() {
    descartarOfertaHuella();
    salir();
  }

  return (
    <AuthScreen>
      <AuthHeader
        icon={biometria.tipo === 'rostro' ? 'happy-outline' : 'finger-print'}
        title={`¿Ingresar con tu ${biometria.tipo}?`}
        subtitle="La próxima vez vas a poder entrar sin escribir tu contraseña ni esperar un código."
      />

      {error && <Banner tone="danger" message={error} />}

      <View style={{ gap: spacing.md }}>
        <Beneficio icon="flash-outline" texto="Ingreso en un segundo" />
        <Beneficio icon="lock-closed-outline" texto="Tu huella nunca sale del celular: la valida el sistema" />
        <Beneficio icon="settings-outline" texto="Podés desactivarlo cuando quieras desde Mi Perfil" />
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title={`Activar ${biometria.tipo}`} icon="finger-print" onPress={activar} loading={cargando} fullWidth />
        <Button title="Ahora no" variant="ghost" onPress={ahoraNo} fullWidth />
      </View>
    </AuthScreen>
  );
}
