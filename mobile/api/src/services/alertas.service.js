import { alertasRepository } from '../repositories/alertas.repository.js';
import { HttpError } from '../utils/HttpError.js';

/** Notificaciones del usuario (§8 /alerts). */
export const alertasService = {
  listar(usuario) {
    return alertasRepository.findByUsuario(usuario.id).map((a) => ({ convenio_id: null, ...a }));
  },

  marcarLeida(usuario, id, { leida = true } = {}) {
    const alerta = alertasRepository.findById(id);
    if (!alerta || alerta.usuario_id !== usuario.id) throw new HttpError(404, 'No encontramos este aviso.');
    alerta.leida = leida ? 1 : 0;
    return { convenio_id: null, ...alerta };
  },
};
