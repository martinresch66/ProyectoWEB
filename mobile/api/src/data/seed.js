/**
 * Copia de database/seeds.sql (los mismos ids, valores y ENUM), para que la API simulada
 * responda con los mismos datos que va a tener el backend de Laravel.
 *
 * NO cambiar estos valores: si se actualiza database/seeds.sql, se copia de nuevo acá.
 * Los datos que agrega solo la app móvil están en extra.js.
 *
 * Única diferencia: seeds.sql no carga fechas de alta (usa CURRENT_TIMESTAMP), así que acá se
 * ponen fechas coherentes con la historia de cada convenio para poder ordenar los movimientos.
 */

export const unidades = [
  { id: 1, nombre: 'Rectorado UNLPam', codigo: 'RECT', descripcion: 'Secretaría de Relaciones Institucionales y Consejo Superior' },
  { id: 2, nombre: 'Facultad de Ingeniería', codigo: 'ING', descripcion: 'Sede General Pico - Carreras de Sistemas, Electromecánica e Industrial' },
  { id: 3, nombre: 'Facultad de Ciencias Exactas y Naturales', codigo: 'EXACTAS', descripcion: 'Sede Santa Rosa - Computación, Biología y Química' },
  { id: 4, nombre: 'Facultad de Ciencias Económicas y Jurídicas', codigo: 'ECOJUR', descripcion: 'Sede Santa Rosa - Abogacía y Contador Público' },
];

/** Contraseña de todos los usuarios del seed (en la base está el hash bcrypt; acá se hashea al iniciar). */
export const PASSWORD_DE_PRUEBA = 'password123';

export const usuarios = [
  { id: 1, unidad_id: null, nombre: 'Martín Resch (Admin)', email: 'admin@unlpam.edu.ar', rol: 'admin', activo: 1 },
  { id: 2, unidad_id: 2, nombre: 'Juan Ponkosky (Gestor ING)', email: 'gestion.ing@unlpam.edu.ar', rol: 'gestion', activo: 1 },
  { id: 3, unidad_id: 1, nombre: 'Tomás Watson (Revisor Central)', email: 'revision@unlpam.edu.ar', rol: 'revision', activo: 1 },
  { id: 4, unidad_id: 3, nombre: 'María González (Consulta Exactas)', email: 'consulta.exactas@unlpam.edu.ar', rol: 'consulta', activo: 1 },
];

export const convenios = [
  { id: 1, codigo: 'CONV-2025-001', titulo: 'Convenio Marco de Cooperación UNLPam - Municipalidad de General Pico', tipo: 'marco', estado: 'firmado', unidad_id: 2, resumen: 'Cooperación técnica y académica institucional para desarrollo regional.', fecha_inicio: '2025-03-01', fecha_fin: '2028-03-01', dias_preaviso: 60, version: 1, creado_por: 2, creado_en: '2025-01-20T10:00:00-03:00' },
  { id: 2, codigo: 'CONV-2025-002', titulo: 'Convenio Específico Desarrollo Software SmartCity Pico', tipo: 'especifico', estado: 'firmado', unidad_id: 2, resumen: 'Desarrollo de plataforma web y mobile para gestión de reclamos urbanos.', fecha_inicio: '2025-05-10', fecha_fin: '2026-11-10', dias_preaviso: 30, version: 2, creado_por: 2, creado_en: '2025-04-02T09:30:00-03:00' },
  { id: 3, codigo: 'CONV-2026-003', titulo: 'Pasantía Estudiantil - Sistema Monitoreo Redes', tipo: 'pasantia', estado: 'firmado', unidad_id: 2, resumen: 'Práctica profesional supervisada para estudiante de Ingeniería en Sistemas.', fecha_inicio: '2026-02-01', fecha_fin: '2026-12-31', dias_preaviso: 30, version: 1, creado_por: 2, creado_en: '2026-01-12T11:15:00-03:00' },
  { id: 4, codigo: 'CONV-2026-004', titulo: 'Adenda N° 1 Prórroga Convenio SmartCity Pico', tipo: 'adenda', estado: 'revision', unidad_id: 2, resumen: 'Ampliación de plazos y módulos de software para movilidad urbana.', fecha_inicio: '2026-11-11', fecha_fin: '2027-05-11', dias_preaviso: 30, version: 1, creado_por: 2, creado_en: '2026-10-05T08:45:00-03:00' },
  { id: 5, codigo: 'CONV-2026-005', titulo: 'Convenio Marco UNLPam - Empresa Tecnológica Pampeana S.A.', tipo: 'marco', estado: 'borrador', unidad_id: 2, resumen: 'Borrador inicial para pasantías e investigación aplicada.', fecha_inicio: null, fecha_fin: null, dias_preaviso: 30, version: 1, creado_por: 2, creado_en: '2026-10-28T16:20:00-03:00' },
];

