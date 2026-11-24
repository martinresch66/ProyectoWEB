import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, Icon } from '@/components/atoms';
import { EmptyState, SelectorFiltro, SearchBar, type OpcionFiltro } from '@/components/molecules';
import { ArbolConvenios } from '@/components/organisms';
import { Screen } from '@/components/templates';
import { ESTADOS, TIPOS } from '@/domain/dominio';
import { useAsync } from '@/hooks/useAsync';
import type { EstadoConvenio, FiltrosBusqueda, TipoConvenio } from '@/models';
import { busquedaService } from '@/services/busqueda.service';
import { useAppTheme } from '@/theme';

type Filtros = Omit<FiltrosBusqueda, 'q'>;

const SIN_FILTROS: Filtros = {};

/** Cada filtro ocupa media fila; si queda uno solo en la última fila, se estira a lo ancho. */
const CELDA = { flexBasis: '45%', flexGrow: 1 } as const;

/** Años para el filtro: del próximo hacia atrás hasta 2020 (hay convenios que empiezan el año que viene). */
const ANIOS: OpcionFiltro<number>[] = Array.from({ length: new Date().getFullYear() + 2 - 2020 }, (_, i) => {
  const anio = new Date().getFullYear() + 1 - i;
  return { valor: anio, etiqueta: String(anio) };
});

const opciones = <T extends string>(textos: Record<T, string>): OpcionFiltro<T>[] =>
  (Object.keys(textos) as T[]).map((valor) => ({ valor, etiqueta: textos[valor] }));

const OPCIONES_TIPO = opciones<TipoConvenio>(TIPOS);
const OPCIONES_ESTADO = opciones<EstadoConvenio>(ESTADOS);
const OPCIONES_VIGENCIA: OpcionFiltro<NonNullable<Filtros['vigencia']>>[] = [
  { valor: 'vigente', etiqueta: 'Vigente' },
  { valor: 'proximo', etiqueta: 'Por vencer' },
  { valor: 'vencido', etiqueta: 'Vencido' },
  { valor: 'sin_vencimiento', etiqueta: 'Sin vencimiento' },
];

/**
 * Buscador avanzado (Buscador de Convenios del T2).
 * Texto (código, título o resumen) + filtros por año, tipo, estado, unidad académica y vigencia.
 * Los resultados salen como árbol: convenio padre → convenios hijos, con sus resoluciones y documentación.
 * El texto llega también desde el buscador del encabezado de las otras pestañas (parámetro q).
 */
export default function BuscarScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const query = q ?? '';

  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [verFiltros, setVerFiltros] = useState(true);
  const cantidadFiltros = Object.values(filtros).filter((v) => v !== undefined).length;
  const hayBusqueda = query.length > 0 || cantidadFiltros > 0;

  const unidades = useAsync(() => busquedaService.unidades(), []);
  const resultado = useAsync(
    () => (hayBusqueda ? busquedaService.buscar({ q: query || undefined, ...filtros }) : Promise.resolve(null)),
    [query, filtros.anio, filtros.tipo, filtros.estado, filtros.unidad_id, filtros.vigencia],
  );

  const cambiar = <K extends keyof Filtros>(clave: K) => (valor: Filtros[K]) => setFiltros((f) => ({ ...f, [clave]: valor }));

  const abrirConvenio = (id: number) => router.push({ pathname: '/convenio/[id]', params: { id: String(id) } });
  const abrirDocumento = (id: number) => router.push({ pathname: '/archivo/[id]', params: { id: String(id) } });

  return (
    <Screen refreshing={resultado.loading && !!resultado.data} onRefresh={hayBusqueda ? resultado.reload : undefined}>
      <SearchBar
        key={query}
        initialValue={query}
        placeholder="Código, título o resumen…"
        onSubmit={(text) => router.setParams({ q: text || undefined })}
      />

      <Card style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            onPress={() => setVerFiltros((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: verFiltros }}
            accessibilityLabel={`Filtros${cantidadFiltros ? `, ${cantidadFiltros} activos` : ''}`}
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36, opacity: pressed ? 0.7 : 1 })}>
            <Icon name="options-outline" size={20} color="primary" />
            <AppText variant="bodyStrong">Filtros</AppText>
            {cantidadFiltros > 0 && <Badge label={String(cantidadFiltros)} tone="primary" />}
            <View style={{ flex: 1 }} />
            <Icon name={verFiltros ? 'chevron-up' : 'chevron-down'} size={18} color="textMuted" />
          </Pressable>
          {cantidadFiltros > 0 && <Button title="Limpiar" variant="ghost" onPress={() => setFiltros(SIN_FILTROS)} />}
        </View>

        {verFiltros && (
          // Grilla de dos columnas: todos los filtros a la vista, sin deslizar hacia los costados.
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <SelectorFiltro titulo="Año" opciones={ANIOS} style={CELDA} valor={filtros.anio} onChange={cambiar('anio')} />
            <SelectorFiltro titulo="Tipo" opciones={OPCIONES_TIPO} style={CELDA} valor={filtros.tipo} onChange={cambiar('tipo')} />
            <SelectorFiltro titulo="Estado" opciones={OPCIONES_ESTADO} style={CELDA} valor={filtros.estado} onChange={cambiar('estado')} />
            {(unidades.data?.length ?? 0) > 1 && (
              <SelectorFiltro
                titulo="Unidad"
                opciones={(unidades.data ?? []).map((u) => ({ valor: u.id, etiqueta: u.nombre, corta: u.codigo ?? undefined }))}
                style={CELDA}
                valor={filtros.unidad_id}
                onChange={cambiar('unidad_id')}
              />
            )}
            <SelectorFiltro titulo="Vigencia" opciones={OPCIONES_VIGENCIA} style={CELDA} valor={filtros.vigencia} onChange={cambiar('vigencia')} />
          </View>
        )}
      </Card>

      {!hayBusqueda ? (
        <EmptyState
          icon="search-outline"
          title="Buscá un convenio"
          message="Escribí parte del código (ej: CONV-2026), del título o del resumen, o elegí un filtro. Los resultados muestran cada convenio con sus hijos, resoluciones y documentos."
        />
      ) : resultado.loading && !resultado.data ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xxl }} />
      ) : resultado.error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos buscar"
          message={resultado.error}
          action={<Button title="Reintentar" icon="refresh" variant="secondary" onPress={resultado.reload} />}
        />
      ) : !resultado.data?.total ? (
        <EmptyState
          icon="document-text-outline"
          title="Sin resultados"
          message={cantidadFiltros ? 'Probá con otras palabras o sacá algún filtro.' : 'Probá con otras palabras.'}
          action={cantidadFiltros ? <Button title="Limpiar filtros" variant="secondary" onPress={() => setFiltros(SIN_FILTROS)} /> : undefined}
        />
      ) : (
        <>
          <AppText variant="caption" color="textSecondary">
            {resultado.data.total} {resultado.data.total === 1 ? 'convenio coincide' : 'convenios coinciden'}
            {query ? ` con “${query}”` : ''}. Se muestran con su convenio padre y sus hijos.
          </AppText>
          <ArbolConvenios arboles={resultado.data.arboles} onAbrirConvenio={abrirConvenio} onAbrirDocumento={abrirDocumento} />
        </>
      )}
    </Screen>
  );
}
