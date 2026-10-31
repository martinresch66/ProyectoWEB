// Configuración de la conexión con el backend (variables de .env.local).

// URL base de la API de Laravel, por ejemplo http://localhost:8000/api
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");

// true = la web usa datos simulados (sacados de database/seeds.sql) y no necesita backend.
// Ponelo en false cuando la API de Laravel esté andando.
export const USAR_SIMULADO = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Cantidad de convenios por página en los listados.
export const POR_PAGINA = 10;
