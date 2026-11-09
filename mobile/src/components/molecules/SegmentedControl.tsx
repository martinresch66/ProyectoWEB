import { Pressable, View } from 'react-native';

import { FUENTES, useAppTheme } from '@/theme';

import { AppText, Icon, type IconName } from '../atoms';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Molécula: selector de una opción entre varias (ej: claro / oscuro / sistema). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing } = useAppTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            style={{
              flex: 1,
              minHeight: 40,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: selected ? colors.surface : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}>
            {opt.icon && <Icon name={opt.icon} size={16} color={selected ? 'primary' : 'textSecondary'} />}
            <AppText variant="caption" color={selected ? 'primary' : 'textSecondary'} style={{ fontFamily: FUENTES.semibold }}>
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
