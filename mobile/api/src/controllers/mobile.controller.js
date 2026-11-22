import { conveniosService } from '../services/convenios.service.js';
import { firmaService } from '../services/firma.service.js';
import { generarPdfConvenio } from '../services/pdfConvenio.service.js';
import { resumenService } from '../services/resumen.service.js';
import { comentariosService } from '../services/comentarios.service.js';

/** Controlador de las rutas que solo usa la app móvil (/api/mobile/...). */
export const mobileController = {
  /** GET /mobile/resumen → boxes, últimos movimientos y pendientes de firma del Inicio. */
  resumen(req, res) {
    res.json(resumenService.obtener(req.user));
  },

  /** GET /mobile/resumen/:indicador → los convenios de un box del Inicio (firmados, vigentes, en_tramite…). */
  indicador(req, res) {
    res.json(resumenService.listar(req.user, req.params.indicador));
  },

  /**
   * GET /mobile/convenios/:id/pdf → el documento del convenio para leer, compartir y firmar.
   * Si ya tiene un PDF firmado guardado, devuelve ese; si no, lo genera con los datos de la ficha.
   */
  async pdfConvenio(req, res) {
    // obtener() ya devuelve 404 si el convenio no existe o no está en el alcance del usuario.
    const ficha = conveniosService.obtener(req.user, req.params.id);
    const bytes = (await firmaService.pdfGuardado(ficha.id)) ?? Buffer.from(await generarPdfConvenio(ficha));
    res.type('application/pdf').set('Content-Disposition', `inline; filename="${ficha.codigo}.pdf"`).send(bytes);
  },

  /** GET /mobile/convenios/:id/firma → quién, cuándo y dónde se firmó desde la app ({ firma: null } si no). */
  firma(req, res) {
    res.json(firmaService.obtener(req.user, req.params.id));
  },

  /** GET /mobile/convenios/:id/comentarios → comentarios del convenio (del más nuevo al más viejo). */
  comentarios(req, res) {
    res.json(comentariosService.listar(req.user, req.params.id));
  },

  /** POST /mobile/convenios/:id/comentarios → publica un comentario (si es ofensivo, se marca solo). */
  async comentar(req, res) {
    res.status(201).json(await comentariosService.crear(req.user, req.params.id, req.body));
  },

  /** POST /mobile/convenios/:id/firma → firma el convenio (huella + firma manuscrita + ubicación). */
  async firmar(req, res) {
    const resultado = await firmaService.firmar(req.user, req.params.id, req.body, {
      ip: req.ip ?? null,
      agente: req.get('user-agent') ?? null,
    });
    res.status(201).json(resultado);
  },
};