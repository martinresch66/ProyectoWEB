import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { formatearBytes, TIPOS, TIPOS_DOCUMENTO, TIPOS_VINCULO_INVERSO } from '@/domain/dominio';
import type { Documento, NodoConvenio } from '@/models';
import { useAppTheme } from '@/theme';

import { AppText, Badge, Card, Icon, type IconName } from '../atoms';
import { EstadoBadge, VigenciaBadge } from '../molecules';

export interface ArbolConveniosProps {
  /** Un árbol por familia de convenios (la raíz es el convenio padre de más arriba). */
  arboles: NodoConvenio[];
  onAbrirConvenio: (id: number) => void;
  onAbrirDocumento: (id: number) => void;
}

const contar = (n: NodoConvenio): number => 1 + n.hijos.reduce((t, h) => t + contar(h), 0);

/**
 * Organismo: resultados del buscador avanzado como árbol.
 * Convenio padre → convenios hijos (específicos, adendas…), y en cada uno sus resoluciones asignadas
 * y el resto de la documentación. Lo que cumple la búsqueda se marca; lo demás se muestra para dar contexto.
 */
export function ArbolConvenios({ arboles, onAbrirConvenio, onAbrirDocumento }: ArbolConveniosProps) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {arboles.map((raiz) => (
        <Card key={raiz.convenio.id} style={{ padding: spacing.md }}>
          <Nodo
            nodo={raiz}
            marcarCoincidencias={contar(raiz) > 1}
            onAbrirConvenio={onAbrirConvenio}
            onAbrirDocumento={onAbrirDocumento}
          />
        </Card>
      ))}
    </View>
  );
}

interface NodoProps {
  nodo: NodoConvenio;
  /** Solo hace falta marcar "Coincide" cuando la familia tiene más de un convenio. */
  marcarCoincidencias: boolean;
  onAbrirConvenio: (id: number) => void;
  onAbrirDocumento: (id: number) => void;
}

function Nodo({ nodo, marcarCoincidencias, onAbrirConvenio, onAbrirDocumento }: NodoProps) {
  const { colors, spacing } = useAppTheme();
  const [abierto, setAbierto] = useState(true);
  const c = nodo.convenio;
  const contenido = nodo.resoluciones.length + nodo.documentos.length + nodo.hijos.length;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
        <Pressable
          onPress={() => setAbierto((a) => !a)}
          disabled={contenido === 0}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto, disabled: contenido === 0 }}
          accessibilityLabel={abierto ? `Plegar ${c.codigo}` : `Desplegar ${c.codigo}`}
          hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', opacity: contenido === 0 ? 0 : 1 }}>
          <Icon name={abierto ? 'chevron-down' : 'chevron-forward'} size={18} color="textSecondary" />
        </Pressable>

        <Pressable
          onPress={() => onAbrirConvenio(c.id)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${c.codigo}: ${c.titulo}`}
          style={({ pressed }) => ({ flex: 1, gap: spacing.xs, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="label" color="textMuted" style={{ flex: 1 }} numberOfLines={1}>
              {c.codigo} · {TIPOS[c.tipo] ?? c.tipo}
            </AppText>
            <Icon name="chevron-forward" size={16} color="textMuted" />
          </View>
          <AppText variant="bodyStrong" numberOfLines={2} style={{ color: nodo.coincide ? colors.text : colors.textSecondary }}>
            {c.titulo}
          </AppText>
          {c.unidad && (
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {c.unidad.nombre}
            </AppText>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {marcarCoincidencias && nodo.coincide && <Badge label="Coincide" tone="primary" icon="search" />}
            <EstadoBadge estado={c.estado} />
            <VigenciaBadge convenio={c} />
          </View>
        </Pressable>
      </View>

      {abierto && contenido > 0 && (
        // Línea guía a la izquierda: todo lo que está adentro pertenece a este convenio.
        <View style={{ marginLeft: 13, paddingLeft: spacing.md + 2, borderLeftWidth: 2, borderLeftColor: colors.border, gap: spacing.md }}>
          {nodo.resoluciones.length > 0 && (
            <Grupo icono="ribbon-outline" titulo={`Resoluciones (${nodo.resoluciones.length})`}>
              {nodo.resoluciones.map((d) => (
                <FilaDocumento key={d.id} documento={d} icono="ribbon-outline" onPress={() => onAbrirDocumento(d.id)} />
              ))}
            </Grupo>
          )}
          {nodo.documentos.length > 0 && (
            <Grupo icono="folder-open-outline" titulo={`Documentación (${nodo.documentos.length})`}>
              {nodo.documentos.map((d) => (
                <FilaDocumento key={d.id} documento={d} icono="document-attach-outline" onPress={() => onAbrirDocumento(d.id)} />
              ))}
            </Grupo>
          )}
          {nodo.resoluciones.length === 0 && nodo.documentos.length === 0 && (
            <AppText variant="caption" color="textMuted">
              Sin resoluciones ni documentos cargados.
            </AppText>
          )}
          {nodo.hijos.map((hijo) => (
            <View key={hijo.convenio.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="git-branch-outline" size={14} color="textMuted" />
                <AppText variant="label" color="textMuted">
                  {hijo.tipo_vinculo ? TIPOS_VINCULO_INVERSO[hijo.tipo_vinculo] : 'Convenio hijo'}
                </AppText>
              </View>
              <Nodo
                nodo={hijo}
                marcarCoincidencias={marcarCoincidencias}
                onAbrirConvenio={onAbrirConvenio}
                onAbrirDocumento={onAbrirDocumento}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Grupo({ icono, titulo, children }: { icono: IconName; titulo: string; children: ReactNode }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Icon name={icono} size={14} color="textSecondary" />
        <AppText variant="label" color="textSecondary">
          {titulo}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function FilaDocumento({ documento: d, icono, onPress }: { documento: Documento; icono: IconName; onPress: () => void }) {
  const { spacing } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${d.nombre_original}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icono} size={18} color={d.tipo_documento === 'resolucion' ? 'primary' : 'danger'} />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" numberOfLines={1}>
          {d.nombre_original}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {TIPOS_DOCUMENTO[d.tipo_documento] ?? d.tipo_documento} · v{d.version} · {formatearBytes(d.tamano_bytes)}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={16} color="textMuted" />
    </Pressable>
  );
}
