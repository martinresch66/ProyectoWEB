import "./globals.css";
import Proveedores from "@/components/Proveedores";

export const metadata = {
  title: {
    default: "Convenios UNLPam",
    template: "%s · Convenios UNLPam",
  },
  description: "Sistema interno de gestión de convenios de la Universidad Nacional de La Pampa.",
  robots: { index: false, follow: false }, // uso interno: no se indexa
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-gray-900 antialiased">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
