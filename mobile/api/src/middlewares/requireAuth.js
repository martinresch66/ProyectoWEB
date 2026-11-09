import { authService } from '../services/auth.service.js';
import { HttpError } from '../utils/HttpError.js';

/**
 * Exige "Authorization: Bearer <token>" (§1 del contrato).
 * Si es válido, deja el usuario (con rol y unidad) en req.user y los datos del token en req.token.
 */
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Falta el token de autenticación.');
  const { usuario, payload } = authService.autenticar(token);
  req.user = usuario;
  req.token = payload;
  next();
}
