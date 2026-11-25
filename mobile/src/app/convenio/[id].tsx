import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, Icon, type IconName } from '@/components/atoms';
import { Banner, EmptyState, EstadoBadge, ListItem, SectionHeader, VigenciaBadge } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAuth } from '@/context/AuthContext';
import { ESTADOS, formatearBytes, formatearMonto, nombrePersona, ROLES_QUE_FIRMAN, ROLES_QUE_SUBEN, TIPOS, TIPOS_DOCUMENTO, TIPOS_VINCULO, TIPOS_VINCULO_INVERSO, } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import type { ConvenioRelacionado } from '@/models';
import { useConexion } from '@/services/conexion.store';
import { offlineService } from '@/services/offline.service';
import { useAppTheme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <Icon name={icon} size={18} color="textSecondary" />
      <View style={{ flex: 1 }}>
        <AppText variant="label" color="textMuted">
          {label}
        </AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

/** Fila que abre otro convenio (vínculos padre/hijo). */
function ConvenioVinculado({ etiqueta, convenio }: { etiqueta: string; convenio: ConvenioRelacionado }) {
  const { spacing } = useAppTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/convenio/[id]', params: { id: String(convenio.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta} ${convenio.codigo}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Icon name="git-branch-outline" size={18} color="primary" />
      <View style={{ flex: 1 }}>
        <AppText variant="label" color="textMuted">
          {etiqueta} · {convenio.codigo}
        </AppText>
        <AppText numberOfLines={2}>{convenio.titulo}</AppText>
      </View>
      <Icon name="chevron-forward" size={16} color="textMuted" />
    </Pressable>
  );
}

/**
 * Ficha de un convenio (GET /agreements/{id}): los mismos datos que la ficha de la web.
 * Etapa 4: visor de PDF, compartir y árbol de documentación. Etapas 5 y 6: firmar y comentarios.
 */
