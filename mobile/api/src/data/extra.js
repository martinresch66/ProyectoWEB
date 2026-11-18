/**
 * Datos que agrega SOLO la API simulada de la app móvil, además de los de database/seeds.sql.
 *
 * - Convenios de ejemplo 6 a 14: el seed tiene 5 y ninguno está "aprobado" (listo para firmar),
 *   así que la app no tendría nada para mostrar en el Firmador ni en el inicio.
 *   Usan los mismos campos y ENUM que schema.sql. Las instituciones son reales de La Pampa;
 *   las personas y los números son inventados.
 * - Teléfonos de los usuarios: la tabla `usuarios` no tiene teléfono y el MFA por SMS lo necesita
 *   (ver "Cambios que necesitaría la base" en mobile/README.md).
 *
 * Los ids siguen después de los del seed para no chocar.
 */

/** Teléfono de cada usuario (por id), para el código MFA por SMS. */
export const telefonosUsuarios = {
  1: '+54 9 2954 551234',
  2: '+54 9 2302 443322',
  3: '+54 9 2954 667788',
  4: '+54 9 2954 112233',
};

export const partes = [
  { id: 4, nombre: 'INTA - Estación Experimental Agropecuaria Anguil', cuit_cuil: '30-54667611-3', tipo_personeria: 'juridica', email: 'eeaanguil@inta.gob.ar', telefono: '02954-495057', direccion: 'Ruta Nacional 5 km 580, Anguil, La Pampa' },
  { id: 5, nombre: 'Cooperativa Regional de Electricidad (CORPICO)', cuit_cuil: '30-54573829-1', tipo_personeria: 'juridica', email: 'institucional@corpico.com.ar', telefono: '02302-422000', direccion: 'Calle 17 N° 774, General Pico, La Pampa' },
  { id: 6, nombre: 'Colegio de Abogados y Procuradores de La Pampa', cuit_cuil: '30-62845120-7', tipo_personeria: 'juridica', email: 'secretaria@colegioabogadoslp.org.ar', telefono: '02954-425566', direccion: 'Av. San Martín 450, Santa Rosa, La Pampa' },
  { id: 7, nombre: 'Administración Provincial del Agua (APA)', cuit_cuil: '30-68741236-2', tipo_personeria: 'juridica', email: 'mesadeentradas@apa.lapampa.gob.ar', telefono: '02954-433100', direccion: 'Av. Luro 1260, Santa Rosa, La Pampa' },
  { id: 8, nombre: 'Gobierno de la Provincia de La Pampa', cuit_cuil: '30-99914523-6', tipo_personeria: 'juridica', email: 'secretariageneral@lapampa.gob.ar', telefono: '02954-452600', direccion: 'Centro Cívico, Santa Rosa, La Pampa' },
];

export const personas = [
  { id: 4, nombre: 'Valentina', apellido: 'Sosa', dni: '43987321', email: 'valentina.sosa@alumnos.unlpam.edu.ar', telefono: '02302-15887766' },
  { id: 5, nombre: 'Ricardo', apellido: 'Ferreyra', dni: '23456789', email: 'rferreyra@corpico.com.ar', telefono: '02302-15334455' },
  { id: 6, nombre: 'Gabriela', apellido: 'Lucero', dni: '27654321', email: 'glucero@exactas.unlpam.edu.ar', telefono: '02954-15223344' },
];

