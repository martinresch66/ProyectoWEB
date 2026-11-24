import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Avatar, Badge, Button, Card } from '@/components/atoms';
import { Banner, FIRMA_VACIA, FirmaPreview, IdentidadCard, puntosDeFirma, SignaturePad } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import type { FirmaDibujada } from '@/models';
import { autenticarConBiometria, obtenerBiometria } from '@/services/biometrics';
import { tomarSelfie } from '@/services/camara.service';
import { identidadService } from '@/services/identidad.service';
import { reconocerRostro } from '@/services/rostro.service';
import { useAppTheme } from '@/theme';
import { confirmar, mensajeDeError } from '@/utils/confirm';

type Dato = 'firma' | 'rostro' | 'huella';

/** Puntos mínimos para guardar una firma (no un toque suelto). */
const PUNTOS_MINIMOS = 10;

/**
 * Registrar mi identidad: la persona registra su firma, su rostro y su huella.
 * - Firma: se dibuja en un recuadro y queda guardada (después se puede usar al firmar un convenio).
 * - Rostro: foto con la cámara delantera; el reconocimiento facial (rostro.service.ts) comprueba que haya un rostro válido.
 * - Huella: se verifica con el sensor del celular.
 * Antes de guardar la firma o el rostro se confirma con la biometría, así nadie registra datos de otro.
 * Todo queda solo en este celular (identidad.service.ts).
 */
