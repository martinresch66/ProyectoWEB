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
  /** false cuando se listan todos (sin búsqueda): ahí todo coincide y la marca "Coincide" no aporta. */
  marcarCoincidencias?: boolean;
  /** Si las ramas arrancan desplegadas (al buscar) o plegadas (al listar todos). */
  desplegados?: boolean;
  onAbrirConvenio: (id: number) => void;
  onAbrirDocumento: (id: number) => void;
}

const contar = (n: NodoConvenio): number => 1 + n.hijos.reduce((t, h) => t + contar(h), 0);

/**
 * Organismo: resultados del buscador avanzado como árbol.
 * Convenio padre → convenios hijos (específicos, adendas…), y en cada uno sus resoluciones asignadas
 * y el resto de la documentación. Lo que cumple la búsqueda se marca; lo demás se muestra para dar contexto.
 */
export function ArbolConvenios({
  arboles,
  marcarCoincidencias = true,
  desplegados = true,
  onAbrirConvenio,
  onAbrirDocumento,
}: ArbolConveniosProps) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {arboles.map((raiz) => (
        <Card key={raiz.convenio.id} style={{ padding: spacing.md }}>
          <Nodo
            nodo={raiz}
            raiz
            marcarCoincidencias={marcarCoincidencias && contar(raiz) > 1}
            desplegado={desplegados}
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
  /** Solo la raíz tiene la flecha para plegar o desplegar; los hijos se ven siempre desplegados. */
  raiz?: boolean;
  /** Solo hace falta marcar "Coincide" cuando la familia tiene más de un convenio. */
  marcarCoincidencias: boolean;
  /** Si arranca con sus ramas a la vista. */
  desplegado: boolean;
  onAbrirConvenio: (id: number) => void;
  onAbrirDocumento: (id: number) => void;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Un convenio del árbol. Siempre tiene tres ramas, aunque estén vacías: Resoluciones, Documentación
 * y Convenios hijos (que a su vez son nodos). Plegado, muestra un resumen con cuántos hay en cada una.
 */
function Nodo({ nodo, raiz = false, marcarCoincidencias, desplegado, onAbrirConvenio, onAbrirDocumento }: NodoProps) {
  const { colors, spacing } = useAppTheme();
  const [abiertoRaiz, setAbierto] = useState(desplegado);
  // Solo la raíz se pliega y despliega: al desplegarla se ve toda la familia, con los hijos ya abiertos.
  const abierto = raiz ? abiertoRaiz : true;
  const c = nodo.convenio;
  const total = contar(nodo) - 1;
  const resumen = [
    plural(total, 'convenio hijo', 'convenios hijos'),
    plural(nodo.resoluciones.length, 'resolución', 'resoluciones'),
    plural(nodo.documentos.length, 'documento', 'documentos'),
  ].join(' · ');

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        {/* Toda la tarjeta (menos la flecha) abre el detalle del convenio. */}
        <Pressable
          onPress={() => onAbrirConvenio(c.id)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${c.codigo}: ${c.titulo}`}
          style={({ pressed }) => ({ flex: 1, gap: spacing.xs, opacity: pressed ? 0.6 : 1 })}>
          <AppText variant="label" color="textMuted" numberOfLines={1}>
            {c.codigo} · {TIPOS[c.tipo] ?? c.tipo}
          </AppText>
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
          {!abierto && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="git-network-outline" size={14} color="textMuted" />
              <AppText variant="caption" color="textMuted">
                {resumen}
              </AppText>
            </View>
          )}
        </Pressable>

        {raiz && (
          // Flecha: para arriba = plegado; al tocarla apunta para abajo y se despliega todo el árbol.
          <Pressable
            onPress={() => setAbierto((a) => !a)}
            accessibilityRole="button"
            accessibilityState={{ expanded: abierto }}
            accessibilityLabel={abierto ? `Plegar el árbol de ${c.codigo}` : `Desplegar el árbol de ${c.codigo}: ${resumen}`}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: abierto ? colors.primarySoft : colors.surfaceAlt,
              opacity: pressed ? 0.6 : 1,
            })}>
            <Icon name={abierto ? 'chevron-down' : 'chevron-up'} size={20} color={abierto ? 'primary' : 'textSecondary'} />
          </Pressable>
        )}
      </View>

      {abierto && (
        // Línea guía a la izquierda: todo lo que está adentro pertenece a este convenio.
        <View style={{ marginLeft: 2, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.border, gap: spacing.md }}>
          <Grupo icono="ribbon-outline" titulo={`Resoluciones asignadas (${nodo.resoluciones.length})`} vacio="Sin resoluciones asignadas.">
            {nodo.resoluciones.map((d) => (
              <FilaDocumento key={d.id} documento={d} icono="ribbon-outline" onPress={() => onAbrirDocumento(d.id)} />
            ))}
          </Grupo>
          <Grupo icono="folder-open-outline" titulo={`Documentación (${nodo.documentos.length})`} vacio="Sin documentos cargados.">
            {nodo.documentos.map((d) => (
              <FilaDocumento key={d.id} documento={d} icono="document-attach-outline" onPress={() => onAbrirDocumento(d.id)} />
            ))}
          </Grupo>
          <Grupo icono="git-branch-outline" titulo={`Convenios hijos (${nodo.hijos.length})`} vacio="No tiene convenios hijos.">
            {nodo.hijos.map((hijo) => (
              <View key={hijo.convenio.id} style={{ gap: spacing.xs }}>
                <AppText variant="label" color="textMuted">
                  {hijo.tipo_vinculo ? TIPOS_VINCULO_INVERSO[hijo.tipo_vinculo] : 'Convenio hijo'}
                </AppText>
                <Nodo
                  nodo={hijo}
                  marcarCoincidencias={marcarCoincidencias}
                  desplegado={desplegado}
                  onAbrirConvenio={onAbrirConvenio}
                  onAbrirDocumento={onAbrirDocumento}
                />
              </View>
            ))}
          </Grupo>
        </View>
      )}
    </View>
  );
}

function Grupo({ icono, titulo, vacio, children }: { icono: IconName; titulo: string; vacio: string; children: ReactNode[] }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Icon name={icono} size={14} color="textSecondary" />
        <AppText variant="label" color="textSecondary">
          {titulo}
        </AppText>
      </View>
      {children.length ? (
        children
      ) : (
        <AppText variant="caption" color="textMuted" style={{ paddingLeft: spacing.lg }}>
          {vacio}
        </AppText>
      )}
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
