import { Router } from 'express';

import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const authRouter = Router();

// ── Contrato con la web (CONTRATO-API.md §3) ──
authRouter.post('/login', authController.login);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/logout', requireAuth, authController.logout);

// ── Solo app móvil (no están en el contrato: ver mobile/README.md) ──
// Login en dos pasos: contraseña → código MFA por email / SMS / push → sesión con refresh token
authRouter.post('/mobile/login', authController.loginMovil);
authRouter.post('/mobile/mfa/send', authController.enviarCodigo);
authRouter.post('/mobile/mfa/verify', authController.verificarCodigo);
// Renovar el token sin volver a pedir la contraseña
authRouter.post('/mobile/refresh', authController.refrescar);
// Ingreso con huella
authRouter.post('/mobile/biometric/enable', requireAuth, authController.activarHuella);
authRouter.post('/mobile/biometric/login', authController.loginConHuella);
authRouter.post('/mobile/biometric/disable', requireAuth, authController.desactivarHuella);
