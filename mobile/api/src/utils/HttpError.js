/**
 * Error con código HTTP, para cortar una request con un mensaje claro.
 * `errors` sigue el formato de validación de Laravel: { campo: ["mensaje"] } (§2 del contrato).
 */
export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    if (errors) this.errors = errors;
  }
}
