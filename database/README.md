DATABASE - Scripts y recursos de base de datos (MySQL)
======================================================

PROPOSITO
Contener los recursos para crear y poblar la base de datos desde cero.

CONTENIDO ESPERADO
- schema.sql          Script completo de creación de tablas
- seeds.sql           Datos FICTICIOS de prueba
- diagrama-er.png     Diagrama entidad-relación
- diccionario.md      (o referencia a /docs/diccionario-datos.md)

TABLAS PRINCIPALES
usuarios, unidades, convenios, partes, partes_convenio, personas,
personas_convenio, detalles_pasantia, vinculos_convenio, documentos,
transiciones_estado, observaciones_revision, registros_auditoria, notificaciones

DECISIONES DE MODELADO
- convenios.codigo es UNICO.
- convenios.version se incrementa en cada edición (concurrencia optimista).
- vinculos_convenio relaciona instrumentos (específico>marco, adenda>modificado,
  renovación/sustitución>antecedente) sin alterar el registro anterior.
- documentos guarda tipo, ruta privada, tamaño, hash SHA-256 y versión; las
  cargas anteriores se conservan.
- Fechas de vencimiento nulas = "sin vencimiento registrado".
- transiciones_estado registra estado anterior/nuevo, fundamento, usuario y fecha.
- registros_auditoria registra acciones relevantes y descargas.
- usuarios.unidad_id nulo = alcance global.

CREACION DESDE CERO
1. mysql -u root -p -e "CREATE DATABASE convenios_unlpam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
2. mysql -u root -p convenios_unlpam < schema.sql
3. mysql -u root -p convenios_unlpam < seeds.sql

NOTA
Si se usan migraciones de Laravel, estos scripts sirven como respaldo y
documentación; la fuente principal serán las migraciones en /backend.
No incluir contraseñas reales ni datos personales verdaderos.