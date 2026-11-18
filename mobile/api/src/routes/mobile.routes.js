import { Router } from 'express';

import { mobileController } from '../controllers/mobile.controller.js';

/**
 * Rutas que solo usa la app móvil (no están en web/CONTRATO-API.md).
 * Se montan en /api/mobile y todas requieren token (ver routes/index.js).
 */
export const mobileRouter = Router();

mobileRouter.get('/resumen', mobileController.resumen);
mobileRouter.get('/convenios/:id/pdf', mobileController.pdfConvenio);