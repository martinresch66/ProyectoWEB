-- =============================================================================
-- SISTEMA DE GESTIÓN DE CONVENIOS (UNLPam) - DATOS DE PRUEBA (SEEDS)
-- Archivo: database/seeds.sql
-- Nota: Todas las contraseñas predeterminadas son 'password123'
-- =============================================================================
USE convenios_unlpam;

-- Desactivar temporalmente restricciones de claves foráneas
SET FOREIGN_KEY_CHECKS = 0;

-- Vaciar tablas con DELETE FROM para evitar el error #1701 de InnoDB
DELETE FROM notificaciones;
DELETE FROM registros_auditoria;
DELETE FROM observaciones_revision;
DELETE FROM transiciones_estado;
DELETE FROM documentos;
DELETE FROM vinculos_convenio;
DELETE FROM detalles_pasantia;
DELETE FROM personas_convenio;
DELETE FROM personas;
DELETE FROM partes_convenio;
DELETE FROM partes;
DELETE FROM convenios;
DELETE FROM usuarios;
DELETE FROM unidades;

-- Reiniciar los contadores AUTO_INCREMENT a 1
ALTER TABLE unidades AUTO_INCREMENT = 1;
ALTER TABLE usuarios AUTO_INCREMENT = 1;
ALTER TABLE convenios AUTO_INCREMENT = 1;
ALTER TABLE partes AUTO_INCREMENT = 1;
ALTER TABLE partes_convenio AUTO_INCREMENT = 1;
ALTER TABLE personas AUTO_INCREMENT = 1;
ALTER TABLE personas_convenio AUTO_INCREMENT = 1;
ALTER TABLE detalles_pasantia AUTO_INCREMENT = 1;
ALTER TABLE vinculos_convenio AUTO_INCREMENT = 1;
ALTER TABLE documentos AUTO_INCREMENT = 1;
ALTER TABLE transiciones_estado AUTO_INCREMENT = 1;
ALTER TABLE observaciones_revision AUTO_INCREMENT = 1;
ALTER TABLE registros_auditoria AUTO_INCREMENT = 1;
ALTER TABLE notificaciones AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;
-- -----------------------------------------------------------------------------
-- 1. UNIDADES ACADÉMICAS Y DEPENDENCIAS
-- -----------------------------------------------------------------------------
INSERT INTO unidades (id, nombre, codigo, descripcion) VALUES
(1, 'Rectorado UNLPam', 'RECT', 'Secretaría de Relaciones Institucionales y Consejo Superior'),
(2, 'Facultad de Ingeniería', 'ING', 'Sede General Pico - Carreras de Sistemas, Electromecánica e Industrial'),
(3, 'Facultad de Ciencias Exactas y Naturales', 'EXACTAS', 'Sede Santa Rosa - Computación, Biología y Química'),
(4, 'Facultad de Ciencias Económicas y Jurídicas', 'ECOJUR', 'Sede Santa Rosa - Abogacía y Contador Público');

