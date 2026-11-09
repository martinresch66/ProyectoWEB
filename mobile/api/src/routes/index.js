import { Router } from 'express';

import { catalogosController } from '../controllers/catalogos.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authRouter } from './auth.routes.js';
import { conveniosRouter } from './convenios.routes.js';

/**
 * Todas las rutas, bajo /api. Son las mismas de web/CONTRATO-API.md, para que la app
 * pueda hablar con esta API simulada o con el backend de Laravel cambiando solo la URL.
 */
export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);

// Protegidas: requieren "Authorization: Bearer <token>"
apiRouter.use('/agreements', requireAuth, conveniosRouter);
apiRouter.get('/units', requireAuth, catalogosController.unidades);
apiRouter.get('/alerts', requireAuth, catalogosController.alertas);
apiRouter.patch('/alerts/:id', requireAuth, catalogosController.marcarAlerta);
