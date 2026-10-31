// Paletas de color de la app, en versión clara y oscura.
//
// La versión clara replica los colores de Tailwind que usa el web
// (web/components/ui/basicos.js y web/app/globals.css), para que ambos clientes se vean iguales.
// La versión oscura no existe en el web: se armó con la misma familia de colores,
// cuidando que el texto mantenga un contraste mínimo de 4.5:1 (WCAG 2.1 AA).
//
// Las claves de `estados` y `vigencia` son las mismas que usa src/domain/dominio.js.

export const coloresClaro = {
  // Fondos y superficies
  fondo: "#f8fafc", // slate-50: fondo general de las pantallas
  superficie: "#ffffff", // tarjetas, formularios, menús
  superficieSuave: "#f9fafb", // gray-50: filas alternas, botón secundario presionado
  borde: "#e5e7eb", // gray-200
  bordeFuerte: "#d1d5db", // gray-300: bordes de campos y botón secundario

  // Texto
  texto: "#101828",
  textoSecundario: "#4b5563", // gray-600: descripciones, datos secundarios
  textoTenue: "#6b7280", // gray-500: textos de ayuda

  // Color principal (azul del web)
  primario: "#1d4ed8", // blue-700: fondo de botones principales
  primarioPresionado: "#1e40af", // blue-800
  primarioTexto: "#1d4ed8", // enlaces y textos en azul
  primarioSuave: "#eff6ff", // blue-50: elemento activo del menú
  textoSobrePrimario: "#ffffff",

  // Acciones destructivas (rescindir, eliminar)
  peligro: "#b91c1c", // red-700
  peligroPresionado: "#991b1b", // red-800
  peligroTexto: "#b91c1c", // mensajes de error y bordes de campos con error
  textoSobrePeligro: "#ffffff",

  // Controles deshabilitados
  deshabilitadoFondo: "#e5e7eb",
  deshabilitadoTexto: "#4b5563",

  // Foco visible (WCAG 2.4.7)
  foco: "#1d4ed8",

  // Avisos (componente Nota del web)
  notas: {
    info: { fondo: "#eff6ff", borde: "#bfdbfe", texto: "#1e3a8a" },
    alerta: { fondo: "#fffbeb", borde: "#fcd34d", texto: "#78350f" },
    error: { fondo: "#fef2f2", borde: "#fca5a5", texto: "#7f1d1d" },
    exito: { fondo: "#f0fdf4", borde: "#86efac", texto: "#14532d" },
  },

  // Insignias de estado del convenio
  estados: {
    borrador: { fondo: "#f3f4f6", texto: "#374151" },
    revision: { fondo: "#f5f3ff", texto: "#5b21b6" },
    aprobado: { fondo: "#eff6ff", texto: "#1e40af" },
    firmado: { fondo: "#dcfce7", texto: "#166534" },
    rescindido: { fondo: "#fee2e2", texto: "#991b1b" },
    archivado: { fondo: "#374151", texto: "#ffffff" },
  },

  // Insignias de vigencia (bordeadas, como en el web)
  vigencia: {
    vigente: { fondo: "transparent", borde: "#15803d", texto: "#166534" },
    proximo: { fondo: "#fffbeb", borde: "#fbbf24", texto: "#78350f" },
    vencido: { fondo: "transparent", borde: "#b91c1c", texto: "#991b1b" },
    sin_vencimiento: { fondo: "transparent", borde: "#9ca3af", texto: "#374151" },
    aun_no_vigente: { fondo: "transparent", borde: "#9ca3af", texto: "#374151" },
  },
};

export const coloresOscuro = {
  // Fondos y superficies
  fondo: "#0b1120",
  superficie: "#111827", // gray-900
  superficieSuave: "#1f2937", // gray-800
  borde: "#374151", // gray-700
  bordeFuerte: "#4b5563", // gray-600

  // Texto
  texto: "#f3f4f6", // gray-100
  textoSecundario: "#d1d5db", // gray-300
  textoTenue: "#9ca3af", // gray-400

  // Color principal: un azul un poco más claro para que destaque sobre fondo oscuro
  primario: "#2563eb", // blue-600 (texto blanco encima: contraste 5.2:1)
  primarioPresionado: "#1d4ed8", // blue-700
  primarioTexto: "#93c5fd", // blue-300: enlaces legibles sobre fondo oscuro
  primarioSuave: "#172554", // blue-950
  textoSobrePrimario: "#ffffff",

  // Acciones destructivas
  peligro: "#dc2626", // red-600 (texto blanco encima: contraste 4.8:1)
  peligroPresionado: "#b91c1c",
  peligroTexto: "#fca5a5", // red-300: el rojo oscuro no se lee sobre fondo oscuro
  textoSobrePeligro: "#ffffff",

  // Controles deshabilitados
  deshabilitadoFondo: "#374151",
  deshabilitadoTexto: "#9ca3af",

  // Foco visible
  foco: "#93c5fd",

  // Avisos
  notas: {
    info: { fondo: "#172554", borde: "#1e40af", texto: "#bfdbfe" },
    alerta: { fondo: "#451a03", borde: "#92400e", texto: "#fde68a" },
    error: { fondo: "#450a0a", borde: "#991b1b", texto: "#fecaca" },
    exito: { fondo: "#052e16", borde: "#166534", texto: "#bbf7d0" },
  },

  // Insignias de estado del convenio
  estados: {
    borrador: { fondo: "#374151", texto: "#f3f4f6" },
    revision: { fondo: "#2e1065", texto: "#ddd6fe" },
    aprobado: { fondo: "#172554", texto: "#bfdbfe" },
    firmado: { fondo: "#052e16", texto: "#bbf7d0" },
    rescindido: { fondo: "#450a0a", texto: "#fecaca" },
    archivado: { fondo: "#e5e7eb", texto: "#111827" }, // invertido, igual que en el modo claro resalta
  },

  // Insignias de vigencia
  vigencia: {
    vigente: { fondo: "transparent", borde: "#22c55e", texto: "#86efac" },
    proximo: { fondo: "#451a03", borde: "#fbbf24", texto: "#fde68a" },
    vencido: { fondo: "transparent", borde: "#ef4444", texto: "#fca5a5" },
    sin_vencimiento: { fondo: "transparent", borde: "#6b7280", texto: "#d1d5db" },
    aun_no_vigente: { fondo: "transparent", borde: "#6b7280", texto: "#d1d5db" },
  },
};
