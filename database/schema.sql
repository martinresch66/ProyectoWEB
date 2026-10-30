-- =============================================================================
-- SISTEMA DE GESTIÓN DE CONVENIOS (UNLPam) - ESQUEMA DE BASE DE DATOS
-- Motor: MySQL 8.0+ | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS convenios_unlpam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE convenios_unlpam;

-- -----------------------------------------------------------------------------
-- 1. UNIDADES ACADÉMICAS Y DEPENDENCIAS (unidades)
-- Representa las facultades o áreas administrativas de la universidad.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unidades (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Identificador único autoincremental
    nombre VARCHAR(255) NOT NULL,                  -- Nombre completo (ej: "Facultad de Ingeniería")
    codigo VARCHAR(50) UNIQUE NULL,                -- Sigla o código interno (ej: "ING", "RECT")
    descripcion TEXT NULL,                         -- Descripción o notas adicionales de la dependencia
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. USUARIOS Y ROLES (usuarios)
-- Cuentas de acceso al sistema con roles y alcance por unidad.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unidad_id BIGINT UNSIGNED NULL,                -- Unidad asignada. NULL = Alcance Global (Admin / Revisor General)
    nombre VARCHAR(255) NOT NULL,                  -- Nombre y apellido del usuario
    email VARCHAR(255) UNIQUE NOT NULL,            -- Correo institucional (usado para login)
    clave VARCHAR(255) NOT NULL,                   -- Hash encriptado de la contraseña (Bcrypt/Argon2)
    rol ENUM('admin', 'gestion', 'revision', 'consulta') NOT NULL DEFAULT 'consulta', -- Rol asignado
    activo TINYINT(1) NOT NULL DEFAULT 1,          -- Estado de la cuenta (1: activo, 0: inhabilitado)
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. CONVENIOS E INSTRUMENTOS (convenios)
-- Tabla principal que almacena los instrumentos legales y sus metadatos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convenios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,          -- Identificador institucional único (ej: "CONV-2026-001")
    titulo VARCHAR(255) NOT NULL,                 -- Nombre formal o carátula del convenio
    tipo ENUM('marco', 'especifico', 'adenda', 'pasantia') NOT NULL, -- Clasificación del instrumento
    estado ENUM('borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado') NOT NULL DEFAULT 'borrador', -- Estado del flujo
    unidad_id BIGINT UNSIGNED NOT NULL,           -- Unidad académica/dependencia gestora responsable
    resumen TEXT NULL,                            -- Síntesis del objeto o propósito del convenio
    fecha_inicio DATE NULL,                       -- Fecha formal de inicio de vigencia
    fecha_fin DATE NULL,                          -- Fecha de vencimiento. NULL = Sin vencimiento registrado
    dias_preaviso INT UNSIGNED NULL DEFAULT 30,   -- Días de anticipación para generar alertas de vencimiento
    version INT UNSIGNED NOT NULL DEFAULT 1,      -- Contador incremental para concurrencia optimista
    creado_por BIGINT UNSIGNED NOT NULL,          -- Usuario que dio de alta el borrador
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_convenios_estado (estado),
    INDEX idx_convenios_tipo (tipo),
    INDEX idx_convenios_fechas (fecha_inicio, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. PARTES / INSTITUCIONES FIRMANTES (partes)
-- Entidades externas o internas que firman los convenios con la UNLPam.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,                 -- Razón social o nombre completo de la contraparte
    cuit_cuil VARCHAR(50) NULL,                   -- Identificación fiscal (CUIT/CUIL)
    tipo_personeria ENUM('fisica', 'juridica') NOT NULL DEFAULT 'juridica', -- Tipo de personería legal
    email VARCHAR(255) NULL,                      -- Correo institucional de contacto
    telefono VARCHAR(100) NULL,                   -- Teléfono de contacto
    direccion TEXT NULL,                          -- Domicilio legal
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. RELACIÓN CONVENIO - PARTES (partes_convenio)
-- Tabla intermedia N:M. Regla: Mínimo 2 partes para aprobar un convenio.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partes_convenio (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL,         -- Referencia al convenio
    parte_id BIGINT UNSIGNED NOT NULL,            -- Referencia a la parte firmante
    rol_en_convenio VARCHAR(100) NULL,            -- Rol específico (ej: "Conveniente", "Financiador")
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (parte_id) REFERENCES partes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_convenio_parte (convenio_id, parte_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. PERSONAS FÍSICAS (personas)
-- Registro unificado de personas (estudiantes, tutores, firmantes físicos).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,                 -- Nombres de la persona
    apellido VARCHAR(100) NOT NULL,               -- Apellidos de la persona
    dni VARCHAR(50) UNIQUE NOT NULL,              -- Documento Nacional de Identidad único
    email VARCHAR(255) NULL,                      -- Correo de contacto
    telefono VARCHAR(100) NULL,                   -- Teléfono de contacto
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. RELACIÓN CONVENIO - PERSONAS (personas_convenio)
-- Tabla intermedia N:M que asocia personas físicas con convenios.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas_convenio (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL,         -- Referencia al convenio
    persona_id BIGINT UNSIGNED NOT NULL,          -- Referencia a la persona
    rol VARCHAR(100) NOT NULL,                    -- Función (ej: "Representante Legal", "Firmante")
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. DETALLES ESPECÍFICOS DE PASANTÍAS (detalles_pasantia)
-- Extensión 1:1 requerida únicamente cuando el tipo de convenio es 'pasantia'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalles_pasantia (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL UNIQUE,  -- Relación 1:1 con la tabla convenios
    estudiante_persona_id BIGINT UNSIGNED NOT NULL, -- Estudiante pasante
    tutor_academico_persona_id BIGINT UNSIGNED NULL, -- Docente tutor asignado por UNLPam
    tutor_institucion_persona_id BIGINT UNSIGNED NULL, -- Tutor asignado por la empresa/institución
    carrera VARCHAR(255) NOT NULL,                -- Carrera universitaria del pasante
    horas_semanales INT UNSIGNED NOT NULL,        -- Carga horaria semanal fijada
    monto_estimulo DECIMAL(12, 2) NULL,           -- Asignación estímulo (monto mensual)
    aseguradora VARCHAR(255) NULL,                -- Compañía de seguro de accidentes personales
    numero_poliza VARCHAR(100) NULL,              -- Número de póliza de seguro
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (estudiante_persona_id) REFERENCES personas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (tutor_academico_persona_id) REFERENCES personas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (tutor_institucion_persona_id) REFERENCES personas(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. VÍNCULOS ENTRE INSTRUMENTOS (vinculos_convenio)
-- Relaciona convenios derivados (específicos, adendas) con su antecedente.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinculos_convenio (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_origen_id BIGINT UNSIGNED NOT NULL,  -- Convenio nuevo/derivado (ej: la Adenda)
    convenio_destino_id BIGINT UNSIGNED NOT NULL, -- Convenio antecedente (ej: el Convenio Marco)
    tipo_vinculo ENUM('especifico_de', 'adenda_de', 'renovacion_de', 'sustitucion_de') NOT NULL, -- Relación lógica
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_origen_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (convenio_destino_id) REFERENCES convenios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_vinculo_convenio (convenio_origen_id, convenio_destino_id, tipo_vinculo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. DOCUMENTOS ADJUNTOS PDF (documentos)
-- Registro y control de integridad de archivos subidos al servidor.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL,         -- Convenio al que pertenece el archivo
    tipo_documento VARCHAR(100) NOT NULL DEFAULT 'convenio_firmado', -- Categoría (ej: "anexo", "resolucion")
    nombre_original VARCHAR(255) NOT NULL,        -- Nombre original del archivo subido por el usuario
    ruta_archivo VARCHAR(512) NOT NULL,           -- Ruta privada en servidor (storage/app/private/...)
    tamano_bytes BIGINT UNSIGNED NOT NULL,        -- Peso del archivo en bytes (Máx 20 MB = 20.971.520 bytes)
    tipo_mime VARCHAR(100) NOT NULL DEFAULT 'application/pdf', -- Tipo de contenido
    hash_sha256 VARCHAR(64) NOT NULL,             -- Huella digital de 64 caracteres para verificar integridad
    version INT UNSIGNED NOT NULL DEFAULT 1,      -- Versión del documento
    subido_por BIGINT UNSIGNED NOT NULL,          -- Usuario que realizó la carga
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_documentos_hash (hash_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. HISTORIAL DE TRANSICIONES DE ESTADO (transiciones_estado)
-- Registro inmutable de cambios de estado en el ciclo de vida del trámite.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transiciones_estado (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL,         -- Convenio afectado
    estado_anterior ENUM('borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado') NULL, -- Estado previo
    estado_nuevo ENUM('borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado') NOT NULL, -- Nuevo estado
    motivo TEXT NOT NULL,                         -- Explicación o fundamento del cambio de estado
    cambiado_por BIGINT UNSIGNED NOT NULL,        -- Usuario que ejecutó la transición
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cambiado_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. OBSERVACIONES DE REVISIÓN (observaciones_revision)
-- Devoluciones y notas emitidas por los revisores durante la evaluación.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observaciones_revision (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    convenio_id BIGINT UNSIGNED NOT NULL,         -- Convenio observado
    usuario_revisor_id BIGINT UNSIGNED NOT NULL,  -- Revisor que emite la observación
    observacion TEXT NOT NULL,                    -- Texto detallado de las correcciones requeridas
    esta_resuelta TINYINT(1) NOT NULL DEFAULT 0,  -- Estado (0: pendiente de corrección, 1: resuelta)
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (usuario_revisor_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. AUDITORÍA Y BITÁCORA DE SEGURIDAD (registros_auditoria)
-- Registro centralizado de eventos del sistema (login, descargas, cambios).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_auditoria (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NULL,              -- Usuario que ejecutó la acción (NULL si es sistema o anónimo)
    accion VARCHAR(100) NOT NULL,                 -- Acción (ej: "descarga_pdf", "login", "modificacion")
    tipo_entidad VARCHAR(100) NULL,               -- Nombre de la tabla afectada (ej: "convenios")
    entidad_id BIGINT UNSIGNED NULL,              -- ID del registro afectado
    direccion_ip VARCHAR(45) NULL,                -- Dirección IP del cliente
    agente_usuario TEXT NULL,                     -- Navegador / Dispositivo (User-Agent)
    detalles JSON NULL,                           -- Información adicional estructurada en JSON
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_auditoria_accion (accion),
    INDEX idx_auditoria_entidad (tipo_entidad, entidad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. NOTIFICACIONES DEL SISTEMA (notificaciones)
-- Alertas y avisos dirigidos a los usuarios (vencimientos, revisiones).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,          -- Usuario destinatario
    titulo VARCHAR(255) NOT NULL,                 -- Título de la alerta (ej: "Convenio próximo a vencer")
    mensaje TEXT NOT NULL,                        -- Contenido descriptivo de la notificación
    leida TINYINT(1) NOT NULL DEFAULT 0,          -- Estado de lectura (0: no leída, 1: leída)
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notificaciones_usuario (usuario_id, leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;