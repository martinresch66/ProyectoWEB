import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { FirmaDibujada, Punto, Trazo } from '@/models';
import { useAppTheme } from '@/theme';

import { AppText } from '../atoms';

/** Tinta azul oscura: el mismo color con el que la API estampa la firma en el PDF. */
const TINTA = '#14296F';
/** Distancia mínima (en píxeles) entre dos puntos guardados: menos datos, mismo dibujo. */
const PASO_MINIMO = 1.5;

export const FIRMA_VACIA: FirmaDibujada = { ancho: 0, alto: 0, trazos: [] };

/** Cantidad de puntos dibujados (sirve para saber si "firmó algo"). */
export const puntosDeFirma = (firma: FirmaDibujada) => firma.trazos.reduce((total, t) => total + t.length, 0);

export interface SignaturePadProps {
  value: FirmaDibujada;
  /** El setter de un useState: el recuadro va agregando los puntos mientras se dibuja. */
  onChange: Dispatch<SetStateAction<FirmaDibujada>>;
  /** Tamaño del recuadro. Por defecto, 200 de alto; ej: { flexGrow: 1 } para que ocupe el lugar libre. */
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/** Trazo → camino SVG ("M x y L x y …"). Un toque sin mover el dedo se dibuja como un punto. */
export function aCamino([primero, ...resto]: Trazo): string {
  if (!primero) return '';
  if (!resto.length) return `M ${primero[0]} ${primero[1]} l 0.1 0`;
  return `M ${primero[0]} ${primero[1]} ${resto.map(([x, y]) => `L ${x} ${y}`).join(' ')}`;
}

/**
 * Molécula: recuadro para firmar con el dedo (firma manuscrita).
 * Guarda cada trazo como una lista de puntos [x, y]; la API los dibuja en el PDF.
 * Fondo blanco y tinta azul, como en el papel, también en modo oscuro.
 */
export function SignaturePad({ value, onChange, style = { height: 200 }, disabled = false }: SignaturePadProps) {
  const { colors, radius } = useAppTheme();

  const responder = useMemo(() => {
    const leerPunto = (e: GestureResponderEvent) => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    const dentro = ({ x, y }: { x: number; y: number }, f: FirmaDibujada): Punto => [
      Math.round(Math.min(Math.max(x, 0), f.ancho) * 10) / 10,
      Math.round(Math.min(Math.max(y, 0), f.alto) * 10) / 10,
    ];

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      // Mientras se firma, ningún otro gesto (scroll, volver atrás) se queda con el dedo.
      onPanResponderTerminationRequest: () => false,
      // Se apoya el dedo: empieza un trazo nuevo.
      onPanResponderGrant: (e) => {
        const p = leerPunto(e);
        onChange((f) => ({ ...f, trazos: [...f.trazos, [dentro(p, f)]] }));
      },
      // Se mueve el dedo: se agrega el punto al último trazo.
      onPanResponderMove: (e) => {
        const p = leerPunto(e);
        onChange((f) => {
          const actual = f.trazos[f.trazos.length - 1];
          if (!actual) return f;
          const nuevo = dentro(p, f);
          const ultimo = actual[actual.length - 1];
          if (Math.hypot(nuevo[0] - ultimo[0], nuevo[1] - ultimo[1]) < PASO_MINIMO) return f;
          return { ...f, trazos: [...f.trazos.slice(0, -1), [...actual, nuevo]] };
        });
      },
    });
  }, [onChange, disabled]);

  const vacio = value.trazos.length === 0;
  const baseY = value.alto - 40; // línea de referencia para apoyar la firma

  return (
    <View
      accessible
      accessibilityLabel="Recuadro para firmar con el dedo"
      onLayout={(e) => {
        const { width, height: alto } = e.nativeEvent.layout;
        // El tamaño se toma mientras está vacío: si después el recuadro cambia (aparece un aviso), la firma no se deforma.
        onChange((f) => (f.trazos.length ? f : { ...f, ancho: Math.round(width), alto: Math.round(alto) }));
      }}
      style={[
        {
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.border,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...responder.panHandlers}>
      {/* pointerEvents="none": el dedo siempre lo recibe el recuadro, así las coordenadas son las del recuadro. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          {value.ancho > 0 && value.alto > 80 && <Line x1={24} y1={baseY} x2={value.ancho - 24} y2={baseY} stroke="#CBD5E1" strokeWidth={1} />}
          {value.trazos.map((trazo, i) => (
            <Path
              key={i}
              d={aCamino(trazo)}
              stroke={TINTA}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
      {vacio && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <AppText variant="caption" style={{ color: '#6B7280' }}>
            Firmá acá con el dedo
          </AppText>
        </View>
      )}
    </View>
  );
}