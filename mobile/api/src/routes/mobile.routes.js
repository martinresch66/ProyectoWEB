import express, { Router } from 'express';

import { mobileController } from '../controllers/mobile.controller.js';

/**
 * Rutas que solo usa la app móvil (no están en web/CONTRATO-API.md).
 * Se montan en /api/mobile y todas requieren token (ver routes/index.js).
 */
export const mobileRouter = Router();

mobileRouter.get('/resumen', mobileController.resumen);
mobileRouter.get('/resumen/:indicador', mobileController.indicador);
mobileRouter.get('/convenios/:id/pdf', mobileController.pdfConvenio);
mobileRouter.get('/convenios/:id/firma', mobileController.firma);
mobileRouter.post('/convenios/:id/firma', mobileController.firmar);
mobileRouter.get('/convenios/:id/comentarios', mobileController.comentarios);
mobileRouter.post('/convenios/:id/comentarios', mobileController.comentar);

// El PDF llega "crudo" en el cuerpo (Content-Type: application/pdf), de hasta 20 MB.
mobileRouter.post(
  '/convenios/:id/documentos',
  express.raw({ type: 'application/pdf', limit: '20mb' }),
  mobileController.subirDocumento,
);
mobileRouter.get('/documentos/:id', mobileController.documento);
mobileRouter.get('/documentos/:id/pdf', mobileController.pdfDocumento);