-- -----------------------------------------------------------------------------
-- 2. USUARIOS Y ROLES (Hash de clave para 'password123': $2y$10$e0MYzXyjpJS7Pd0RVvHwHe1e.5aJ4e.3/d3CqP1I5q0L6Yp0L6Yp0)
-- -----------------------------------------------------------------------------
INSERT INTO usuarios (id, unidad_id, nombre, email, clave, rol, activo) VALUES
(1, NULL, 'Martín Resch (Admin)', 'admin@unlpam.edu.ar', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
(2, 2, 'Juan Ponkosky (Gestor ING)', 'gestion.ing@unlpam.edu.ar', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'gestion', 1),
(3, 1, 'Tomás Watson (Revisor Central)', 'revision@unlpam.edu.ar', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'revision', 1),
(4, 3, 'María González (Consulta Exactas)', 'consulta.exactas@unlpam.edu.ar', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'consulta', 1);

-- -----------------------------------------------------------------------------
-- 3. CONVENIOS E INSTRUMENTOS
-- -----------------------------------------------------------------------------
INSERT INTO convenios (id, codigo, titulo, tipo, estado, unidad_id, resumen, fecha_inicio, fecha_fin, dias_preaviso, version, creado_por) VALUES
(1, 'CONV-2025-001', 'Convenio Marco de Cooperación UNLPam - Municipalidad de General Pico', 'marco', 'firmado', 2, 'Cooperación técnica y académica institucional para desarrollo regional.', '2025-03-01', '2028-03-01', 60, 1, 2),
(2, 'CONV-2025-002', 'Convenio Específico Desarrollo Software SmartCity Pico', 'especifico', 'firmado', 2, 'Desarrollo de plataforma web y mobile para gestión de reclamos urbanos.', '2025-05-10', '2026-11-10', 30, 2, 2),
(3, 'CONV-2026-003', 'Pasantía Estudiantil - Sistema Monitoreo Redes', 'pasantia', 'firmado', 2, 'Práctica profesional supervisada para estudiante de Ingeniería en Sistemas.', '2026-02-01', '2026-12-31', 30, 1, 2),
(4, 'CONV-2026-004', 'Adenda N° 1 Prórroga Convenio SmartCity Pico', 'adenda', 'revision', 2, 'Ampliación de plazos y módulos de software para movilidad urbana.', '2026-11-11', '2027-05-11', 30, 1, 2),
(5, 'CONV-2026-005', 'Convenio Marco UNLPam - Empresa Tecnológica Pampeana S.A.', 'marco', 'borrador', 2, 'Borrador inicial para pasantías e investigación aplicada.', NULL, NULL, 30, 1, 2);

-- -----------------------------------------------------------------------------
-- 4. PARTES / INSTITUCIONES FIRMANTES
-- -----------------------------------------------------------------------------
INSERT INTO partes (id, nombre, cuit_cuil, tipo_personeria, email, telefono, direccion) VALUES
(1, 'Universidad Nacional de La Pampa', '30-58675432-9', 'juridica', 'rectorado@unlpam.edu.ar', '02954-451200', 'Gil 353, Santa Rosa, La Pampa'),
(2, 'Municipalidad de General Pico', '30-99901234-5', 'juridica', 'contacto@generalpico.gov.ar', '02302-434900', 'Calle 13 N° 1140, General Pico, La Pampa'),
(3, 'Tecnológica Pampeana S.A.', '30-71122334-8', 'juridica', 'rrhh@tecnologicapampeana.com.ar', '02302-421100', 'Parque Industrial, Calle 5 N° 302, General Pico');

-- -----------------------------------------------------------------------------
-- 5. RELACIÓN CONVENIO - PARTES (Min. 2 partes por convenio)
-- -----------------------------------------------------------------------------
INSERT INTO partes_convenio (id, convenio_id, parte_id, rol_en_convenio) VALUES
(1, 1, 1, 'Institución Educativa'),
(2, 1, 2, 'Contraparte Municipal'),
(3, 2, 1, 'Unidad Ejecutora'),
(4, 2, 2, 'Beneficiario y Financiador'),
(5, 3, 1, 'Institución Educativa'),
(6, 3, 3, 'Empresa Receptora'),
(7, 4, 1, 'Unidad Ejecutora'),
(8, 4, 2, 'Contraparte Municipal'),
(9, 5, 1, 'Institución Educativa'),
(10, 5, 3, 'Empresa Contraparte');

-- -----------------------------------------------------------------------------
-- 6. PERSONAS FÍSICAS
-- -----------------------------------------------------------------------------
INSERT INTO personas (id, nombre, apellido, dni, email, telefono) VALUES
(1, 'Lucas', 'Pérez', '42123456', 'lucas.perez@alumnos.unlpam.edu.ar', '02302-15515253'),
(2, 'Carlos', 'García', '20987654', 'cgarcia@ing.unlpam.edu.ar', '02302-15443322'),
(3, 'Laura', 'Martínez', '28112233', 'lmartinez@generalpico.gov.ar', '02302-15667788');

-- -----------------------------------------------------------------------------
-- 7. RELACIÓN CONVENIO - PERSONAS
-- -----------------------------------------------------------------------------
INSERT INTO personas_convenio (id, convenio_id, persona_id, rol) VALUES
(1, 1, 2, 'Coordinador Académico'),
(2, 2, 2, 'Director Técnico del Proyecto'),
(3, 2, 3, 'Responsable Técnico Municipal');

-- -----------------------------------------------------------------------------
-- 8. DETALLES ESPECÍFICOS DE PASANTÍAS (Solo para convenio_id = 3)
-- -----------------------------------------------------------------------------
INSERT INTO detalles_pasantia (id, convenio_id, estudiante_persona_id, tutor_academico_persona_id, tutor_institucion_persona_id, carrera, horas_semanales, monto_estimulo, aseguradora, numero_poliza) VALUES
(1, 3, 1, 2, 3, 'Ingeniería en Sistemas de Información', 20, 250000.00, 'La Segunda Seguros', 'POL-2026-998877');

-- -----------------------------------------------------------------------------
-- 9. VÍNCULOS ENTRE INSTRUMENTOS (Derivación y Adendas)
-- -----------------------------------------------------------------------------
INSERT INTO vinculos_convenio (id, convenio_origen_id, convenio_destino_id, tipo_vinculo) VALUES
(1, 2, 1, 'especifico_de'), -- El convenio 2 es específico del marco 1
(2, 4, 2, 'adenda_de');     -- El convenio 4 es una adenda del específico 2

-- -----------------------------------------------------------------------------
-- 10. DOCUMENTOS ADJUNTOS PDF
-- -----------------------------------------------------------------------------
INSERT INTO documentos (id, convenio_id, tipo_documento, nombre_original, ruta_archivo, tamano_bytes, tipo_mime, hash_sha256, version, subido_por) VALUES
(1, 1, 'convenio_firmado', 'Convenio_Marco_UNLPam_Pico_Firmado.pdf', 'storage/app/private/agreements/1/v1_marco.pdf', 2450800, 'application/pdf', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 1, 2),
(2, 2, 'convenio_firmado', 'Convenio_Especifico_SmartCity_Firmado.pdf', 'storage/app/private/agreements/2/v1_especifico.pdf', 1890120, 'application/pdf', 'b321172111ef8d6171887e221376e1919a795b8214309c62d02c2e92c286e680', 1, 2),
(3, 3, 'acta_pasantia', 'Acta_Acuerdo_Pasantia_LucasPerez.pdf', 'storage/app/private/agreements/3/v1_pasantia.pdf', 1050400, 'application/pdf', 'c887766554433221100998877665544332211009988776655443322110099887', 1, 2);

-- -----------------------------------------------------------------------------
-- 11. HISTORIAL DE TRANSICIONES DE ESTADO
-- -----------------------------------------------------------------------------
INSERT INTO transiciones_estado (id, convenio_id, estado_anterior, estado_nuevo, motivo, cambiado_por) VALUES
(1, 1, 'borrador', 'revision', 'Carga inicial completada y enviada a revisión técnica.', 2),
(2, 1, 'revision', 'aprobado', 'Dictamen legal y técnico favorable.', 3),
(3, 1, 'aprobado', 'firmado', 'Suscripción completada por las partes firmantes.', 2),
(4, 4, 'borrador', 'revision', 'Solicitud de extensión de plazo elevada a revisión.', 2);

-- -----------------------------------------------------------------------------
-- 12. OBSERVACIONES DE REVISIÓN
-- -----------------------------------------------------------------------------
INSERT INTO observaciones_revision (id, convenio_id, usuario_revisor_id, observacion, esta_resuelta) VALUES
(1, 4, 3, 'Verificar que la fecha de vigencia de la póliza de seguro cubra todo el periodo de la adenda.', 0);

-- -----------------------------------------------------------------------------
-- 13. AUDITORÍA Y BITÁCORA DE SEGURIDAD
-- -----------------------------------------------------------------------------
INSERT INTO registros_auditoria (id, usuario_id, accion, tipo_entidad, entidad_id, direccion_ip, agente_usuario, detalles) VALUES
(1, 2, 'crear_borrador', 'convenios', 4, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"codigo": "CONV-2026-004", "tipo": "adenda"}'),
(2, 2, 'solicitar_revision', 'convenios', 4, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"estado_anterior": "borrador", "estado_nuevo": "revision"}');

-- -----------------------------------------------------------------------------
-- 14. NOTIFICACIONES DEL SISTEMA
-- -----------------------------------------------------------------------------
INSERT INTO notificaciones (id, usuario_id, titulo, mensaje, leida) VALUES
(1, 3, 'Nuevo convenio enviado a revisión', 'El usuario Juan Ponkosky envió el convenio CONV-2026-004 para revisión.', 0),
(2, 2, 'Observación emitida', 'El revisor Tomás Watson dejó una observación en el convenio CONV-2026-004.', 1);