/** Respuesta para rutas que no existen. */
export function notFound(req, res) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

/**
 * Manejo centralizado de errores. Responde como Laravel (§2 de CONTRATO-API.md):
 * { "message": "..." } y, en los 422, también { "errors": { "campo": ["..."] } }.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // JSON mal formado en el cuerpo
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido.' });
  }
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'Error interno del servidor.' : err.message,
    ...(err.errors && { errors: err.errors }),
  });
}