export default function IdentidadScreen() {
  const { usuario } = useAuth();
  const { spacing } = useAppTheme();
  const usuarioId = usuario?.id ?? 0;
  const identidad = useAsync(() => identidadService.obtener(usuarioId), [usuarioId]);
  const biometria = useAsync(() => obtenerBiometria(), []);

  const [editandoFirma, setEditandoFirma] = useState(false);
  const [firma, setFirma] = useState<FirmaDibujada>(FIRMA_VACIA);
  const [ocupado, setOcupado] = useState<Dato | null>(null);
  const [aviso, setAviso] = useState<{ tono: 'success' | 'warning' | 'danger'; texto: string } | null>(null);

  const datos = identidad.data;
  const registrados = [datos?.firma, datos?.rostro, datos?.huella].filter(Boolean).length;
  const tieneBiometria = biometria.data?.disponible === true;
  const tipoBiometria = biometria.data?.tipo ?? 'huella';

  /** Confirma que es el dueño del celular. Si el celular no tiene biometría, no se puede confirmar y se sigue. */
  async function confirmarQueSosVos(motivo: string) {
    if (!tieneBiometria) return true;
    return autenticarConBiometria(motivo);
  }

  /** Ejecuta una acción de registro: muestra "cargando", el resultado y recarga los datos. */
  async function registrar(dato: Dato, accion: () => Promise<boolean | string>, mensajeOk: string) {
    if (!usuario) return;
    setAviso(null);
    setOcupado(dato);
    try {
      // true: salió bien. Un texto: se guardó, pero con una advertencia. false: se canceló.
      const hecho = await accion();
      if (hecho) {
        setAviso(typeof hecho === 'string' ? { tono: 'warning', texto: hecho } : { tono: 'success', texto: mensajeOk });
        identidad.reload();
      }
    } catch (e) {
      setAviso({ tono: 'danger', texto: mensajeDeError(e) });
    } finally {
      setOcupado(null);
    }
  }

  const guardarFirma = () =>
    registrar(
      'firma',
      async () => {
        if (!(await confirmarQueSosVos('Confirmá que sos vos para guardar tu firma'))) {
          throw new Error('No se confirmó tu identidad, así que la firma no se guardó.');
        }
        await identidadService.guardarFirma(usuarioId, firma);
        setEditandoFirma(false);
        return true;
      },
      'Tu firma quedó registrada. Vas a poder usarla al firmar un convenio.',
    );

  const registrarRostro = () =>
    registrar(
      'rostro',
      async () => {
        const foto = await tomarSelfie();
        if (!foto) return false; // canceló la cámara
        // Primero el reconocimiento: si la foto no sirve, se avisa por qué y no se guarda nada.
        const resultado = await reconocerRostro(foto);
        if (!(await confirmarQueSosVos('Confirmá que sos vos para guardar tu rostro'))) {
          throw new Error('No se confirmó tu identidad, así que la foto no se guardó.');
        }
        const reconocido = resultado.estado === 'reconocido';
        await identidadService.guardarRostro(usuarioId, foto.uri, reconocido);
        return reconocido
          ? true
          : 'Guardamos tu foto, pero no se pudo reconocer el rostro: el reconocimiento facial funciona en la app instalada, no en Expo Go.';
      },
      'Reconocimos tu rostro y quedó registrado.',
    );

  const registrarHuella = () =>
    registrar(
      'huella',
      async () => {
        if (!(await autenticarConBiometria(`Apoyá tu dedo para registrar tu ${tipoBiometria}`))) {
          throw new Error(`No se pudo verificar tu ${tipoBiometria}. Probá de nuevo.`);
        }
        await identidadService.guardarHuella(usuarioId, tipoBiometria);
        return true;
      },
      `Tu ${tipoBiometria} quedó registrada en este celular.`,
    );

  async function borrarTodo() {
    const ok = await confirmar(
      'Borrar mi identidad',
      'Se borran tu firma, tu rostro y tu huella registrados en este celular. Los convenios que ya firmaste no cambian.',
      'Borrar',
    );
    if (!ok) return;
    await identidadService.borrar(usuarioId);
    setAviso({ tono: 'success', texto: 'Borraste tus datos de identidad de este celular.' });
    identidad.reload();
  }

  // Mientras se dibuja la firma, la pantalla no scrollea (si no, el scroll "se roba" el dedo).
  if (editandoFirma) {
    return (
      <Screen scroll={false}>
        <IdentidadCard
          icon="create-outline"
          titulo="Mi firma"
          descripcion="Firmá con el dedo dentro del recuadro, como en un papel."
          registradoEn={datos?.firma?.registrada_en ?? null}>
          <SignaturePad value={firma} onChange={setFirma} disabled={ocupado === 'firma'} style={{ height: 220 }} />
          {aviso?.tono === 'danger' && <Banner tone="danger" message={aviso.texto} />}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button
              title="Guardar firma"
              icon="checkmark"
              onPress={guardarFirma}
              loading={ocupado === 'firma'}
              disabled={puntosDeFirma(firma) < PUNTOS_MINIMOS}
            />
            {firma.trazos.length > 0 && (
              <Button title="Borrar" icon="trash-outline" variant="ghost" onPress={() => setFirma((f) => ({ ...f, trazos: [] }))} />
            )}
            <Button title="Cancelar" variant="ghost" onPress={() => setEditandoFirma(false)} disabled={ocupado === 'firma'} />
          </View>
        </IdentidadCard>
      </Screen>
    );
  }

  return (
    <Screen refreshing={identidad.loading && !!datos} onRefresh={identidad.reload}>
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">Registraste {registrados} de 3</AppText>
        <AppText variant="caption" color="textSecondary">
          Tu identidad se guarda solo en este celular, en una carpeta privada de la app. La huella y el rostro del sistema
          nunca salen del dispositivo.
        </AppText>
      </Card>

      {aviso && <Banner tone={aviso.tono} message={aviso.texto} />}
      {identidad.error && <Banner tone="danger" message={identidad.error} />}

      <IdentidadCard
        icon="create-outline"
        titulo="Mi firma"
        descripcion="Tu firma manuscrita. Al firmar un convenio vas a poder usarla con un toque."
        registradoEn={datos?.firma?.registrada_en ?? null}>
        {datos?.firma && <FirmaPreview firma={datos.firma} />}
        <Button
          title={datos?.firma ? 'Cambiar mi firma' : 'Registrar mi firma'}
          icon="create-outline"
          variant={datos?.firma ? 'secondary' : 'primary'}
          onPress={() => {
            setAviso(null);
            setFirma(FIRMA_VACIA);
            setEditandoFirma(true);
          }}
          disabled={ocupado !== null}
        />
      </IdentidadCard>

      <IdentidadCard
        icon="happy-outline"
        titulo="Reconocimiento facial"
        descripcion="Una foto de tu rostro con la cámara delantera: de frente, cerca, con buena luz y sin anteojos de sol. La app comprueba que se vea bien tu cara."
        registradoEn={datos?.rostro?.registrado_en ?? null}>
        {datos?.rostro && usuario && (
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Avatar name={usuario.nombre} uri={datos.rostro.foto} size={112} />
            {datos.rostro.reconocido ? (
              <Badge label="Rostro reconocido" tone="success" icon="scan-outline" />
            ) : (
              <Badge label="Rostro sin verificar" tone="warning" icon="alert-circle-outline" />
            )}
          </View>
        )}
        {datos?.rostro && !datos.rostro.reconocido && (
          <AppText variant="caption" color="textSecondary">
            Esta foto se guardó sin reconocimiento facial. Volvé a registrar tu rostro desde la app instalada para verificarlo.
          </AppText>
        )}
        <Button
          title={datos?.rostro ? 'Volver a registrar mi rostro' : 'Registrar mi rostro'}
          icon="camera-outline"
          variant={datos?.rostro ? 'secondary' : 'primary'}
          onPress={registrarRostro}
          loading={ocupado === 'rostro'}
          disabled={ocupado !== null && ocupado !== 'rostro'}
        />
      </IdentidadCard>

      <IdentidadCard
        icon="finger-print"
        titulo="Huella digital"
        descripcion={`Se verifica tu ${tipoBiometria} con el sensor del celular y queda registrada en este dispositivo.`}
        registradoEn={datos?.huella?.registrada_en ?? null}>
        {biometria.data && !tieneBiometria ? (
          <Banner
            tone="warning"
            message="Tu celular no tiene una huella registrada. Agregala en los ajustes de seguridad del celular y volvé."
          />
        ) : (
          <Button
            title={datos?.huella ? `Volver a verificar mi ${tipoBiometria}` : `Registrar mi ${tipoBiometria}`}
            icon="finger-print"
            variant={datos?.huella ? 'secondary' : 'primary'}
            onPress={registrarHuella}
            loading={ocupado === 'huella'}
            disabled={!biometria.data || (ocupado !== null && ocupado !== 'huella')}
          />
        )}
      </IdentidadCard>

      {registrados > 0 && (
        <Button title="Borrar mi identidad de este celular" icon="trash-outline" variant="ghost" onPress={borrarTodo} fullWidth />
      )}
    </Screen>
  );
}