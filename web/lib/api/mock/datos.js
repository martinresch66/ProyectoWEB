// Datos del modo simulado. Son los de database/seeds.sql del repositorio
// (mismos ids, códigos y usuarios), más 3 convenios extra marcados "(simulado)"
// para que el panel muestre un vencido, uno sin vencimiento y la usuaria de
// Consulta de Exactas tenga algo para ver.
// Contraseña de todos los usuarios: password123

export function datosIniciales() {
  return structuredClone(DATOS);
}

const DATOS = {
  unidades: [
    { id: 1, nombre: "Rectorado UNLPam", codigo: "RECT", descripcion: "Secretaría de Relaciones Institucionales y Consejo Superior" },
    { id: 2, nombre: "Facultad de Ingeniería", codigo: "ING", descripcion: "Sede General Pico - Carreras de Sistemas, Electromecánica e Industrial" },
    { id: 3, nombre: "Facultad de Ciencias Exactas y Naturales", codigo: "EXACTAS", descripcion: "Sede Santa Rosa - Computación, Biología y Química" },
    { id: 4, nombre: "Facultad de Ciencias Económicas y Jurídicas", codigo: "ECOJUR", descripcion: "Sede Santa Rosa - Abogacía y Contador Público" },
  ],

  usuarios: [
    { id: 1, unidad_id: null, nombre: "Martín Resch (Admin)", email: "admin@unlpam.edu.ar", clave: "password123", rol: "admin", activo: 1 },
    { id: 2, unidad_id: 2, nombre: "Juan Ponkosky (Gestor ING)", email: "gestion.ing@unlpam.edu.ar", clave: "password123", rol: "gestion", activo: 1 },
    { id: 3, unidad_id: 1, nombre: "Tomás Watson (Revisor Central)", email: "revision@unlpam.edu.ar", clave: "password123", rol: "revision", activo: 1 },
    { id: 4, unidad_id: 3, nombre: "María González (Consulta Exactas)", email: "consulta.exactas@unlpam.edu.ar", clave: "password123", rol: "consulta", activo: 1 },
  ],

  convenios: [
    { id: 1, codigo: "CONV-2025-001", titulo: "Convenio Marco de Cooperación UNLPam - Municipalidad de General Pico", tipo: "marco", estado: "firmado", unidad_id: 2, resumen: "Cooperación técnica y académica institucional para desarrollo regional.", fecha_inicio: "2025-03-01", fecha_fin: "2028-03-01", dias_preaviso: 60, version: 1, creado_por: 2, creado_en: "2025-02-10 10:00:00", actualizado_en: "2025-03-01 12:00:00" },
    { id: 2, codigo: "CONV-2025-002", titulo: "Convenio Específico Desarrollo Software SmartCity Pico", tipo: "especifico", estado: "firmado", unidad_id: 2, resumen: "Desarrollo de plataforma web y mobile para gestión de reclamos urbanos.", fecha_inicio: "2025-05-10", fecha_fin: "2026-11-10", dias_preaviso: 30, version: 2, creado_por: 2, creado_en: "2025-04-20 09:30:00", actualizado_en: "2025-05-10 11:00:00" },
    { id: 3, codigo: "CONV-2026-003", titulo: "Pasantía Estudiantil - Sistema Monitoreo Redes", tipo: "pasantia", estado: "firmado", unidad_id: 2, resumen: "Práctica profesional supervisada para estudiante de Ingeniería en Sistemas.", fecha_inicio: "2026-02-01", fecha_fin: "2026-12-31", dias_preaviso: 30, version: 1, creado_por: 2, creado_en: "2026-01-15 08:45:00", actualizado_en: "2026-02-01 10:00:00" },
    { id: 4, codigo: "CONV-2026-004", titulo: "Adenda N° 1 Prórroga Convenio SmartCity Pico", tipo: "adenda", estado: "revision", unidad_id: 2, resumen: "Ampliación de plazos y módulos de software para movilidad urbana.", fecha_inicio: "2026-11-11", fecha_fin: "2027-05-11", dias_preaviso: 30, version: 1, creado_por: 2, creado_en: "2026-10-01 10:15:00", actualizado_en: "2026-10-05 16:20:00" },
    { id: 5, codigo: "CONV-2026-005", titulo: "Convenio Marco UNLPam - Empresa Tecnológica Pampeana S.A.", tipo: "marco", estado: "borrador", unidad_id: 2, resumen: "Borrador inicial para pasantías e investigación aplicada.", fecha_inicio: null, fecha_fin: null, dias_preaviso: 30, version: 1, creado_por: 2, creado_en: "2026-10-20 11:00:00", actualizado_en: "2026-10-20 11:00:00" },
    // Extras del modo simulado
    { id: 6, codigo: "CONV-2023-006", titulo: "Convenio Marco UNLPam - Instituto Tecnológico del Oeste (simulado)", tipo: "marco", estado: "firmado", unidad_id: 3, resumen: "Investigación aplicada en química de suelos.", fecha_inicio: "2023-07-01", fecha_fin: "2026-07-01", dias_preaviso: 60, version: 1, creado_por: 1, creado_en: "2023-06-01 10:00:00", actualizado_en: "2023-07-01 10:00:00" },
    { id: 7, codigo: "CONV-2025-007", titulo: "Convenio Marco UNLPam - Cooperativa de Servicios Médanos (simulado)", tipo: "marco", estado: "firmado", unidad_id: 3, resumen: "Colaboración en monitoreo de calidad de agua.", fecha_inicio: "2025-04-01", fecha_fin: null, dias_preaviso: 30, version: 1, creado_por: 1, creado_en: "2025-03-10 10:00:00", actualizado_en: "2025-04-01 10:00:00" },
    { id: 8, codigo: "CONV-2026-008", titulo: "Convenio Específico Capacitación Contable - Municipalidad de General Pico (simulado)", tipo: "especifico", estado: "aprobado", unidad_id: 4, resumen: "Capacitación en gestión presupuestaria para personal municipal.", fecha_inicio: "2026-12-01", fecha_fin: "2027-12-01", dias_preaviso: 30, version: 1, creado_por: 1, creado_en: "2026-09-01 10:00:00", actualizado_en: "2026-10-10 10:00:00" },
  ],

  partes: [
    { id: 1, nombre: "Universidad Nacional de La Pampa", cuit_cuil: "30-58675432-9", tipo_personeria: "juridica", email: "rectorado@unlpam.edu.ar", telefono: "02954-451200", direccion: "Gil 353, Santa Rosa, La Pampa" },
    { id: 2, nombre: "Municipalidad de General Pico", cuit_cuil: "30-99901234-5", tipo_personeria: "juridica", email: "contacto@generalpico.gov.ar", telefono: "02302-434900", direccion: "Calle 13 N° 1140, General Pico, La Pampa" },
    { id: 3, nombre: "Tecnológica Pampeana S.A.", cuit_cuil: "30-71122334-8", tipo_personeria: "juridica", email: "rrhh@tecnologicapampeana.com.ar", telefono: "02302-421100", direccion: "Parque Industrial, Calle 5 N° 302, General Pico" },
    { id: 4, nombre: "Instituto Tecnológico del Oeste (simulado)", cuit_cuil: "30-70000001-1", tipo_personeria: "juridica", email: "contacto@ito.example", telefono: null, direccion: null },
    { id: 5, nombre: "Cooperativa de Servicios Médanos (simulado)", cuit_cuil: "30-70000002-2", tipo_personeria: "juridica", email: "contacto@medanos.example", telefono: null, direccion: null },
  ],

  partes_convenio: [
    { id: 1, convenio_id: 1, parte_id: 1, rol_en_convenio: "Institución Educativa" },
    { id: 2, convenio_id: 1, parte_id: 2, rol_en_convenio: "Contraparte Municipal" },
    { id: 3, convenio_id: 2, parte_id: 1, rol_en_convenio: "Unidad Ejecutora" },
    { id: 4, convenio_id: 2, parte_id: 2, rol_en_convenio: "Beneficiario y Financiador" },
    { id: 5, convenio_id: 3, parte_id: 1, rol_en_convenio: "Institución Educativa" },
    { id: 6, convenio_id: 3, parte_id: 3, rol_en_convenio: "Empresa Receptora" },
    { id: 7, convenio_id: 4, parte_id: 1, rol_en_convenio: "Unidad Ejecutora" },
    { id: 8, convenio_id: 4, parte_id: 2, rol_en_convenio: "Contraparte Municipal" },
    { id: 9, convenio_id: 5, parte_id: 1, rol_en_convenio: "Institución Educativa" },
    { id: 10, convenio_id: 5, parte_id: 3, rol_en_convenio: "Empresa Contraparte" },
    { id: 11, convenio_id: 6, parte_id: 1, rol_en_convenio: "Institución Educativa" },
    { id: 12, convenio_id: 6, parte_id: 4, rol_en_convenio: "Contraparte" },
    { id: 13, convenio_id: 7, parte_id: 1, rol_en_convenio: "Institución Educativa" },
    { id: 14, convenio_id: 7, parte_id: 5, rol_en_convenio: "Contraparte" },
    { id: 15, convenio_id: 8, parte_id: 1, rol_en_convenio: "Unidad Ejecutora" },
    { id: 16, convenio_id: 8, parte_id: 2, rol_en_convenio: "Beneficiario" },
  ],

  personas: [
    { id: 1, nombre: "Lucas", apellido: "Pérez", dni: "42123456", email: "lucas.perez@alumnos.unlpam.edu.ar", telefono: "02302-15515253" },
    { id: 2, nombre: "Carlos", apellido: "García", dni: "20987654", email: "cgarcia@ing.unlpam.edu.ar", telefono: "02302-15443322" },
    { id: 3, nombre: "Laura", apellido: "Martínez", dni: "28112233", email: "lmartinez@generalpico.gov.ar", telefono: "02302-15667788" },
  ],

  personas_convenio: [
    { id: 1, convenio_id: 1, persona_id: 2, rol: "Coordinador Académico" },
    { id: 2, convenio_id: 2, persona_id: 2, rol: "Director Técnico del Proyecto" },
    { id: 3, convenio_id: 2, persona_id: 3, rol: "Responsable Técnico Municipal" },
  ],

  detalles_pasantia: [
    { id: 1, convenio_id: 3, estudiante_persona_id: 1, tutor_academico_persona_id: 2, tutor_institucion_persona_id: 3, carrera: "Ingeniería en Sistemas de Información", horas_semanales: 20, monto_estimulo: 250000.0, aseguradora: "La Segunda Seguros", numero_poliza: "POL-2026-998877" },
  ],

  vinculos_convenio: [
    { id: 1, convenio_origen_id: 2, convenio_destino_id: 1, tipo_vinculo: "especifico_de", creado_en: "2025-04-20 09:30:00" },
    { id: 2, convenio_origen_id: 4, convenio_destino_id: 2, tipo_vinculo: "adenda_de", creado_en: "2026-10-01 10:15:00" },
  ],

  documentos: [
    { id: 1, convenio_id: 1, tipo_documento: "convenio_firmado", nombre_original: "Convenio_Marco_UNLPam_Pico_Firmado.pdf", ruta_archivo: "storage/app/private/agreements/1/v1_marco.pdf", tamano_bytes: 2450800, tipo_mime: "application/pdf", hash_sha256: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", version: 1, subido_por: 2, creado_en: "2025-03-01 12:00:00" },
    { id: 2, convenio_id: 2, tipo_documento: "convenio_firmado", nombre_original: "Convenio_Especifico_SmartCity_Firmado.pdf", ruta_archivo: "storage/app/private/agreements/2/v1_especifico.pdf", tamano_bytes: 1890120, tipo_mime: "application/pdf", hash_sha256: "b321172111ef8d6171887e221376e1919a795b8214309c62d02c2e92c286e680", version: 1, subido_por: 2, creado_en: "2025-05-10 11:00:00" },
    { id: 3, convenio_id: 3, tipo_documento: "acta_pasantia", nombre_original: "Acta_Acuerdo_Pasantia_LucasPerez.pdf", ruta_archivo: "storage/app/private/agreements/3/v1_pasantia.pdf", tamano_bytes: 1050400, tipo_mime: "application/pdf", hash_sha256: "c887766554433221100998877665544332211009988776655443322110099887", version: 1, subido_por: 2, creado_en: "2026-02-01 10:00:00" },
  ],

  transiciones_estado: [
    { id: 1, convenio_id: 1, estado_anterior: "borrador", estado_nuevo: "revision", motivo: "Carga inicial completada y enviada a revisión técnica.", cambiado_por: 2, creado_en: "2025-02-15 10:00:00" },
    { id: 2, convenio_id: 1, estado_anterior: "revision", estado_nuevo: "aprobado", motivo: "Dictamen legal y técnico favorable.", cambiado_por: 3, creado_en: "2025-02-25 15:30:00" },
    { id: 3, convenio_id: 1, estado_anterior: "aprobado", estado_nuevo: "firmado", motivo: "Suscripción completada por las partes firmantes.", cambiado_por: 2, creado_en: "2025-03-01 12:00:00" },
    { id: 4, convenio_id: 4, estado_anterior: "borrador", estado_nuevo: "revision", motivo: "Solicitud de extensión de plazo elevada a revisión.", cambiado_por: 2, creado_en: "2026-10-05 16:20:00" },
  ],

  observaciones_revision: [
    { id: 1, convenio_id: 4, usuario_revisor_id: 3, observacion: "Verificar que la fecha de vigencia de la póliza de seguro cubra todo el periodo de la adenda.", esta_resuelta: 0, creado_en: "2026-10-08 09:00:00" },
  ],

  notificaciones: [
    { id: 1, usuario_id: 3, titulo: "Nuevo convenio enviado a revisión", mensaje: "El usuario Juan Ponkosky envió el convenio CONV-2026-004 para revisión.", leida: 0, convenio_id: 4, creado_en: "2026-10-05 16:20:00" },
    { id: 2, usuario_id: 2, titulo: "Observación emitida", mensaje: "El revisor Tomás Watson dejó una observación en el convenio CONV-2026-004.", leida: 1, convenio_id: 4, creado_en: "2026-10-08 09:00:00" },
  ],
};
