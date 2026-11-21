import type { FirmaDibujada, Punto, Trazo } from '@/models';

/**
 * Acomoda una firma guardada dentro de un recuadro de ancho x alto: la escala para que entre
 * (sin deformarla) y la centra. Sirve para "Usar mi firma registrada" al firmar un convenio.
 */
export function ajustarFirma({ trazos }: FirmaDibujada, ancho: number, alto: number, margen = 16): Trazo[] {
  const puntos = trazos.flat();
  if (!puntos.length || ancho <= 2 * margen || alto <= 2 * margen) return [];
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const anchoFirma = Math.max(Math.max(...xs) - minX, 1);
  const altoFirma = Math.max(Math.max(...ys) - minY, 1);
  const escala = Math.min((ancho - 2 * margen) / anchoFirma, (alto - 2 * margen) / altoFirma);
  const dx = (ancho - anchoFirma * escala) / 2;
  const dy = (alto - altoFirma * escala) / 2;
  const redondear = (v: number) => Math.round(v * 10) / 10;
  return trazos.map((t) => t.map(([x, y]): Punto => [redondear((x - minX) * escala + dx), redondear((y - minY) * escala + dy)]));
}