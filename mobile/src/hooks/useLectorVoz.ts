import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SeccionLectura } from '@/models';
import { cargarModulo } from '@/services/nativo';

type SpeechModule = typeof import('expo-speech');

/** La voz se carga recién al usarla y sin romper la app si no está (ver services/nativo.ts). */
function moduloVoz(): SpeechModule | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida a propósito
  return cargarModulo('expo-speech', () => require('expo-speech') as SpeechModule);
}

export type EstadoLector = 'detenido' | 'leyendo' | 'pausado';

/** Velocidades disponibles (1 = normal). */
export const VELOCIDADES = [0.75, 1, 1.25, 1.5] as const;
export type Velocidad = (typeof VELOCIDADES)[number];

/** Preferencia de acento: primero el rioplatense, después el latino y por último el de España. */
const IDIOMAS = ['es-AR', 'es-US', 'es-419', 'es-MX', 'es-ES'];

/** Android lee hasta unos 4000 caracteres por vez: los textos largos se cortan entre oraciones. */
const MAXIMO = 3000;
function trocear(texto: string): string[] {
  if (texto.length <= MAXIMO) return [texto];
  const partes: string[] = [];
  let actual = '';
  for (const oracion of texto.split(/(?<=[.;:])\s+/)) {
    if (actual && actual.length + oracion.length + 1 > MAXIMO) {
      partes.push(actual);
      actual = oracion;
    } else {
      actual = actual ? `${actual} ${oracion}` : oracion;
    }
  }
  if (actual) partes.push(actual);
  return partes;
}

/**
 * Lector en voz alta del convenio, sección por sección, con la voz del celular (sin internet).
 * Al terminar una sección sigue con la próxima. Al cambiar la velocidad, o al pausar y seguir, retoma
 * desde la palabra en la que iba (Android no tiene pausa real: se frena y se vuelve a empezar desde ahí).
 * Se detiene al salir de la pantalla.
 */
export function useLectorVoz(secciones: SeccionLectura[] | null) {
  const [indice, setIndice] = useState(0);
  const [estado, setEstado] = useState<EstadoLector>('detenido');
  const [velocidad, setVelocidadEstado] = useState<Velocidad>(1);
  const [idioma, setIdioma] = useState<{ language: string; voice?: string }>({ language: 'es-ES' });
  // Cada lectura tiene un número: los avisos de una lectura anterior (ya frenada) se ignoran.
  const turno = useRef(0);
  const disponible = moduloVoz() !== null;

  // Se elige una voz en español instalada en el celular (si no, Android podría leer con acento en inglés).
  useEffect(() => {
    const Speech = moduloVoz();
    if (!Speech) return;
    let activo = true;
    Speech.getAvailableVoicesAsync()
      .then((voces) => {
        if (!activo) return;
        for (const codigo of IDIOMAS) {
          const voz = voces.find((v) => v.language?.replace('_', '-').toLowerCase() === codigo.toLowerCase());
          if (voz) return setIdioma({ language: voz.language, voice: voz.identifier });
        }
        const cualquiera = voces.find((v) => v.language?.toLowerCase().startsWith('es'));
        if (cualquiera) setIdioma({ language: cualquiera.language, voice: cualquiera.identifier });
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const frenar = useCallback(() => {
    turno.current += 1;
    void moduloVoz()?.stop();
  }, []);

  // Al salir de la pantalla (o al cerrarla) se deja de leer.
  useFocusEffect(
    useCallback(() => {
      return () => {
        frenar();
        setEstado((e) => (e === 'leyendo' ? 'pausado' : e));
      };
    }, [frenar]),
  );

  /**
   * Dónde va la voz: sección y letra dentro de su texto. La voz avisa cada palabra que va a decir
   * (onBoundary), así al cambiar la velocidad o al pausar se puede seguir desde esa palabra.
   */
  const posicion = useRef({ seccion: 0, letra: 0 });

  /** Inicio de la palabra en la que iba (para no retomar a mitad de una palabra). */
  function letraActual(i: number): number {
    const texto = secciones?.[i]?.voz ?? '';
    if (posicion.current.seccion !== i) return 0;
    const letra = Math.min(posicion.current.letra, texto.length);
    return letra > 0 ? texto.lastIndexOf(' ', letra - 1) + 1 : 0;
  }

  function leer(i: number, rate: number = velocidad, desde = 0) {
    const Speech = moduloVoz();
    const seccion = secciones?.[i];
    if (!Speech || !seccion) return;
    frenar();
    const mio = turno.current;
    setIndice(i);
    setEstado('leyendo');
    posicion.current = { seccion: i, letra: desde };

    // Partes a leer (desde la palabra indicada) y en qué letra de la sección empieza cada una.
    const partes = trocear(seccion.voz.slice(desde));
    const inicios = partes.reduce<number[]>((acc, p, k) => [...acc, k === 0 ? desde : acc[k - 1] + partes[k - 1].length + 1], []);

    const hablar = (k: number) =>
      Speech.speak(partes[k], {
        ...idioma,
        rate,
        onStart: () => {
          if (turno.current === mio) posicion.current = { seccion: i, letra: inicios[k] };
        },
        onBoundary: (ev: { charIndex?: number }) => {
          if (turno.current === mio && typeof ev?.charIndex === 'number') {
            posicion.current = { seccion: i, letra: inicios[k] + ev.charIndex };
          }
        },
        onDone: () => {
          if (turno.current !== mio) return;
          if (k + 1 < partes.length) hablar(k + 1);
          else if (secciones && i + 1 < secciones.length) leer(i + 1, rate);
          else {
            setEstado('detenido');
            setIndice(0);
            posicion.current = { seccion: 0, letra: 0 };
          }
        },
        onError: () => {
          if (turno.current === mio) setEstado('detenido');
        },
      });
    hablar(0);
  }

  return {
    disponible,
    indice,
    estado,
    velocidad,
    /** Empieza, o retoma desde la palabra donde se pausó. */
    reproducir: () => leer(indice, velocidad, estado === 'pausado' ? letraActual(indice) : 0),
    pausar: () => {
      frenar();
      setEstado('pausado');
    },
    /** Salta a una sección y la lee desde el principio. */
    irA: (i: number) => leer(i),
    anterior: () => leer(Math.max(indice - 1, 0)),
    siguiente: () => {
      if (secciones && indice + 1 < secciones.length) leer(indice + 1);
    },
    cambiarVelocidad: (v: Velocidad) => {
      setVelocidadEstado(v);
      // Si está leyendo, sigue con la nueva velocidad desde la palabra en la que iba.
      if (estado === 'leyendo') leer(indice, v, letraActual(indice));
    },
  };
}