export const convenios = [
  { id: 6, codigo: 'CONV-2026-006', titulo: 'Convenio Marco UNLPam - INTA EEA Anguil', tipo: 'marco', estado: 'firmado', unidad_id: 3, resumen: 'Cooperación en investigación agropecuaria, uso de laboratorios y formación de recursos humanos.', fecha_inicio: '2026-03-15', fecha_fin: '2030-03-15', dias_preaviso: 90, version: 3, creado_por: 1, creado_en: '2026-01-26T10:00:00-03:00' },
  { id: 7, codigo: 'CONV-2026-007', titulo: 'Convenio Específico Laboratorio de Energías Renovables - CORPICO', tipo: 'especifico', estado: 'aprobado', unidad_id: 2, resumen: 'Instalación y monitoreo de un parque solar demostrativo en la sede General Pico.', fecha_inicio: '2026-12-01', fecha_fin: '2028-12-01', dias_preaviso: 60, version: 3, creado_por: 2, creado_en: '2026-08-19T09:00:00-03:00' },
  { id: 8, codigo: 'CONV-2026-008', titulo: 'Pasantía Estudiantil - Desarrollo App de Reclamos', tipo: 'pasantia', estado: 'aprobado', unidad_id: 2, resumen: 'Práctica profesional en desarrollo mobile para estudiante de Ingeniería en Sistemas.', fecha_inicio: '2026-12-01', fecha_fin: '2027-06-30', dias_preaviso: 30, version: 3, creado_por: 2, creado_en: '2026-09-22T12:30:00-03:00' },
  { id: 9, codigo: 'CONV-2026-009', titulo: 'Convenio Marco UNLPam - Colegio de Abogados de La Pampa', tipo: 'marco', estado: 'revision', unidad_id: 4, resumen: 'Prácticas profesionales supervisadas y actividades de extensión jurídica.', fecha_inicio: '2027-01-01', fecha_fin: '2030-12-31', dias_preaviso: 60, version: 2, creado_por: 1, creado_en: '2026-10-01T10:45:00-03:00' },
  { id: 10, codigo: 'CONV-2025-010', titulo: 'Convenio Específico Monitoreo de Calidad de Agua - APA', tipo: 'especifico', estado: 'firmado', unidad_id: 3, resumen: 'Muestreo y análisis de calidad de agua subterránea en localidades del norte provincial.', fecha_inicio: '2025-08-01', fecha_fin: '2026-12-01', dias_preaviso: 30, version: 3, creado_por: 1, creado_en: '2025-06-10T08:30:00-03:00' },
  { id: 11, codigo: 'CONV-2025-011', titulo: 'Convenio Marco UNLPam - Gobierno de la Provincia de La Pampa', tipo: 'marco', estado: 'firmado', unidad_id: 1, resumen: 'Asistencia técnica, capacitación de agentes públicos y producción de información estadística.', fecha_inicio: '2025-02-01', fecha_fin: null, dias_preaviso: 30, version: 3, creado_por: 1, creado_en: '2024-12-02T11:00:00-03:00' },
  { id: 12, codigo: 'CONV-2026-012', titulo: 'Adenda N° 1 Ampliación de Puntos de Muestreo - APA', tipo: 'adenda', estado: 'aprobado', unidad_id: 3, resumen: 'Suma ocho puntos de muestreo y extiende el plazo del convenio específico de calidad de agua.', fecha_inicio: '2026-12-02', fecha_fin: '2027-12-01', dias_preaviso: 30, version: 3, creado_por: 1, creado_en: '2026-09-30T15:00:00-03:00' },
  { id: 13, codigo: 'CONV-2026-013', titulo: 'Convenio Específico Consultorio Jurídico Gratuito', tipo: 'especifico', estado: 'borrador', unidad_id: 4, resumen: 'Atención jurídica gratuita a cargo de estudiantes avanzados con supervisión docente.', fecha_inicio: null, fecha_fin: null, dias_preaviso: 30, version: 1, creado_por: 1, creado_en: '2026-11-03T09:20:00-03:00' },
  { id: 14, codigo: 'CONV-2024-014', titulo: 'Convenio Específico Relevamiento de Redes Eléctricas Rurales - CORPICO', tipo: 'especifico', estado: 'firmado', unidad_id: 2, resumen: 'Relevamiento georreferenciado de la red eléctrica rural del norte pampeano.', fecha_inicio: '2024-03-01', fecha_fin: '2025-09-01', dias_preaviso: 30, version: 3, creado_por: 2, creado_en: '2024-01-15T10:00:00-03:00' },
];

export const partesConvenio = [
  { id: 11, convenio_id: 6, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 12, convenio_id: 6, parte_id: 4, rol_en_convenio: 'Organismo Científico' },
  { id: 13, convenio_id: 7, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 14, convenio_id: 7, parte_id: 5, rol_en_convenio: 'Financiador' },
  { id: 15, convenio_id: 8, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 16, convenio_id: 8, parte_id: 3, rol_en_convenio: 'Empresa Receptora' },
  { id: 17, convenio_id: 9, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 18, convenio_id: 9, parte_id: 6, rol_en_convenio: 'Contraparte' },
  { id: 19, convenio_id: 10, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 20, convenio_id: 10, parte_id: 7, rol_en_convenio: 'Comitente' },
  { id: 21, convenio_id: 11, parte_id: 1, rol_en_convenio: 'Universidad' },
  { id: 22, convenio_id: 11, parte_id: 8, rol_en_convenio: 'Gobierno Provincial' },
  { id: 23, convenio_id: 12, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 24, convenio_id: 12, parte_id: 7, rol_en_convenio: 'Comitente' },
  { id: 25, convenio_id: 13, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 26, convenio_id: 14, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 27, convenio_id: 14, parte_id: 5, rol_en_convenio: 'Comitente' },
];

export const personasConvenio = [
  { id: 4, convenio_id: 7, persona_id: 2, rol: 'Director del Proyecto' },
  { id: 5, convenio_id: 7, persona_id: 5, rol: 'Responsable Técnico CORPICO' },
  { id: 6, convenio_id: 10, persona_id: 6, rol: 'Directora del Laboratorio' },
  { id: 7, convenio_id: 12, persona_id: 6, rol: 'Directora del Laboratorio' },
];

export const detallesPasantia = [
  { id: 2, convenio_id: 8, estudiante_persona_id: 4, tutor_academico_persona_id: 2, tutor_institucion_persona_id: null, carrera: 'Ingeniería en Sistemas de Información', horas_semanales: 16, monto_estimulo: 220000.0, aseguradora: 'La Segunda Seguros', numero_poliza: 'POL-2026-112233' },
];

export const vinculos = [
  { id: 3, convenio_origen_id: 12, convenio_destino_id: 10, tipo_vinculo: 'adenda_de', creado_en: '2026-09-30T15:05:00-03:00' },
];

