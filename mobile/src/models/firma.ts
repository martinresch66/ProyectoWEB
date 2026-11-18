import type { Rol } from './usuario';

/** Punto [x, y] en píxeles, dentro del recuadro donde se firma. */
export type Punto = [number, number];

/** Un trazo: desde que se apoya el dedo hasta que se levanta. */
export type Trazo = Punto[];

/** Firma manuscrita: lo que se dibujó en un recuadro de ancho x alto (en píxeles). */
export interface FirmaDibujada {
  ancho: number;
  alto: number;
  trazos: Trazo[];
}

/** Dónde se firmó. precision_m: radio de error del GPS, en metros. */
export interface Ubicacion {
  latitud: number;
  longitud: number;
  precision_m: number | null;
}

/** Cómo se confirmó la identidad en el celular antes de firmar. */
export type MetodoVerificacion = 'huella' | 'rostro' | 'biometria';

/** Firma registrada en la API (GET y POST /mobile/convenios/:id/firma). */
export interface FirmaRegistrada {
  fecha: string; // ISO, con hora
  firmante: { id: number; nombre: string; rol: Rol };
  latitud: number;
  longitud: number;
  precision_m: number | null;
  verificacion: MetodoVerificacion;
  documento_id: number | null;
  hash_sha256: string | null;
}