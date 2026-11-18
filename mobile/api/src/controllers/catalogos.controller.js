import { unidadesRepository } from '../repositories/unidades.repository.js';
import { alertasService } from '../services/alertas.service.js';

export const catalogosController = {
  /** GET /units */
  unidades(req, res) {
    res.json(unidadesRepository.findAll());
  },

  /** GET /alerts */
  alertas(req, res) {
    res.json(alertasService.listar(req.user));
  },

  /** PATCH /alerts/{id} con { "leida": true } */
  marcarAlerta(req, res) {
    res.json(alertasService.marcarLeida(req.user, req.params.id, req.body ?? {}));
  },
};
