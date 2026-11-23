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
/** Grosor del lápiz en la pantalla. */
const GROSOR = 2;

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

/**
 * Trazo → camino SVG suavizado: curvas que pasan por el punto medio entre cada par de puntos,
 * así la línea sale redondeada y no en zigzag. Un toque sin mover el dedo se dibuja como un punto.
 * También lo usa FirmaPreview para mostrar la firma guardada.
 */
export function aCamino(trazo: Trazo): string {
  const [primero] = trazo;
  if (!primero) return '';
  if (trazo.length === 1) return `M ${primero[0]} ${primero[1]} l 0.1 0`;
  if (trazo.length === 2) return `M ${primero[0]} ${primero[1]} L ${trazo[1][0]} ${trazo[1][1]}`;
  let camino = `M ${primero[0]} ${primero[1]}`;
  for (let i = 1; i < trazo.length - 1; i++) {
    const [x, y] = trazo[i];
    const [xs, ys] = trazo[i + 1];
    camino += ` Q ${x} ${y} ${(x + xs) / 2} ${(y + ys) / 2}`;
  }
  const ultimo = trazo[trazo.length - 1];
  return `${camino} L ${ultimo[0]} ${ultimo[1]}`;
}

/**
 * Molécula: recuadro para firmar con el dedo (firma manuscrita).
 * Guarda cada trazo como una lista de puntos [x, y]; la API los dibuja en el PDF.
 * Fondo blanco y tinta azul, como en el papel, también en modo oscuro.
 */
export function SignaturePad({ value, onChange, style = { height: 200 }, disabled = false }: SignaturePadProps) {
  const { colors, radius } = useAppTheme();

  const { panHandlers, fijarTamano } = useMemo(() => {
    // Datos del gesto en curso: no se dibujan, por eso no son estado de React.
    /** Tamaño real del recuadro (para saber si el dedo salió). */
    const tamano = { ancho: 0, alto: 0 };
    /** Esquina superior izquierda del recuadro en la pantalla, tomada al apoyar el dedo. */
    const origen = { x: 0, y: 0 };
    /** true si el dedo salió del recuadro: al volver a entrar empieza un trazo nuevo (no una raya desde el borde). */
    const gesto = { fuera: false };

    /**
     * Posición del dedo relativa al recuadro. Se calcula con pageX/pageY (relativas a la pantalla) y el origen
     * tomado al empezar: locationX/locationY no sirven en Android porque, cerca del borde, pasan a medirse
     * respecto de otra vista y la línea "salta" al otro lado.
     */
    const leerPunto = (e: GestureResponderEvent) => ({
      x: e.nativeEvent.pageX - origen.x,
      y: e.nativeEvent.pageY - origen.y,
    });
    const adentro = ({ x, y }: { x: number; y: number }) =>
      x >= 0 && y >= 0 && x <= tamano.ancho && y <= tamano.alto;
    const redondear = ({ x, y }: { x: number; y: number }): Punto => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    // Con dos dedos (o la palma apoyada) los puntos se mezclan: solo se dibuja con un dedo.
    const unSoloDedo = (e: GestureResponderEvent) => (e.nativeEvent.touches?.length ?? 1) <= 1;

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onStartShouldSetPanResponderCapture: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponderCapture: () => !disabled,
      // Mientras se firma, ningún otro gesto (scroll, volver atrás) se queda con el dedo.
      onPanResponderTerminationRequest: () => false,
      // Se apoya el dedo: empieza un trazo nuevo.
      onPanResponderGrant: (e) => {
        // Al apoyar, el toque es sobre el recuadro, así que locationX/Y sí son confiables para ubicar su origen.
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        origen.x = pageX - locationX;
        origen.y = pageY - locationY;
        gesto.fuera = false;
        const punto = redondear({ x: locationX, y: locationY });
        onChange((f) => ({ ...f, trazos: [...f.trazos, [punto]] }));
      },
      // Se mueve el dedo: se agrega el punto al último trazo.
      onPanResponderMove: (e) => {
        if (!unSoloDedo(e)) return;
        const p = leerPunto(e);
        if (!adentro(p)) {
          gesto.fuera = true;
          return;
        }
        const nuevo = redondear(p);
        if (gesto.fuera) {
          gesto.fuera = false;
          onChange((f) => ({ ...f, trazos: [...f.trazos, [nuevo]] }));
          return;
        }
        onChange((f) => {
          const actual = f.trazos[f.trazos.length - 1];
          if (!actual) return f;
          const ultimo = actual[actual.length - 1];
          if (Math.hypot(nuevo[0] - ultimo[0], nuevo[1] - ultimo[1]) < PASO_MINIMO) return f;
          return { ...f, trazos: [...f.trazos.slice(0, -1), [...actual, nuevo]] };
        });
      },
    });

    return {
      panHandlers: responder.panHandlers,
      fijarTamano: (ancho: number, alto: number) => {
        tamano.ancho = ancho;
        tamano.alto = alto;
      },
    };
  }, [onChange, disabled]);

  const vacio = value.trazos.length === 0;
  const baseY = value.alto - 40; // línea de referencia para apoyar la firma

  return (
    <View
      accessible
      accessibilityLabel="Recuadro para firmar con el dedo"
      onLayout={(e) => {
        const { width, height: alto } = e.nativeEvent.layout;
        fijarTamano(width, alto);
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
      {...panHandlers}>
      {/* pointerEvents="none": el dedo siempre lo recibe el recuadro, así las coordenadas son las del recuadro. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          {value.ancho > 0 && value.alto > 80 && <Line x1={24} y1={baseY} x2={value.ancho - 24} y2={baseY} stroke="#CBD5E1" strokeWidth={1} />}
          {value.trazos.map((trazo, i) => (
            <Path
              key={i}
              d={aCamino(trazo)}
              stroke={TINTA}
              strokeWidth={GROSOR}
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