export const partes = [
  { id: 1, nombre: 'Universidad Nacional de La Pampa', cuit_cuil: '30-58675432-9', tipo_personeria: 'juridica', email: 'rectorado@unlpam.edu.ar', telefono: '02954-451200', direccion: 'Gil 353, Santa Rosa, La Pampa' },
  { id: 2, nombre: 'Municipalidad de General Pico', cuit_cuil: '30-99901234-5', tipo_personeria: 'juridica', email: 'contacto@generalpico.gov.ar', telefono: '02302-434900', direccion: 'Calle 13 N° 1140, General Pico, La Pampa' },
  { id: 3, nombre: 'Tecnológica Pampeana S.A.', cuit_cuil: '30-71122334-8', tipo_personeria: 'juridica', email: 'rrhh@tecnologicapampeana.com.ar', telefono: '02302-421100', direccion: 'Parque Industrial, Calle 5 N° 302, General Pico' },
];

export const partesConvenio = [
  { id: 1, convenio_id: 1, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 2, convenio_id: 1, parte_id: 2, rol_en_convenio: 'Contraparte Municipal' },
  { id: 3, convenio_id: 2, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 4, convenio_id: 2, parte_id: 2, rol_en_convenio: 'Beneficiario y Financiador' },
  { id: 5, convenio_id: 3, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 6, convenio_id: 3, parte_id: 3, rol_en_convenio: 'Empresa Receptora' },
  { id: 7, convenio_id: 4, parte_id: 1, rol_en_convenio: 'Unidad Ejecutora' },
  { id: 8, convenio_id: 4, parte_id: 2, rol_en_convenio: 'Contraparte Municipal' },
  { id: 9, convenio_id: 5, parte_id: 1, rol_en_convenio: 'Institución Educativa' },
  { id: 10, convenio_id: 5, parte_id: 3, rol_en_convenio: 'Empresa Contraparte' },
];

export const personas = [
  { id: 1, nombre: 'Lucas', apellido: 'Pérez', dni: '42123456', email: 'lucas.perez@alumnos.unlpam.edu.ar', telefono: '02302-15515253' },
  { id: 2, nombre: 'Carlos', apellido: 'García', dni: '20987654', email: 'cgarcia@ing.unlpam.edu.ar', telefono: '02302-15443322' },
  { id: 3, nombre: 'Laura', apellido: 'Martínez', dni: '28112233', email: 'lmartinez@generalpico.gov.ar', telefono: '02302-15667788' },
];

export const personasConvenio = [
  { id: 1, convenio_id: 1, persona_id: 2, rol: 'Coordinador Académico' },
  { id: 2, convenio_id: 2, persona_id: 2, rol: 'Director Técnico del Proyecto' },
  { id: 3, convenio_id: 2, persona_id: 3, rol: 'Responsable Técnico Municipal' },
];

export const detallesPasantia = [
  { id: 1, convenio_id: 3, estudiante_persona_id: 1, tutor_academico_persona_id: 2, tutor_institucion_persona_id: 3, carrera: 'Ingeniería en Sistemas de Información', horas_semanales: 20, monto_estimulo: 250000.0, aseguradora: 'La Segunda Seguros', numero_poliza: 'POL-2026-998877' },
];

