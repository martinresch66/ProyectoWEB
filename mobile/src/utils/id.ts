/**
 * Genera un identificador único con formato UUID v4 (ej: "3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c").
 * Se usa para identificar este celular (no es un secreto: la seguridad la da el token que entrega la API),
 * por eso alcanza con JavaScript y no hace falta un módulo nativo.
 */
export function generarId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const variante = ['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)];
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variante}${hex(3)}-${hex(12)}`;
}
