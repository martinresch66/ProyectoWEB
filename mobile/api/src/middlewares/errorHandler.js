/** Respuesta para rutas que no existen. */
export function notFound(req, res) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
/*
*
*
* Esto hace que si MySQL esta apagado muestre el motivo en lugar del error interno
*/ 
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
    // Archivo más grande que el límite (ej: un PDF de más de 20 MB)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El archivo supera el máximo permitido (20 MB).' });
  }
  const status = err.status ?? 500;
  // 503 (servicio no disponible, ej: MySQL apagado) muestra su mensaje; el resto de los 5xx, uno genérico.
  const interno = status >= 500 && status !== 503;
  if (interno) console.error(err);
  res.status(status).json({
    message: interno ? 'Error interno del servidor.' : err.message,
    ...(err.errors && { errors: err.errors }),
  });
}