export const vinculos = [
  { id: 1, convenio_origen_id: 2, convenio_destino_id: 1, tipo_vinculo: 'especifico_de', creado_en: '2025-04-02T09:40:00-03:00' },
  { id: 2, convenio_origen_id: 4, convenio_destino_id: 2, tipo_vinculo: 'adenda_de', creado_en: '2026-10-05T08:50:00-03:00' },
];

export const documentos = [
  { id: 1, convenio_id: 1, tipo_documento: 'convenio_firmado', nombre_original: 'Convenio_Marco_UNLPam_Pico_Firmado.pdf', ruta_archivo: 'storage/app/private/agreements/1/v1_marco.pdf', tamano_bytes: 2450800, tipo_mime: 'application/pdf', hash_sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', version: 1, subido_por: 2, creado_en: '2025-03-01T12:00:00-03:00' },
  { id: 2, convenio_id: 2, tipo_documento: 'convenio_firmado', nombre_original: 'Convenio_Especifico_SmartCity_Firmado.pdf', ruta_archivo: 'storage/app/private/agreements/2/v1_especifico.pdf', tamano_bytes: 1890120, tipo_mime: 'application/pdf', hash_sha256: 'b321172111ef8d6171887e221376e1919a795b8214309c62d02c2e92c286e680', version: 1, subido_por: 2, creado_en: '2025-05-10T12:00:00-03:00' },
  { id: 3, convenio_id: 3, tipo_documento: 'acta_pasantia', nombre_original: 'Acta_Acuerdo_Pasantia_LucasPerez.pdf', ruta_archivo: 'storage/app/private/agreements/3/v1_pasantia.pdf', tamano_bytes: 1050400, tipo_mime: 'application/pdf', hash_sha256: 'c887766554433221100998877665544332211009988776655443322110099887', version: 1, subido_por: 2, creado_en: '2026-02-01T12:00:00-03:00' },
];

export const transiciones = [
  { id: 1, convenio_id: 1, estado_anterior: 'borrador', estado_nuevo: 'revision', motivo: 'Carga inicial completada y enviada a revisión técnica.', cambiado_por: 2, creado_en: '2025-02-03T10:00:00-03:00' },
  { id: 2, convenio_id: 1, estado_anterior: 'revision', estado_nuevo: 'aprobado', motivo: 'Dictamen legal y técnico favorable.', cambiado_por: 3, creado_en: '2025-02-18T15:30:00-03:00' },
  { id: 3, convenio_id: 1, estado_anterior: 'aprobado', estado_nuevo: 'firmado', motivo: 'Suscripción completada por las partes firmantes.', cambiado_por: 2, creado_en: '2025-03-01T11:00:00-03:00' },
  { id: 4, convenio_id: 4, estado_anterior: 'borrador', estado_nuevo: 'revision', motivo: 'Solicitud de extensión de plazo elevada a revisión.', cambiado_por: 2, creado_en: '2026-10-08T09:10:00-03:00' },
];

export const observaciones = [
  { id: 1, convenio_id: 4, usuario_revisor_id: 3, observacion: 'Verificar que la fecha de vigencia de la póliza de seguro cubra todo el periodo de la adenda.', esta_resuelta: 0, creado_en: '2026-10-15T14:00:00-03:00' },
];

export const notificaciones = [
  { id: 1, usuario_id: 3, titulo: 'Nuevo convenio enviado a revisión', mensaje: 'El usuario Juan Ponkosky envió el convenio CONV-2026-004 para revisión.', leida: 0, creado_en: '2026-10-08T09:10:00-03:00' },
  { id: 2, usuario_id: 2, titulo: 'Observación emitida', mensaje: 'El revisor Tomás Watson dejó una observación en el convenio CONV-2026-004.', leida: 1, creado_en: '2026-10-15T14:00:00-03:00' },
];
