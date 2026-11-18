import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Visor de PDF que abre la app en un WebView (public/visor) y la librería pdf.js que usa.
// No tiene datos: el PDF lo descarga la app con el token y se lo pasa al visor.
const require = createRequire(import.meta.url);
const pdfjs = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'legacy', 'build');
app.use('/visor/pdfjs', express.static(pdfjs));
app.use('/visor', express.static(fileURLToPath(new URL('../public/visor', import.meta.url))));

app.use(notFound);
app.use(errorHandler);