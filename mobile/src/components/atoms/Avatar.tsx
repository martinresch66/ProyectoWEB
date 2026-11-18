import { Image } from 'expo-image';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AppText } from './AppText';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Átomo: foto de perfil en miniatura. Si no hay foto, muestra las iniciales. */
export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const { colors } = useAppTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={shape} contentFit="cover" accessibilityLabel={`Foto de ${name}`} />;
  }

  return (
    <View
      accessibilityLabel={`Avatar de ${name}`}
      style={[shape, { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
      <AppText variant="bodyStrong" color="primary" style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
        {initials(name)}
      </AppText>
    </View>
  );
}
