BACKEND - API REST (Laravel + MySQL)
====================================

PROPOSITO
API REST única que consumen la web y la app móvil. Concentra las reglas de
negocio, la seguridad y el acceso a la base de datos.

TECNOLOGIAS
- PHP 8.2+ / Laravel 11
- Laravel Sanctum (autenticación)
- MySQL 8

RECURSOS A IMPLEMENTAR
/auth, /users, /units, /agreements, /parties, /people, /documents,
/agreements/{id}/links, /dashboard, /alerts

REGLAS CLAVE
- Toda ruta (excepto login) requiere autenticación.
- La autorización por rol y unidad se valida SIEMPRE en el servidor
  (Policies/Gates): fichas, búsquedas, estadísticas y descargas.
- Concurrencia optimista: cada edición envía "version"; si no coincide
  se responde 409 Conflict.
- Circuito de estados: borrador > revisión > aprobado > firmado >
  rescindido > archivado. Cada transición se registra con fundamento.
- No se aprueba un convenio con menos de 2 partes.
- Adendas, renovaciones y sustituciones son instrumentos NUEVOS con código
  propio; vincularlos NO modifica el registro anterior.
- Documentos: solo PDF, máx. 20 MB, SHA-256, guardados en storage privado,
  descarga solo por endpoint autorizado, se conservan versiones previas.
- Exportación CSV: neutralizar celdas que empiecen con = + - @

INSTALACION
1. cd backend
2. composer install
3. cp .env.example .env   (completar datos de BD, sin subir secretos)
4. php artisan key:generate
5. php artisan migrate --seed
6. php artisan storage:link   (solo si hay archivos públicos; los PDF NO)
7. php artisan serve

ALERTAS PROGRAMADAS
Agregar al cron:  * * * * * php artisan schedule:run

PRUEBAS
php artisan test

ESTRUCTURA SUGERIDA
app/Models, app/Http/Controllers, app/Http/Requests, app/Policies,
app/Services, database/migrations, database/seeders, routes/api.php, tests/

NOTAS
- Usar solo datos FICTICIOS en los seeders.
- Documentar la API (Postman / OpenAPI) en /docs.