import { conveniosService } from '../services/convenios.service.js';
import { generarPdfConvenio } from '../services/pdfConvenio.service.js';
import { resumenService } from '../services/resumen.service.js';

/** Controlador de las rutas que solo usa la app móvil (/api/mobile/...). */
export const mobileController = {
  /** GET /mobile/resumen → boxes, últimos movimientos y pendientes de firma del Inicio. */
  resumen(req, res) {
    res.json(resumenService.obtener(req.user));
  },

  /** GET /mobile/convenios/:id/pdf → el documento del convenio para leer, compartir y firmar. */
  async pdfConvenio(req, res) {
    // obtener() ya devuelve 404 si el convenio no existe o no está en el alcance del usuario.
    const ficha = conveniosService.obtener(req.user, req.params.id);
    const bytes = await generarPdfConvenio(ficha);
    res
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="${ficha.codigo}.pdf"`)
      .send(Buffer.from(bytes));
  },
};