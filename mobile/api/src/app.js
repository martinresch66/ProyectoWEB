import cors from 'cors';
import express from 'express';

import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { logger } from './middlewares/logger.js';
import { apiRouter } from './routes/index.js';

/** Configuración de la aplicación Express (separada del server para poder testearla). */
export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(logger);

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
