/**
 * Detección de comentarios ofensivos (T2: "si el comentario es ofensivo el sistema debe darse cuenta solo").
 *
 * Cómo funciona:
 * 1. Se normaliza el texto: minúsculas, sin tildes y con los números "disfrazados" pasados a letras (b0lud0 → boludo).
 * 2. Se separa en palabras. Las letras sueltas seguidas se juntan ("p u t o" o "p.u.t.o" → "puto").
 * 3. Cada palabra se compara con la lista. Las letras pueden estar repetidas ("boludooo"), pero sin inventar
 *    palabras: "forro" exige las dos erres, así "foro" no se marca.
 * - EXACTAS: tienen que ser la palabra entera ("gil" sí, "Gilberto" no; "culo" sí, "cálculo" no).
 * - RAICES: alcanza con que la palabra empiece así ("bolud" → boludo, boluda, boludez).
 * - PERMITIDAS: palabras comunes que empiezan como una raíz pero no son ofensivas (putrefacto, putativo).
 */

const EXACTAS = [
  'gil', 'gila', 'giles', 'forro', 'forra', 'forros', 'forras', 'culo', 'culos', 'orto', 'trolo', 'trola', 'trolos',
  'concha', 'carajo', 'pija', 'verga', 'cagon', 'cagona', 'cagones', 'chupala', 'chupame', 'chupalo',
  'hdp', 'lpm', 'lpqtp', 'ctm', 'ptm', 'bitch', 'shit', 'asshole',
];

const RAICES = [
  'bolud', 'pelotud', 'idiot', 'imbecil', 'estupid', 'tarad', 'mogolic', 'subnormal', 'mierd', 'put', 'conchud',
  'culiad', 'garch', 'pajer', 'pijud', 'cornud', 'malparid', 'hijueput', 'fuck', 'motherfuck',
];

const PERMITIDAS = ['putrefact', 'putrid', 'putat'];

const DIGITOS = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

/** Minúsculas, sin tildes y con los números "disfrazados" pasados a letras: "B0LUDÓ" → "boludo". */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => DIGITOS[c]);
}

/** Palabras del texto. Las letras sueltas seguidas se juntan: "p u t o" → "puto". */
export function palabras(texto) {
  const sueltas = normalizar(texto).split(/[^a-z]+/).filter(Boolean);
  const resultado = [];
  let letras = '';
  for (const p of [...sueltas, '']) {
    if (p.length === 1) {
      letras += p;
      continue;
    }
    if (letras.length >= 3) resultado.push(letras);
    else if (letras) resultado.push(...letras.split(''));
    letras = '';
    if (p) resultado.push(p);
  }
  return resultado;
}

/** "forro" → /^f+o+r{2,}o+/ : cada letra puede repetirse, pero no puede faltar ninguna. */
function patron(palabra) {
  return (palabra.match(/(.)\1*/g) ?? []).map((grupo) => `${grupo[0]}{${grupo.length},}`).join('');
}

const EXACTAS_RE = EXACTAS.map((p) => new RegExp(`^${patron(p)}$`));
const RAICES_RE = RAICES.map((p) => new RegExp(`^${patron(p)}`));

function esOfensiva(palabra) {
  if (PERMITIDAS.some((p) => palabra.startsWith(p))) return false;
  return EXACTAS_RE.some((re) => re.test(palabra)) || RAICES_RE.some((re) => re.test(palabra));
}

/** Analiza un texto. `palabras` son las que se detectaron (solo para pruebas y registros, no se muestran). */
export function analizarTexto(texto) {
  const encontradas = palabras(texto).filter(esOfensiva);
  return { ofensivo: encontradas.length > 0, palabras: encontradas };
}