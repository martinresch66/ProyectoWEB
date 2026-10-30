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
users, units, agreements, parties, agreement_parties, people,
agreement_people, internship_details, agreement_links, documents,
status_transitions, review_observations, audit_logs, notifications

DECISIONES DE MODELADO
- agreements.code es UNICO.
- agreements.version se incrementa en cada edición (concurrencia optimista).
- agreement_links relaciona instrumentos (específico>marco, adenda>modificado,
  renovación/sustitución>antecedente) sin alterar el registro anterior.
- documents guarda tipo, ruta privada, tamaño, hash SHA-256 y versión; las
  cargas anteriores se conservan.
- Fechas de vencimiento nulas = "sin vencimiento registrado".
- status_transitions registra estado anterior/nuevo, fundamento, usuario y fecha.
- audit_logs registra acciones relevantes y descargas.
- users.unit_id nulo = alcance global.

CREACION DESDE CERO
1. mysql -u root -p -e "CREATE DATABASE convenios_unlpam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
2. mysql -u root -p convenios_unlpam < schema.sql
3. mysql -u root -p convenios_unlpam < seeds.sql

NOTA
Si se usan migraciones de Laravel, estos scripts sirven como respaldo y
documentación; la fuente principal serán las migraciones en /backend.
No incluir contraseñas reales ni datos personales verdaderos.