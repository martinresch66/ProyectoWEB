import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button, Card, Input } from '@/components/atoms';
import { Banner, ComentarioItem, EmptyState } from '@/components/molecules';
import { SinConexion } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { useAsync } from '@/hooks/useAsync';
import { comentariosService } from '@/services/comentarios.service';
import { useConexion } from '@/services/conexion.store';
import { useAppTheme, type Tone } from '@/theme';
import { mensajeDeError } from '@/utils/confirm';

/** Largo máximo de un comentario (el mismo límite que controla la API). */
const MAX_LARGO = 1000;

/**
 * Comentarios dentro del convenio (T2, Firmador): entre los usuarios que pueden ver el convenio.
 * El campo para escribir va arriba (así el teclado nunca lo tapa) y la lista, del más nuevo al más viejo.
 * Si un comentario es ofensivo, la API lo detecta sola y se publica como "Comentario ofensivo".
 */
export default function ComentariosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useAppTheme();
  const { data, loading, error, reload } = useAsync(() => comentariosService.listar(id), [id]);
  const { sinConexion } = useConexion(reload);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: Tone; texto: string } | null>(null);
  const largo = texto.trim().length;

  async function publicar() {
    setAviso(null);
    setEnviando(true);
    try {
      const { message, comentario } = await comentariosService.crear(id, texto.trim());
      setTexto('');
      setAviso({ tono: comentario.es_ofensivo ? 'warning' : 'success', texto: message });
      reload();
    } catch (e) {
      setAviso({ tono: 'danger', texto: mensajeDeError(e) });
    } finally {
      setEnviando(false);
    }
  }

   // Modo offline: los comentarios necesitan conexión (al volver, se recargan solos).
  if (sinConexion) {
    return (
      <Screen>
        <SinConexion mensaje="Para ver y escribir comentarios necesitás conexión." />
      </Screen>
    );
  }

  // Primera carga fallida (sin datos que mostrar).
  if (error && !data) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar los comentarios"
          message={error}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={reload} />}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <Stack.Screen options={{ title: data ? `Comentarios · ${data.convenio.codigo}` : 'Comentarios' }} />

      {data?.puede_comentar === false ? (
        <Banner tone="info" message="Tu rol (consulta) puede leer los comentarios, pero no escribirlos." />
      ) : (
        <Card style={{ gap: spacing.sm }}>
          <Input
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribí un comentario…"
            accessibilityLabel="Nuevo comentario"
            multiline
            maxLength={MAX_LARGO}
            editable={!enviando}
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
          <AppText variant="caption" color="textMuted">
            {largo}/{MAX_LARGO} · Lo ven solo los usuarios con acceso a este convenio.
          </AppText>
          <Button title="Publicar" icon="send" onPress={publicar} loading={enviando} disabled={largo < 2 || !data} />
        </Card>
      )}

      {aviso && <Banner tone={aviso.tono} message={aviso.texto} />}

      {!data ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
      ) : data.comentarios.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="Todavía no hay comentarios" message="Sé el primero en comentar este convenio." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {data.comentarios.map((c) => (
            <ComentarioItem key={c.id} comentario={c} />
          ))}
        </View>
      )}
    </Screen>
  );
}