import { Router } from 'express';

import { env } from '../config/env.js';
import { catalogosController } from '../controllers/catalogos.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { sincronizarDatos } from '../middlewares/sincronizarDatos.js';
import { authRouter } from './auth.routes.js';
import { conveniosRouter } from './convenios.routes.js';
import { mobileRouter } from './mobile.routes.js';

/**
 * Todas las rutas, bajo /api. Son las mismas de web/CONTRATO-API.md, para que la app
 * pueda hablar con esta API simulada o con el backend de Laravel cambiando solo la URL.
 */
export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', datos: env.fuenteDatos, timestamp: new Date().toISOString() });
});

// Desde acá, todas las rutas usan datos: con MySQL se leen de la base antes de responder.
apiRouter.use(sincronizarDatos);

apiRouter.use('/auth', authRouter);

// Protegidas: requieren "Authorization: Bearer <token>"
apiRouter.use('/agreements', requireAuth, conveniosRouter);
apiRouter.get('/units', requireAuth, catalogosController.unidades);
apiRouter.get('/alerts', requireAuth, catalogosController.alertas);
apiRouter.patch('/alerts/:id', requireAuth, catalogosController.marcarAlerta);
// Solo app móvil: Inicio, firma, comentarios… (no están en el contrato)
apiRouter.use('/mobile', requireAuth, mobileRouter);