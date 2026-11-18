import { conveniosService } from '../services/convenios.service.js';

/**
 * Controlador: traduce la request HTTP (query, params, usuario) a llamadas al servicio.
 * Express 5 pasa los errores al errorHandler automáticamente.
 */
export const conveniosController = {
  listar(req, res) {
    res.json(conveniosService.listar(req.user, req.query));
  },

  obtener(req, res) {
    res.json(conveniosService.obtener(req.user, req.params.id));
  },
};
