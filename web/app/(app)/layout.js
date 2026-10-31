import Estructura from "@/components/layout/Estructura";

// Todas las pantallas dentro de (app) requieren sesión iniciada.
export default function LayoutInterno({ children }) {
  return <Estructura>{children}</Estructura>;
}
