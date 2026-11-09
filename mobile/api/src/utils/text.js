/** Normaliza texto para búsquedas: minúsculas y sin acentos ("Ingeniería" → "ingenieria"). */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