export const documentos = [
  { id: 4, convenio_id: 6, tipo_documento: 'convenio_firmado', nombre_original: 'Convenio_Marco_INTA_Anguil_Firmado.pdf', ruta_archivo: 'storage/app/private/agreements/6/v1_marco.pdf', tamano_bytes: 1320400, tipo_mime: 'application/pdf', hash_sha256: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', version: 1, subido_por: 1, creado_en: '2026-03-15T12:00:00-03:00' },
  { id: 5, convenio_id: 7, tipo_documento: 'dictamen', nombre_original: 'Dictamen_Legal_CORPICO_Solar.pdf', ruta_archivo: 'storage/app/private/agreements/7/v1_dictamen.pdf', tamano_bytes: 402300, tipo_mime: 'application/pdf', hash_sha256: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce', version: 1, subido_por: 3, creado_en: '2026-10-20T10:30:00-03:00' },
  { id: 6, convenio_id: 10, tipo_documento: 'convenio_firmado', nombre_original: 'Convenio_Especifico_APA_Calidad_Agua.pdf', ruta_archivo: 'storage/app/private/agreements/10/v1_especifico.pdf', tamano_bytes: 980100, tipo_mime: 'application/pdf', hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', version: 1, subido_por: 1, creado_en: '2025-08-01T12:00:00-03:00' },
];

const t = (id, convenio_id, estado_anterior, estado_nuevo, motivo, cambiado_por, creado_en) => ({
  id, convenio_id, estado_anterior, estado_nuevo, motivo, cambiado_por, creado_en,
});

export const transiciones = [
  t(5, 14, 'borrador', 'revision', 'Borrador completo, se eleva a revisión.', 2, '2024-01-29T10:00:00-03:00'),
  t(6, 14, 'revision', 'aprobado', 'Sin observaciones.', 3, '2024-02-12T12:00:00-03:00'),
  t(7, 14, 'aprobado', 'firmado', 'Firmado por ambas partes.', 2, '2024-03-01T11:00:00-03:00'),
  t(8, 11, 'borrador', 'revision', 'Se eleva a revisión del Consejo Superior.', 1, '2024-12-10T09:00:00-03:00'),
  t(9, 11, 'revision', 'aprobado', 'Aprobado por Resolución del Consejo Superior.', 3, '2025-01-15T13:00:00-03:00'),
  t(10, 11, 'aprobado', 'firmado', 'Firmado en acto público en Casa de Gobierno.', 1, '2025-02-01T11:30:00-03:00'),
  t(11, 10, 'borrador', 'revision', 'Plan de muestreo completo, se eleva a revisión.', 1, '2025-06-20T10:00:00-03:00'),
  t(12, 10, 'revision', 'aprobado', 'Dictamen técnico favorable.', 3, '2025-07-08T16:00:00-03:00'),
  t(13, 10, 'aprobado', 'firmado', 'Firmado por la Rectora y el Administrador Provincial del Agua.', 1, '2025-08-01T10:00:00-03:00'),
  t(14, 6, 'borrador', 'revision', 'Se eleva a revisión.', 1, '2026-02-02T09:30:00-03:00'),
  t(15, 6, 'revision', 'aprobado', 'Sin observaciones.', 3, '2026-02-20T11:00:00-03:00'),
  t(16, 6, 'aprobado', 'firmado', 'Firmado por ambas instituciones.', 1, '2026-03-15T12:00:00-03:00'),
  t(17, 7, 'borrador', 'revision', 'Proyecto técnico y presupuesto completos.', 2, '2026-09-01T10:00:00-03:00'),
  t(18, 7, 'revision', 'aprobado', 'Dictamen legal favorable. Listo para la firma.', 3, '2026-10-21T09:00:00-03:00'),
  t(19, 8, 'borrador', 'revision', 'Plan de trabajo de la pasantía cargado.', 2, '2026-10-01T11:00:00-03:00'),
  t(20, 8, 'revision', 'aprobado', 'Cumple la Ley 26.427. Listo para la firma.', 3, '2026-10-27T15:30:00-03:00'),
  t(21, 12, 'borrador', 'revision', 'Se eleva la adenda a revisión.', 1, '2026-10-06T10:00:00-03:00'),
  t(22, 12, 'revision', 'aprobado', 'Aprobada. Listo para la firma.', 3, '2026-11-02T10:15:00-03:00'),
  t(23, 9, 'borrador', 'revision', 'Se eleva a revisión del área legal.', 1, '2026-10-14T12:00:00-03:00'),
];

export const observaciones = [];

export const notificaciones = [
  { id: 3, usuario_id: 2, titulo: 'Convenio aprobado', mensaje: 'El convenio CONV-2026-008 fue aprobado y está listo para la firma.', leida: 0, creado_en: '2026-10-27T15:30:00-03:00' },
  { id: 4, usuario_id: 1, titulo: 'Convenio aprobado', mensaje: 'La adenda CONV-2026-012 fue aprobada y está lista para la firma.', leida: 0, creado_en: '2026-11-02T10:15:00-03:00' },
];
