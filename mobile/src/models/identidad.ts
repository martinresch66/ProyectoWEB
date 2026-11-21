import type { FirmaDibujada } from './firma';

/**
 * Lo que la persona registró en "Registrar mi identidad". null = todavía no lo registró.
 * Se guarda solo en el celular (ver identidad.service.ts).
 */
export interface IdentidadRegistrada {
  /** Firma manuscrita guardada (la misma forma que la que se manda al firmar un convenio). */
  firma: (FirmaDibujada & { registrada_en: string }) | null;
  /** Foto del rostro, tomada con la cámara delantera. `foto` es la dirección del archivo en el celular. */
  rostro: { foto: string; registrado_en: string } | null;
  /** Huella verificada en este celular (la huella en sí la guarda el sistema y nunca sale del dispositivo). */
  huella: { tipo: string; registrada_en: string } | null;
}