import { Router } from 'express';

import { conveniosController } from '../controllers/convenios.controller.js';

export const conveniosRouter = Router();

// GET /api/agreements?q=&tipo=&estado=&unidad_id=&vigencia=&desde=&hasta=&page=&per_page=
conveniosRouter.get('/', conveniosController.listar);

// GET /api/agreements/{id} → ficha completa
conveniosRouter.get('/:id', conveniosController.obtener);
