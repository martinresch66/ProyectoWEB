SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "-03:00";

CREATE TABLE `unidades` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `unidad_id` bigint(20) UNSIGNED DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `clave` varchar(255) NOT NULL,
  `rol` enum('admin','gestion','revision','consulta') NOT NULL DEFAULT 'consulta',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `unidad_id` (`unidad_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`unidad_id`) REFERENCES `unidades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `cuit_cuil` varchar(50) DEFAULT NULL,
  `tipo_personeria` enum('fisica','juridica') NOT NULL DEFAULT 'juridica',
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personas` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `convenios` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` varchar(100) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `tipo` enum('marco','especifico','adenda','pasantia') NOT NULL,
  `estado` enum('borrador','revision','aprobado','firmado','rescindido','archivado') NOT NULL DEFAULT 'borrador',
  `unidad_id` bigint(20) UNSIGNED NOT NULL,
  `resumen` text DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `dias_preaviso` int(10) UNSIGNED DEFAULT 30,
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `creado_por` bigint(20) UNSIGNED NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `unidad_id` (`unidad_id`),
  KEY `creado_por` (`creado_por`),
  KEY `idx_convenios_estado` (`estado`),
  KEY `idx_convenios_tipo` (`tipo`),
  KEY `idx_convenios_fechas` (`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `convenios_ibfk_1` FOREIGN KEY (`unidad_id`) REFERENCES `unidades` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `convenios_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partes_convenio` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `parte_id` bigint(20) UNSIGNED NOT NULL,
  `rol_en_convenio` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_convenio_parte` (`convenio_id`,`parte_id`),
  KEY `parte_id` (`parte_id`),
  CONSTRAINT `partes_convenio_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `partes_convenio_ibfk_2` FOREIGN KEY (`parte_id`) REFERENCES `partes` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personas_convenio` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `persona_id` bigint(20) UNSIGNED NOT NULL,
  `rol` varchar(100) NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `convenio_id` (`convenio_id`),
  KEY `persona_id` (`persona_id`),
  CONSTRAINT `personas_convenio_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `personas_convenio_ibfk_2` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vinculos_convenio` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_origen_id` bigint(20) UNSIGNED NOT NULL,
  `convenio_destino_id` bigint(20) UNSIGNED NOT NULL,
  `tipo_vinculo` enum('especifico_de','adenda_de','renovacion_de','sustitucion_de') NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vinculo_convenio` (`convenio_origen_id`,`convenio_destino_id`,`tipo_vinculo`),
  KEY `convenio_destino_id` (`convenio_destino_id`),
  CONSTRAINT `vinculos_convenio_ibfk_1` FOREIGN KEY (`convenio_origen_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vinculos_convenio_ibfk_2` FOREIGN KEY (`convenio_destino_id`) REFERENCES `convenios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `detalles_pasantia` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `estudiante_persona_id` bigint(20) UNSIGNED NOT NULL,
  `tutor_academico_persona_id` bigint(20) UNSIGNED DEFAULT NULL,
  `tutor_institucion_persona_id` bigint(20) UNSIGNED DEFAULT NULL,
  `carrera` varchar(255) NOT NULL,
  `horas_semanales` int(10) UNSIGNED NOT NULL,
  `monto_estimulo` decimal(12,2) DEFAULT NULL,
  `aseguradora` varchar(255) DEFAULT NULL,
  `numero_poliza` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `convenio_id` (`convenio_id`),
  KEY `estudiante_persona_id` (`estudiante_persona_id`),
  KEY `tutor_academico_persona_id` (`tutor_academico_persona_id`),
  KEY `tutor_institucion_persona_id` (`tutor_institucion_persona_id`),
  CONSTRAINT `detalles_pasantia_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `detalles_pasantia_ibfk_2` FOREIGN KEY (`estudiante_persona_id`) REFERENCES `personas` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `detalles_pasantia_ibfk_3` FOREIGN KEY (`tutor_academico_persona_id`) REFERENCES `personas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `detalles_pasantia_ibfk_4` FOREIGN KEY (`tutor_institucion_persona_id`) REFERENCES `personas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `documentos` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `tipo_documento` varchar(100) NOT NULL DEFAULT 'convenio_firmado',
  `nombre_original` varchar(255) NOT NULL,
  `ruta_archivo` varchar(512) NOT NULL,
  `tamano_bytes` bigint(20) UNSIGNED NOT NULL,
  `tipo_mime` varchar(100) NOT NULL DEFAULT 'application/pdf',
  `hash_sha256` varchar(64) NOT NULL,
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `subido_por` bigint(20) UNSIGNED NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `convenio_id` (`convenio_id`),
  KEY `subido_por` (`subido_por`),
  KEY `idx_documentos_hash` (`hash_sha256`),
  CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `documentos_ibfk_2` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `observaciones_revision` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `usuario_revisor_id` bigint(20) UNSIGNED NOT NULL,
  `observacion` text NOT NULL,
  `esta_resuelta` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `convenio_id` (`convenio_id`),
  KEY `usuario_revisor_id` (`usuario_revisor_id`),
  CONSTRAINT `observaciones_revision_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `observaciones_revision_ibfk_2` FOREIGN KEY (`usuario_revisor_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notificaciones` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notificaciones_usuario` (`usuario_id`,`leida`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transiciones_estado` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `estado_anterior` enum('borrador','revision','aprobado','firmado','rescindido','archivado') DEFAULT NULL,
  `estado_nuevo` enum('borrador','revision','aprobado','firmado','rescindido','archivado') NOT NULL,
  `motivo` text NOT NULL,
  `cambiado_por` bigint(20) UNSIGNED NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `convenio_id` (`convenio_id`),
  KEY `cambiado_por` (`cambiado_por`),
  CONSTRAINT `transiciones_estado_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transiciones_estado_ibfk_2` FOREIGN KEY (`cambiado_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registros_auditoria` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tipo_entidad` varchar(100) DEFAULT NULL,
  `entidad_id` bigint(20) UNSIGNED DEFAULT NULL,
  `direccion_ip` varchar(45) DEFAULT NULL,
  `agente_usuario` text DEFAULT NULL,
  `detalles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalles`)),
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_auditoria_accion` (`accion`),
  KEY `idx_auditoria_entidad` (`tipo_entidad`,`entidad_id`),
  CONSTRAINT `registros_auditoria_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1);

INSERT INTO `unidades` (`id`, `nombre`, `codigo`, `descripcion`) VALUES
(1, 'Rectorado UNLPam', 'RECT', 'Secretaría de Relaciones Institucionales y Consejo Superior'),
(2, 'Facultad de Ingeniería', 'ING', 'Sede General Pico - Carreras de Sistemas, Electromecánica e Industrial'),
(3, 'Facultad de Ciencias Exactas y Naturales', 'EXACTAS', 'Sede Santa Rosa - Computación, Biología y Química'),
(4, 'Facultad de Ciencias Económicas y Jurídicas', 'ECOJUR', 'Sede Santa Rosa - Abogacía y Contador Público');

INSERT INTO `usuarios` (`id`, `unidad_id`, `nombre`, `email`, `clave`, `rol`, `activo`) VALUES
(1, NULL, 'Martín Resch (Admin)', 'admin@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'admin', 1),
(2, 2, 'Juan Ponkosky (Gestor ING)', 'gestion.ing@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'gestion', 1),
(3, 1, 'Tomás Watson (Revisor Central)', 'revision@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'revision', 1),
(4, 3, 'María González (Consulta Exactas)', 'consulta.exactas@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'consulta', 1),
(5, 3, 'Lucía Fernández (Gestor Exactas)', 'gestion.exactas@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'gestion', 1),
(6, 2, 'Carlos Inactivo', 'inactivo@unlpam.edu.ar', '$2y$12$VPlf9ZFLI6wgBTEJUGtMLOphKhUBCLoz3B7f3q0TKnaTqE/yM8sSy', 'gestion', 0);

INSERT INTO `partes` (`id`, `nombre`, `cuit_cuil`, `tipo_personeria`, `email`, `telefono`, `direccion`) VALUES
(1, 'Universidad Nacional de La Pampa', '30-58675432-9', 'juridica', 'rectorado@unlpam.edu.ar', '02954-451200', 'Gil 353, Santa Rosa, La Pampa'),
(2, 'Municipalidad de General Pico', '30-99901234-5', 'juridica', 'contacto@generalpico.gov.ar', '02302-434900', 'Calle 13 N° 1140, General Pico, La Pampa'),
(3, 'Tecnológica Pampeana S.A.', '30-71122334-8', 'juridica', 'rrhh@tecnologicapampeana.com.ar', '02302-421100', 'Parque Industrial, Calle 5 N° 302, General Pico'),
(4, 'INTA Anguil', '30-54667918-3', 'juridica', 'anguil@inta.gob.ar', '02954-495057', 'Ruta Nac. 5 Km 580, Anguil, La Pampa');

INSERT INTO `personas` (`id`, `nombre`, `apellido`, `dni`, `email`, `telefono`) VALUES
(1, 'Lucas', 'Pérez', '42123456', 'lucas.perez@alumnos.unlpam.edu.ar', '02302-15515253'),
(2, 'Carlos', 'García', '20987654', 'cgarcia@ing.unlpam.edu.ar', '02302-15443322'),
(3, 'Laura', 'Martínez', '28112233', 'lmartinez@generalpico.gov.ar', '02302-15667788'),
(4, 'Valeria', 'Sosa', '31777888', 'vsosa@tecnologicapampeana.com.ar', '02302-15601122');

INSERT INTO `convenios` (`id`, `codigo`, `titulo`, `tipo`, `estado`, `unidad_id`, `resumen`, `fecha_inicio`, `fecha_fin`, `dias_preaviso`, `version`, `creado_por`) VALUES
(1, 'CONV-2026-001', 'Convenio Marco UNLPam - Municipalidad de General Pico', 'marco', 'firmado', 2, 'Acuerdo general de cooperación técnica, transferencia y pasantías.', '2026-03-01', '2028-03-01', 60, 3, 2),
(2, 'CONV-2026-002', 'Específico Modernización Catastral General Pico', 'especifico', 'firmado', 2, 'Desarrollo GIS municipal. Caso límite de alerta por vencimiento próximo.', '2025-12-17', '2026-12-02', 30, 2, 2),
(3, 'PAS-2026-003', 'Pasantía Educativa Tecnológica Pampeana - Lucas Pérez', 'pasantia', 'firmado', 2, 'Práctica supervisada vencida con datos personales sensibles.', '2026-02-01', '2026-11-07', 15, 2, 2),
(4, 'CONV-2026-004', 'Convenio Marco Investigación Ambiental INTA Anguil', 'marco', 'revision', 3, 'Listo para aprobar por el revisor. Prueba también plazo sin fecha de fin.', '2026-12-01', NULL, 30, 1, 5),
(5, 'CONV-2026-005', 'Adenda Prórroga SmartCity Pico (Incompleta)', 'adenda', 'revision', 2, 'Caso límite: faltan partes y tiene observación pendiente sin resolver.', '2026-11-17', '2027-05-17', 30, 1, 2),
(6, 'CONV-2026-006', 'Borrador Desarrollo IoT Agropecuario', 'especifico', 'borrador', 2, 'Borrador editable para probar concurrencia (version 1) y flujo hacia revisión.', '2026-12-10', '2027-12-10', 30, 1, 2),
(7, 'CONV-2026-007', 'Específico Análisis de Aguas Subterráneas', 'especifico', 'aprobado', 3, 'Aprobado, aguardando firma. Sirve para probar aislamiento por unidad.', '2026-11-17', '2027-06-17', 30, 2, 5),
(8, 'CONV-2026-008', 'Convenio Rescindido por Mutuo Acuerdo', 'especifico', 'rescindido', 2, 'Prueba de visualización de estado rescindido.', '2026-01-15', '2026-08-15', 30, 4, 2),
(9, 'CONV-2026-CSV', '=CMD|\' /C calc\'!A0 Prueba Sanitización CSV', 'marco', 'archivado', 4, 'Prueba de exportación segura CSV.', '2024-01-01', '2025-01-01', 30, 1, 1);

INSERT INTO `partes_convenio` (`convenio_id`, `parte_id`, `rol_en_convenio`) VALUES
(1, 1, 'Institución Educativa'), (1, 2, 'Contraparte Municipal'),
(2, 1, 'Unidad Ejecutora'), (2, 2, 'Comitente Municipal'),
(3, 1, 'Institución Educativa'), (3, 3, 'Empresa Receptora'),
(4, 1, 'Institución Académica'), (4, 4, 'Organismo Científico'),
(5, 1, 'Unidad Ejecutora'),
(6, 1, 'Unidad Ejecutora'), (6, 3, 'Empresa Contraparte'),
(7, 1, 'Unidad Ejecutora'), (7, 2, 'Municipio'),
(8, 1, 'Unidad Ejecutora'), (8, 3, 'Empresa'),
(9, 1, 'UNLPam'), (9, 4, 'INTA');

INSERT INTO `personas_convenio` (`convenio_id`, `persona_id`, `rol`) VALUES
(1, 2, 'Coordinador Académico'),
(2, 2, 'Director Técnico'),
(2, 3, 'Responsable Municipal');

INSERT INTO `vinculos_convenio` (`convenio_origen_id`, `convenio_destino_id`, `tipo_vinculo`) VALUES
(2, 1, 'especifico_de'),
(5, 2, 'adenda_de');

INSERT INTO `detalles_pasantia` (`convenio_id`, `estudiante_persona_id`, `tutor_academico_persona_id`, `tutor_institucion_persona_id`, `carrera`, `horas_semanales`, `monto_estimulo`, `aseguradora`, `numero_poliza`) VALUES
(3, 1, 2, 4, 'Ingeniería en Sistemas de Información', 20, 280000.00, 'La Segunda Seguros', 'POL-2026-998877');

INSERT INTO `observaciones_revision` (`convenio_id`, `usuario_revisor_id`, `observacion`, `esta_resuelta`) VALUES
(5, 3, 'Falta vincular la contraparte externa y adjuntar el documento de respaldo.', 0);

INSERT INTO `transiciones_estado` (`convenio_id`, `estado_anterior`, `estado_nuevo`, `motivo`, `cambiado_por`) VALUES
(1, 'borrador', 'revision', 'Carga inicial completa.', 2),
(1, 'revision', 'aprobado', 'Dictamen técnico favorable.', 3),
(1, 'aprobado', 'firmado', 'Suscripción completada por las partes firmantes.', 2),
(4, 'borrador', 'revision', 'Elevado a revisión central.', 5),
(5, 'borrador', 'revision', 'Enviado a revisión (incompleto).', 2);

INSERT INTO `notificaciones` (`usuario_id`, `titulo`, `mensaje`, `leida`) VALUES
(3, 'Nuevo convenio en revisión (CONV-2026-004)', 'Lucía Fernández envió el convenio CONV-2026-004 para revisión.', 0),
(3, 'Adenda en revisión (CONV-2026-005)', 'Juan Ponkosky envió la adenda CONV-2026-005 para auditoría.', 0),
(2, 'Alerta de plazo próximo (CONV-2026-002)', 'El convenio CONV-2026-002 vence el 02/12/2026 (dentro de los 30 días de preaviso).', 0);

INSERT INTO `registros_auditoria` (`usuario_id`, `accion`, `tipo_entidad`, `entidad_id`, `direccion_ip`, `detalles`) VALUES
(1, 'inicializar_entorno_pruebas', 'sistema', 0, '127.0.0.1', '{"escenarios": 9, "proposito": "auditoria_integral"}');

COMMIT;