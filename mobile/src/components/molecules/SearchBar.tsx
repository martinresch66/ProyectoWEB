import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { Icon, IconButton } from '../atoms';

export interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  /** Vacía el campo después de buscar (útil en el header, que lleva a otra pantalla). */
  clearOnSubmit?: boolean;
  onSubmit: (query: string) => void;
}

/** Molécula: ícono de lupa + campo + botón de limpiar. */
export function SearchBar({
  placeholder = 'Buscar convenios…',
  initialValue = '',
  clearOnSubmit = false,
  onSubmit,
}: SearchBarProps) {
  const { colors, typography, radius, spacing } = useAppTheme();
  const [value, setValue] = useState(initialValue);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.pill,
        paddingLeft: spacing.md,
        minHeight: 44,
      }}>
      <Icon name="search" size={18} color="textMuted" />
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={() => {
          onSubmit(value.trim());
          if (clearOnSubmit) setValue('');
        }}
        accessibilityLabel="Buscar convenios"
        style={[typography.body, { flex: 1, color: colors.text, paddingHorizontal: spacing.sm, paddingVertical: 8 }]}
      />
      {value.length > 0 && (
        <IconButton icon="close-circle" label="Borrar búsqueda" color="textMuted" size={18} onPress={() => setValue('')} />
      )}
    </View>
  );
}
