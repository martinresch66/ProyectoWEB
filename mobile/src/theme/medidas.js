// Espaciados, bordes y tipografía de la app.
// Siguen la escala de Tailwind que usa el web (múltiplos de 4 px), para que las proporciones coincidan.

export const espacios = {
  xs: 4, // gap-1
  sm: 8, // gap-2
  md: 12, // gap-3
  lg: 16, // p-4
  xl: 20, // p-5 (relleno de las tarjetas del web)
  xxl: 24, // p-6
  xxxl: 32, // p-8
};

export const radios = {
  sm: 6, // rounded-md
  md: 8, // rounded-lg: botones y campos
  lg: 12, // rounded-xl: tarjetas
  completo: 999, // rounded-full: insignias
};

// Altura mínima de cualquier elemento que se pueda tocar (min-h-11 en el web).
// 44 px es el tamaño táctil mínimo recomendado por las pautas de accesibilidad.
export const tamanoTactil = 44;

// Nombres de las variantes de Inter que carga ProveedorTema (paquete @expo-google-fonts/inter).
export const FUENTES = {
  regular: "Inter_400Regular",
  media: "Inter_500Medium",
  seminegrita: "Inter_600SemiBold",
  negrita: "Inter_700Bold",
};

const PESOS = { regular: "400", media: "500", seminegrita: "600", negrita: "700" };

// Estilos de texto. El comentario indica a qué clases del web equivale cada uno.
const ESCALA = {
  titulo: { tamano: 24, alto: 32, peso: "negrita" }, // text-2xl font-bold: título de cada pantalla
  subtitulo: { tamano: 16, alto: 24, peso: "seminegrita" }, // text-base font-semibold: títulos de tarjetas
  cuerpo: { tamano: 16, alto: 24, peso: "regular" }, // texto general
  cuerpoChico: { tamano: 14, alto: 20, peso: "regular" }, // text-sm: descripciones y datos secundarios
  destacado: { tamano: 14, alto: 20, peso: "seminegrita" }, // text-sm font-semibold: códigos, títulos de avisos
  etiqueta: { tamano: 14, alto: 20, peso: "seminegrita" }, // text-sm font-semibold: etiquetas de campos
  boton: { tamano: 14, alto: 20, peso: "seminegrita" }, // text-sm font-semibold: botones
  insignia: { tamano: 12, alto: 16, peso: "seminegrita" }, // text-xs font-semibold: insignias
};

// En Android, con fuentes personalizadas cada grosor es una fuente distinta, así que se elige
// por fontFamily y no por fontWeight. Si Inter no llegara a cargar, se usa la fuente del sistema
// con fontWeight, para que la app nunca quede sin texto.
export function crearTipografia(conInter) {
  return Object.fromEntries(
    Object.entries(ESCALA).map(([nombre, { tamano, alto, peso }]) => [
      nombre,
      conInter
        ? { fontFamily: FUENTES[peso], fontSize: tamano, lineHeight: alto }
        : { fontWeight: PESOS[peso], fontSize: tamano, lineHeight: alto },
    ])
  );
}
