/** @type {import('next').NextConfig} */
// La web es un cliente que consume la API REST de Laravel (otro servidor),
// así que no usamos Cache Components: todas las pantallas cargan sus datos
// desde el navegador con el token del usuario.
const nextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
