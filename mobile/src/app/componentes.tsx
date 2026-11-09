import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Avatar, Badge, Button, Card, IconButton, Input } from '@/components/atoms';
import {
  ConvenioCard,
  EmptyState,
  EstadoBadge,
  FormField,
  ListItem,
  SearchBar,
  SectionHeader,
  SegmentedControl,
  VigenciaBadge,
} from '@/components/molecules';
import { ConvenioList } from '@/components/organisms';
import { Screen } from '@/components/templates';
import type { Convenio } from '@/models';
import { useAppTheme } from '@/theme';

const ejemplo: Convenio = {
  id: 0,
  codigo: 'CONV-2026-000',
  titulo: 'Convenio de ejemplo para el catálogo de componentes',
  tipo: 'especifico',
  estado: 'firmado',
  unidad_id: 2,
  resumen: 'Ejemplo',
  fecha_inicio: '2026-03-10',
  fecha_fin: '2029-03-10',
  dias_preaviso: 30,
  version: 1,
  creado_por: 1,
  unidad: { id: 2, nombre: 'Facultad de Ingeniería', codigo: 'ING' },
};

function Level({ title, description }: { title: string; description: string }) {
  return (
    <View>
      <AppText variant="title">{title}</AppText>
      <AppText variant="caption" color="textSecondary">
        {description}
      </AppText>
    </View>
  );
}

/**
 * Catálogo de componentes según Atomic Design (átomos → moléculas → organismos → templates → páginas).
 * Sirve para mostrar en la defensa cómo está organizada la UI.
 */
export default function ComponentesScreen() {
  const { spacing } = useAppTheme();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');

  return (
    <Screen>
      <Level title="Átomos" description="Las piezas mínimas: no se pueden dividir más." />
      <Card style={{ gap: spacing.md }}>
        <AppText variant="display">Display</AppText>
        <AppText variant="title">Título</AppText>
        <AppText variant="subtitle">Subtítulo</AppText>
        <AppText>Texto normal</AppText>
        <AppText variant="caption" color="textSecondary">
          Texto chico
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button title="Primario" />
          <Button title="Secundario" variant="secondary" />
          <Button title="Borde" variant="ghost" />
          <Button title="Peligro" variant="danger" icon="trash-outline" />
          <Button title="Cargando" loading />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
          <Badge label="Primario" tone="primary" />
          <Badge label="Éxito" tone="success" />
          <Badge label="Aviso" tone="warning" />
          <Badge label="Error" tone="danger" />
          <Avatar name="Tomás Pérez" />
          <IconButton icon="share-social-outline" label="Compartir" color="primary" />
        </View>
        <Input placeholder="Campo de texto" />
      </Card>

      <Level title="Moléculas" description="Combinan átomos para formar algo con una función concreta." />
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <EstadoBadge estado="borrador" />
          <EstadoBadge estado="revision" />
          <EstadoBadge estado="aprobado" />
          <EstadoBadge estado="firmado" />
          <EstadoBadge estado="rescindido" />
          <EstadoBadge estado="archivado" />
          <VigenciaBadge convenio={ejemplo} />
          <VigenciaBadge convenio={{ ...ejemplo, fecha_fin: '2025-01-01' }} />
        </View>
        <FormField label="Email" placeholder="usuario@unlpam.edu.ar" helper="Ejemplo de campo con etiqueta" />
        <FormField label="Contraseña" placeholder="••••••" error="Ejemplo de mensaje de error" secureTextEntry />
        <SearchBar onSubmit={() => {}} />
        <SegmentedControl
          accessibilityLabel="Ejemplo"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'a', label: 'Opción A' },
            { value: 'b', label: 'Opción B' },
            { value: 'c', label: 'Opción C' },
          ]}
        />
        <SectionHeader title="Encabezado de sección" actionLabel="Ver todos" onAction={() => {}} />
        <ListItem icon="settings-outline" title="Fila de menú" subtitle="Con subtítulo" onPress={() => {}} />
        <ConvenioCard convenio={ejemplo} />
        <EmptyState icon="file-tray-outline" title="Estado vacío" message="Se usa cuando no hay datos." />
      </Card>

      <Level
        title="Organismos"
        description="Secciones completas de la interfaz, formadas por moléculas (ej: el header con buscador, listado de convenios)."
      />
      <ConvenioList convenios={[ejemplo, { ...ejemplo, id: -1, estado: 'aprobado', tipo: 'marco' }]} />

      <Level
        title="Templates y páginas"
        description="Screen es el template que da la estructura (fondo, márgenes, scroll). Cada pantalla de src/app es una página."
      />
    </Screen>
  );
}