export default function ConvenioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useAppTheme();
  const { usuario } = useAuth();
  // Sin conexión se muestra la ficha guardada en el celular (solo la de los pendientes de firma).
  const { data: c, loading, error, reload } = useAsync(() => offlineService.obtenerFicha(usuario?.id, id), [id]);
  const router = useRouter();
  const { sinConexion } = useConexion(reload);
  // Al volver del documento (por ejemplo, después de firmar), se actualiza el estado del convenio.
  useRecargarAlVolver(reload);

  if (loading && !c) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (error || !c) {
    return (
      <Screen>
        <EmptyState
          icon={sinConexion ? 'cloud-offline-outline' : 'alert-circle-outline'}
          title={sinConexion ? 'Sin conexión' : 'No se pudo abrir el convenio'}
          message={error ?? undefined}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={reload} />}
        />
      </Screen>
    );
  }

  const pasantia = c.detalle_pasantia;
  const pendientes = c.observaciones.filter((o) => !Number(o.esta_resuelta));
  const puedeFirmar = c.estado === 'aprobado' && !!usuario && ROLES_QUE_FIRMAN.includes(usuario.rol);
  const puedeSubir = !!usuario && ROLES_QUE_SUBEN.includes(usuario.rol);

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color="textMuted">
          {c.codigo} · versión {c.version}
        </AppText>
        <AppText variant="title">{c.titulo}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <EstadoBadge estado={c.estado} />
          <Badge label={TIPOS[c.tipo] ?? c.tipo} tone="primary" outline />
          <VigenciaBadge convenio={c} />
        </View>
      </View>

      {sinConexion && (
        <Banner
          tone="warning"
          title="Sin conexión"
          message="Estás viendo los datos guardados en el celular. Para firmar, comentar o subir documentos necesitás conexión."
        />
      )}
      
      <Button
        title={puedeFirmar ? 'Leer y firmar' : 'Ver el documento (PDF)'}
        icon={puedeFirmar ? 'create-outline' : 'document-text-outline'}
        variant={puedeFirmar ? 'primary' : 'secondary'}
        onPress={() => router.push({ pathname: '/documento/[id]', params: { id: String(c.id) } })}
      />
      <Button
        title="Escuchar el convenio"
        icon="headset-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/escuchar/[id]', params: { id: String(c.id) } })}
      />

      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem
          icon="chatbubbles-outline"
          title="Comentarios"
          subtitle="Conversá con los demás usuarios sobre este convenio"
          onPress={() => router.push({ pathname: '/comentarios/[id]', params: { id: String(c.id) } })}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        {c.resumen && <InfoRow icon="document-text-outline" label="Resumen" value={c.resumen} />}
        <InfoRow icon="school-outline" label="Unidad gestora" value={c.unidad?.nombre ?? '—'} />
        <InfoRow
          icon="calendar-outline"
          label="Vigencia"
          value={c.fecha_inicio ? `${formatDate(c.fecha_inicio)} → ${c.fecha_fin ? formatDate(c.fecha_fin) : 'sin vencimiento'}` : 'Sin fechas cargadas'}
        />
        {c.dias_preaviso !== null && <InfoRow icon="alarm-outline" label="Preaviso" value={`${c.dias_preaviso} días antes del vencimiento`} />}
        {c.creador && <InfoRow icon="person-outline" label="Cargado por" value={c.creador.nombre} />}
      </Card>

      {pendientes.length > 0 && (
        <Card style={{ gap: spacing.sm, borderColor: colors.warning }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Icon name="alert-circle-outline" size={18} color="warning" />
            <AppText variant="bodyStrong">
              {pendientes.length === 1 ? 'Observación sin resolver' : `${pendientes.length} observaciones sin resolver`}
            </AppText>
          </View>
          {pendientes.map((o) => (
            <AppText key={o.id} variant="caption" color="textSecondary">
              “{o.observacion}” — {o.revisor?.nombre ?? 'Revisión'}, {formatDate(o.creado_en)}
            </AppText>
          ))}
        </Card>
      )}

      <View>
        <SectionHeader title="Partes firmantes" />
        <Card style={{ gap: spacing.md }}>
          {c.partes.length ? (
            c.partes.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <Icon name="business-outline" size={18} color="textSecondary" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{p.nombre}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {[p.pivot?.rol_en_convenio, p.cuit_cuil && `CUIT ${p.cuit_cuil}`].filter(Boolean).join(' · ') || '—'}
                  </AppText>
                </View>
              </View>
            ))
          ) : (
            <AppText color="textSecondary">Todavía no tiene partes cargadas.</AppText>
          )}
        </Card>
      </View>

      {c.personas.length > 0 && (
        <View>
          <SectionHeader title="Personas" />
          <Card style={{ gap: spacing.md }}>
            {c.personas.map((p) => (
              <InfoRow key={`${p.id}-${p.pivot.rol}`} icon="person-circle-outline" label={p.pivot.rol} value={nombrePersona(p)} />
            ))}
          </Card>
        </View>
      )}

      {pasantia && (
        <View>
          <SectionHeader title="Pasantía" />
          <Card style={{ gap: spacing.md }}>
            <InfoRow icon="person-outline" label="Estudiante" value={nombrePersona(pasantia.estudiante)} />
            <InfoRow icon="ribbon-outline" label="Carrera" value={pasantia.carrera} />
            <InfoRow icon="time-outline" label="Carga horaria" value={`${pasantia.horas_semanales} horas semanales`} />
            <InfoRow icon="cash-outline" label="Asignación estímulo" value={formatearMonto(pasantia.monto_estimulo)} />
            <InfoRow icon="school-outline" label="Tutor académico" value={nombrePersona(pasantia.tutor_academico)} />
            <InfoRow icon="briefcase-outline" label="Tutor de la institución" value={nombrePersona(pasantia.tutor_institucion)} />
            {pasantia.aseguradora && (
              <InfoRow icon="shield-checkmark-outline" label="Seguro" value={`${pasantia.aseguradora} · ${pasantia.numero_poliza ?? 's/n'}`} />
            )}
          </Card>
        </View>
      )}

      {(c.vinculos_origen.length > 0 || c.vinculos_destino.length > 0) && (
        <View>
          <SectionHeader title="Convenios vinculados" />
          <Card style={{ gap: spacing.md }}>
            {c.vinculos_origen.map(
              (v) => v.convenio_destino && <ConvenioVinculado key={`o${v.id}`} etiqueta={TIPOS_VINCULO[v.tipo_vinculo]} convenio={v.convenio_destino} />,
            )}
            {c.vinculos_destino.map(
              (v) => v.convenio_origen && <ConvenioVinculado key={`d${v.id}`} etiqueta={TIPOS_VINCULO_INVERSO[v.tipo_vinculo]} convenio={v.convenio_origen} />,
            )}
          </Card>
        </View>
      )}

      <View>
        <SectionHeader
          title="Documentos"
          actionLabel={puedeSubir ? 'Subir PDF' : undefined}
          onAction={() => router.push({ pathname: '/subir/[id]', params: { id: String(c.id) } })}
        />
        <Card style={{ gap: spacing.md }}>
          {c.documentos.length ? (
            c.documentos.map((d) => (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${d.nombre_original}`}
                onPress={() => router.push({ pathname: '/archivo/[id]', params: { id: String(d.id) } })}
                style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.md, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
                <Icon name="document-attach-outline" size={18} color="danger" />
                <View style={{ flex: 1 }}>
                  <AppText numberOfLines={1}>{d.nombre_original}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {TIPOS_DOCUMENTO[d.tipo_documento] ?? d.tipo_documento} · v{d.version} · {formatearBytes(d.tamano_bytes)}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    Subido por {d.usuario?.nombre ?? '—'} el {formatDateTime(d.creado_en)}
                  </AppText>
                </View>
                <Icon name="chevron-forward" size={18} color="textMuted" />
              </Pressable>
            ))
          ) : (
            <AppText color="textSecondary">Sin documentos.</AppText>
          )}
        </Card>
      </View>

      <View>
        <SectionHeader title="Historial" />
        <Card style={{ gap: spacing.md }}>
          {c.transiciones.length ? (
            c.transiciones.map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <Icon name="swap-horizontal-outline" size={18} color="textSecondary" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">
                    {t.estado_anterior ? `${ESTADOS[t.estado_anterior]} → ` : ''}
                    {ESTADOS[t.estado_nuevo]}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {t.motivo}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {t.usuario?.nombre ?? '—'} · {formatDateTime(t.creado_en)}
                  </AppText>
                </View>
              </View>
            ))
          ) : (
            <AppText color="textSecondary">Sin cambios de estado todavía.</AppText>
          )}
        </Card>
      </View>
    </Screen>
  );
}
