import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { FirmaDibujada } from '@/models';
import { useAppTheme } from '@/theme';

import { aCamino } from './SignaturePad';

export interface FirmaPreviewProps {
  firma: FirmaDibujada;
  height?: number;
}

/**
 * Molécula: muestra una firma guardada (sin poder dibujar).
 * El viewBox del SVG encuadra la firma: se ve centrada y sin deformarse, en cualquier tamaño.
 */
export function FirmaPreview({ firma, height = 120 }: FirmaPreviewProps) {
  const { colors, radius } = useAppTheme();
  const puntos = firma.trazos.flat();
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const margen = 12;
  const caja = `${minX - margen} ${minY - margen} ${Math.max(...xs) - minX + 2 * margen} ${Math.max(...ys) - minY + 2 * margen}`;

  return (
    <View
      accessibilityLabel="Tu firma registrada"
      style={{ height, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', padding: 8 }}>
      {puntos.length > 0 && (
        <Svg width="100%" height="100%" viewBox={caja}>
          {firma.trazos.map((trazo, i) => (
            <Path key={i} d={aCamino(trazo)} stroke="#14296F" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      )}
    </View>
  );
}