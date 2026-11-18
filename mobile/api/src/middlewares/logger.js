/** Muestra cada request en la consola: método, ruta, código y duración. */
export function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
}
