import { authService } from '../services/auth.service.js';

export const authController = {
  // Contrato (§3)
  login(req, res) {
    res.json(authService.login(req.body ?? {}));
  },
  me(req, res) {
    res.json(authService.me(req.user.id));
  },
  logout(req, res) {
    authService.logout(req.token, req.body ?? {});
    res.status(204).end();
  },

  // Solo app móvil
  loginMovil(req, res) {
    res.json(authService.loginMovil(req.body ?? {}));
  },
  enviarCodigo(req, res) {
    res.json(authService.enviarCodigo(req.body ?? {}));
  },
  verificarCodigo(req, res) {
    res.json(authService.verificarCodigo(req.body ?? {}));
  },
  refrescar(req, res) {
    res.json(authService.refrescar(req.body ?? {}));
  },
  activarHuella(req, res) {
    res.json(authService.activarHuella(req.user.id, req.body ?? {}));
  },
  loginConHuella(req, res) {
    res.json(authService.loginConHuella(req.body ?? {}));
  },
  desactivarHuella(req, res) {
    authService.desactivarHuella(req.user.id, req.body ?? {});
    res.status(204).end();
  },
};
