import { analizarTexto } from '../domain/moderacion.js';
import { comentariosRepository } from '../repositories/comentarios.repository.js';
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { conveniosService } from './convenios.service.js';

/** Roles que pueden escribir comentarios. Consulta solo los lee (es un rol de solo lectura). */
export const ROLES_QUE_COMENTAN = ['admin', 'gestion', 'revision'];
const MIN_LARGO = 2;
const MAX_LARGO = 1000;
const TEXTO_OFENSIVO = 'Comentario ofensivo';

/**
 * Lo que ve la app de un comentario. Si es ofensivo, el texto original NO se manda:
 * se muestra solo "Comentario ofensivo" (el original queda guardado en la base para auditoría).
 */
function aRespuesta(c, usuario) {
  const autor = usuariosRepository.findById(Number(c.usuario_id));
  const ofensivo = Boolean(Number(c.es_ofensivo));
  return {
    id: c.id,
    convenio_id: Number(c.convenio_id),
    autor: autor ? { id: autor.id, nombre: autor.nombre, rol: autor.rol } : { id: Number(c.usuario_id), nombre: 'Usuario', rol: 'consulta' },
    texto: ofensivo ? TEXTO_OFENSIVO : c.texto,
    es_ofensivo: ofensivo,
    es_mio: Number(c.usuario_id) === usuario.id,
    creado_en: c.creado_en,
  };
}

/**
 * Comentarios dentro del convenio (T2, Firmador): entre los usuarios que pueden ver ese convenio
 * (mismo alcance por rol y unidad), así no son públicos.
 */
export const comentariosService = {
  listar(usuario, convenioId) {
    // 404 si el convenio no existe o no está en su alcance: tampoco puede ver sus comentarios.
    const ficha = conveniosService.obtener(usuario, convenioId);
    return {
      convenio: { id: ficha.id, codigo: ficha.codigo, titulo: ficha.titulo },
      puede_comentar: ROLES_QUE_COMENTAN.includes(usuario.rol),
      comentarios: comentariosRepository.findByConvenio(ficha.id).map((c) => aRespuesta(c, usuario)),
    };
  },

  async crear(usuario, convenioId, cuerpo) {
    if (!ROLES_QUE_COMENTAN.includes(usuario.rol)) {
      throw new HttpError(403, 'Tu rol (consulta) puede leer los comentarios, pero no escribirlos.');
    }
    const ficha = conveniosService.obtener(usuario, convenioId);

    const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : '';
    if (texto.length < MIN_LARGO || texto.length > MAX_LARGO) {
      throw new HttpError(422, 'Revisá el comentario.', {
        texto: [`El comentario tiene que tener entre ${MIN_LARGO} y ${MAX_LARGO} caracteres.`],
      });
    }

    // Detección automática: se guarda igual, pero marcado, y se muestra como "Comentario ofensivo".
    const { ofensivo } = analizarTexto(texto);
    const comentario = await comentariosRepository.crear({ convenioId: ficha.id, usuarioId: usuario.id, texto, esOfensivo: ofensivo });

    return {
      message: ofensivo
        ? 'El sistema detectó lenguaje ofensivo: tu comentario se publicó como "Comentario ofensivo".'
        : 'Comentario publicado.',
      comentario: aRespuesta(comentario, usuario),
    };
  },
};