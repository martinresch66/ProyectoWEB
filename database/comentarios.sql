-- Comentarios de los convenios (T2 - Firmador). Tabla que agrega la app móvil.
-- La API de la app (mobile/api) la crea sola si no existe; este archivo es para tenerla documentada
-- o para crearla a mano desde phpMyAdmin (base convenios_unlpam > SQL).
-- es_ofensivo = 1: el sistema detectó lenguaje ofensivo. El texto original se conserva para auditoría,
-- pero a los usuarios se les muestra solo "Comentario ofensivo".

CREATE TABLE IF NOT EXISTS `comentarios` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `convenio_id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `texto` text NOT NULL,
  `es_ofensivo` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `convenio_id` (`convenio_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`convenio_id`) REFERENCES `convenios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;