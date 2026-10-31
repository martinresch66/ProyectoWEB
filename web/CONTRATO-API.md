# Contrato entre la web y la API

Este documento dice qué espera la web de cada endpoint. Está pensado para quien arma el
backend en Laravel. **No es obligatorio copiarlo al pie de la letra.** Si algo se hace
distinto, se ajusta del lado del front en tres archivos:

| Si cambia...                                         | Se toca                    |
|------------------------------------------------------|----------------------------|
| Una ruta, un método HTTP o un nombre de parámetro    | `lib/api/endpoints.js`     |
| La forma del JSON (nombres de campos, anidamiento)   | `lib/api/adaptadores.js`   |
| La URL base                                          | `.env.local` → `NEXT_PUBLIC_API_URL` |

Las pantallas no llaman a `fetch` directamente: todo pasa por `lib/api/servicios.js`.

Los nombres de tablas, columnas y valores de los ENUM son los de `database/schema.sql`
(`convenios`, `partes_convenio`, `tipo` = `marco|especifico|adenda|pasantia`,
`estado` = `borrador|revision|aprobado|firmado|rescindido|archivado`, etc.).

---

## 1. Reglas generales

- Todas las rutas cuelgan de `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:8000/api`).
- La web manda `Accept: application/json` y, si hay sesión,
  `Authorization: Bearer <token>`. Se usa **Sanctum en modo token**, no cookies SPA.
- Fechas: `YYYY-MM-DD`. Fechas con hora: ISO 8601. Se aceptan `created_at`/`updated_at`
  o `creado_en`/`actualizado_en`.
- Se acepta el objeto pelado o envuelto en `{ "data": ... }` (API Resources).
- Los listados pueden ser un array simple o el paginador de Laravel
  (`paginate()` o `Resource::collection(...)`). La web lee `data`, `current_page`,
  `last_page` y `total`, sueltos o dentro de `meta`.

### CORS (`config/cors.php`)

```php
'paths' => ['api/*'],
'allowed_origins' => ['http://localhost:3000'],
'allowed_headers' => ['*'],
'exposed_headers' => ['Content-Disposition'], // para leer el nombre del CSV/PDF descargado
'supports_credentials' => false,
```

## 2. Errores

La web convierte el código HTTP en un mensaje para el usuario. Lo importante es el código
y, en algunos casos, el cuerpo:

| Código | Cuándo                                   | Cuerpo que lee la web                                   |
|--------|------------------------------------------|---------------------------------------------------------|
| 401    | Token ausente o vencido                  | — (la web borra la sesión y manda al login)             |
| 403    | El rol o la unidad no permiten la acción | `{ "message": "..." }`                                  |
| 404    | No existe o no está en su alcance        | `{ "message": "..." }`                                  |
| 409    | Conflicto de versión al editar/cambiar estado | `{ "message": "...", "actual": { ...convenio... } }` |
| 413 / 415 | PDF muy grande / no es PDF            | `{ "message": "..." }`                                  |
| 422    | Validación (`FormRequest` de Laravel)    | `{ "message": "...", "errors": { "campo": ["..."] } }` |

- **422**: el formato estándar de Laravel ya sirve. Los errores se muestran al lado de cada
  campo. Para datos anidados la clave tiene que ser la de Laravel, por ejemplo
  `detalle_pasantia.horas_semanales`.
- **409**: en `actual` (también se acepta `data` o `convenio`) va el convenio **como está
  hoy en la base**, con la misma forma que la ficha. La web le muestra al usuario, campo por
  campo, "tu valor" contra "valor actual" y reenvía con la versión nueva.

## 3. Sesión

### `POST /auth/login`

```json
{ "email": "gestion.ing@unlpam.edu.ar", "password": "password123" }
```

Respuesta `200`. Se aceptan `token`, `access_token` o `plainTextToken`, y `user` o `usuario`:

```json
{
  "token": "1|abc...",
  "user": {
    "id": 2, "nombre": "Juan Ponkosky (Gestor ING)", "email": "gestion.ing@unlpam.edu.ar",
    "rol": "gestion", "unidad_id": 2, "activo": 1,
    "unidad": { "id": 2, "nombre": "Facultad de Ingeniería", "codigo": "ING" }
  }
}
```

Credenciales incorrectas: `422` (o `401`) con `message`.

### `GET /auth/me` → el mismo objeto `user`
### `POST /auth/logout` → `204`

## 4. Convenios

### `GET /agreements` — registro con filtros

Parámetros (todos opcionales):

| Parámetro   | Ejemplo        | Significado                                                      |
|-------------|----------------|------------------------------------------------------------------|
| `q`         | `smartcity`    | Busca en código, título y resumen                                |
| `tipo`      | `especifico`   | ENUM de `convenios.tipo`                                         |
| `estado`    | `firmado`      | ENUM de `convenios.estado`                                       |
| `unidad_id` | `2`            |                                                                  |
| `vigencia`  | `proximo`      | `vigente`, `proximo`, `vencido`, `sin_vencimiento` (ver §8)      |
| `desde`     | `2025-01-01`   | `fecha_inicio >=`                                                |
| `hasta`     | `2025-12-31`   | `fecha_inicio <=`                                                |
| `page`, `per_page` | `1`, `10` |                                                                |

**Alcance por rol.** El backend filtra siempre, no la web:
- `admin`: todo.
- `gestion`: los de su `unidad_id`.
- `revision`: todos.
- `consulta`: solo los `firmado` no vencidos de su unidad.

Respuesta: paginador. Cada ítem trae los campos de `convenios` más `unidad`:

```json
{
  "data": [
    {
      "id": 2, "codigo": "CONV-2025-002", "titulo": "Convenio Específico ...",
      "tipo": "especifico", "estado": "firmado", "unidad_id": 2, "resumen": "...",
      "fecha_inicio": "2025-05-10", "fecha_fin": "2026-11-10", "dias_preaviso": 30,
      "version": 2, "creado_por": 2,
      "unidad": { "id": 2, "nombre": "Facultad de Ingeniería", "codigo": "ING" }
    }
  ],
  "current_page": 1, "last_page": 1, "total": 5
}
```

### `GET /agreements/{id}` — ficha completa

Lo mismo de arriba, más las relaciones. Con Eloquent sería algo como:

```php
Convenio::with([
  'unidad', 'creador',
  'partes',            // belongsToMany con ->withPivot('rol_en_convenio')
  'personas',          // belongsToMany con ->withPivot('rol')
  'detallePasantia.estudiante', 'detallePasantia.tutorAcademico', 'detallePasantia.tutorInstitucion',
  'vinculosOrigen.convenioDestino', 'vinculosDestino.convenioOrigen',
  'documentos.usuario', 'transiciones.usuario', 'observaciones.revisor',
])->findOrFail($id);
```

Laravel lo serializa en snake_case y así lo espera la web:

```json
{
  "id": 2, "codigo": "CONV-2025-002", "...": "...",
  "creador": { "id": 2, "nombre": "Juan Ponkosky (Gestor ING)" },
  "partes": [
    { "id": 1, "nombre": "Universidad Nacional de La Pampa", "cuit_cuil": "30-54667004-5",
      "tipo_personeria": "juridica", "email": "...", "telefono": "...", "direccion": "...",
      "pivot": { "rol_en_convenio": "Institución Educativa" } }
  ],
  "personas": [
    { "id": 3, "nombre": "...", "apellido": "...", "dni": "...", "email": "...",
      "pivot": { "rol": "Coordinador" } }
  ],
  "detalle_pasantia": null,
  "vinculos_origen":  [ { "id": 1, "convenio_origen_id": 2, "convenio_destino_id": 1,
                          "tipo_vinculo": "especifico_de",
                          "convenio_destino": { "id": 1, "codigo": "CONV-2025-001", "titulo": "...", "tipo": "marco", "estado": "firmado" } } ],
  "vinculos_destino": [],
  "documentos":  [ { "id": 1, "tipo_documento": "convenio_firmado", "nombre_original": "x.pdf",
                     "tamano_bytes": 102400, "hash_sha256": "...", "version": 1, "subido_por": 2,
                     "usuario": { "nombre": "..." }, "created_at": "..." } ],
  "transiciones": [ { "id": 1, "estado_anterior": "aprobado", "estado_nuevo": "firmado",
                      "motivo": "...", "cambiado_por": 1, "usuario": { "nombre": "..." }, "created_at": "..." } ],
  "observaciones": [ { "id": 1, "observacion": "...", "esta_resuelta": 0, "respuesta": null,
                       "usuario_revisor_id": 3, "revisor": { "nombre": "..." }, "created_at": "..." } ]
}
```

También se acepta `partes_convenio: [{ rol_en_convenio, parte: {...} }]` (y lo mismo
para personas) si prefieren no usar `belongsToMany`. Se aceptan además `vinculos_como_origen`,
`transiciones_estado` y `observaciones_revision`.

El detalle de pasantía, cuando `tipo = pasantia`, se ve así:

```json
"detalle_pasantia": {
  "id": 1, "estudiante_persona_id": 5, "tutor_academico_persona_id": 3, "tutor_institucion_persona_id": 4,
  "estudiante": { "id": 5, "nombre": "Lucas", "apellido": "Pérez", "dni": "42123456" },
  "tutor_academico": { "...": "..." }, "tutor_institucion": { "...": "..." },
  "carrera": "Ingeniería en Sistemas", "horas_semanales": 20, "monto_estimulo": 150000,
  "aseguradora": "...", "numero_poliza": "..."
}
```

Si la tabla `convenios` suma columnas (ver §10), aparecen solas en la pestaña "Datos".

### `POST /agreements` — alta

```json
{
  "codigo": "CONV-2026-009", "titulo": "Pasantía en desarrollo web", "tipo": "pasantia",
  "unidad_id": 2, "resumen": "...", "fecha_inicio": "2026-01-12", "fecha_fin": "2027-01-06",
  "dias_preaviso": 30,
  "partes":   [ { "parte_id": 1, "rol_en_convenio": "Institución Educativa" },
                { "parte_id": 2, "rol_en_convenio": null } ],
  "personas": [ { "persona_id": 3, "rol": "Coordinador" } ],
  "detalle_pasantia": {
    "estudiante_persona_id": 5, "tutor_academico_persona_id": null, "tutor_institucion_persona_id": null,
    "carrera": "Ingeniería en Sistemas", "horas_semanales": 20, "monto_estimulo": 0,
    "aseguradora": null, "numero_poliza": null
  },
  "objeto": null, "alcance": null, "obligaciones": null, "condiciones_rescision": null,
  "marco_legal": null, "resolucion": null, "expediente": null,
  "condiciones_renovacion": null, "confidencialidad": null, "notas": null
}
```

- `detalle_pasantia` viene `null` si el tipo no es pasantía.
- Las claves de la última línea son las **extras** de la ficha (§10). Si la tabla no las tiene,
  Laravel las ignora al usar `$request->validated()`.
- El backend fija `estado = borrador`, `version = 1`, `creado_por = auth()->id()`, y sincroniza
  `partes`/`personas` (`sync`) y `detalle_pasantia` dentro de una transacción.
- Respuesta: `201` con el convenio (forma de ficha; alcanza con `id`).

Validaciones que también hace la web (conviene repetirlas en el `FormRequest`):
- `codigo` es obligatorio y único.
- `titulo` tiene al menos 5 caracteres.
- `fecha_fin` debe ser `>= fecha_inicio`.
- `dias_preaviso` va de 0 a 365.
- Si es pasantía: hace falta un estudiante, `horas_semanales` va de 1 a 20 y la carrera tiene al menos 3 caracteres.
- `gestion` solo puede usar su propia `unidad_id`.

### `PUT /agreements/{id}` — edición

Lleva el mismo cuerpo que el alta y además **`"version": <la que el usuario abrió>`**.

- Solo se edita si `estado = borrador`. Si no, devuelve `403` o `422` con `message`.
- Bloqueo optimista: si `version` no coincide con la de la base, devuelve `409` con `actual` (§2).
- Si sale bien: `version = version + 1`. La respuesta es `200` con el convenio actualizado.

### `POST /agreements/{id}/transitions` — cambio de estado

```json
{ "estado_nuevo": "revision", "motivo": "Borrador completo, se eleva a revisión.", "version": 3 }
```

`motivo` es obligatorio y tiene al menos 5 caracteres. Transiciones válidas:

| Desde       | Hacia       | Quién              | Condición extra                                                   |
|-------------|-------------|--------------------|-------------------------------------------------------------------|
| borrador    | revision    | admin, gestion     |                                                                   |
| borrador    | archivado   | admin              |                                                                   |
| revision    | aprobado    | admin, revision    | ≥ 2 partes y ninguna observación sin resolver                     |
| revision    | borrador    | admin, revision    | Tiene que haber una observación sin resolver (devolver)           |
| aprobado    | firmado     | admin, gestion     |                                                                   |
| aprobado    | borrador    | admin              |                                                                   |
| firmado     | rescindido  | admin              |                                                                   |
| firmado     | archivado   | admin              |                                                                   |
| rescindido  | archivado   | admin              |                                                                   |

- Si la transición no vale, devuelve `422` con `message`. Si la versión no coincide, `409`.
- Si sale bien, en la misma transacción:
  - se actualiza `estado`;
  - se hace `version++`;
  - se inserta en `transiciones_estado`;
  - se inserta en `registros_auditoria`;
  - se crea una notificación para el creador.
- Respuesta: `200` con el convenio (o `204`; la web recarga la ficha igual).

Para **devolver**, la web primero hace el `POST` de la observación (abajo) y después la transición a `borrador`.

### `GET /agreements/export` — CSV

Recibe los mismos filtros que el listado, sin paginar. Devuelve `text/csv; charset=utf-8` con:
- `Content-Disposition: attachment; filename="convenios-2026-10-30.csv"`.
- BOM y separador `;`, para que Excel lo abra bien.
- Celdas neutralizadas: si una celda empieza con `=`, `+`, `-`, `@`, tab o retorno, se le antepone `'`.

## 5. Vínculos

- `POST /agreements/{id}/links` con `{ "convenio_destino_id": 1, "tipo_vinculo": "especifico_de" }`.
  El convenio `{id}` es el **origen**. Por ejemplo, "este específico es `especifico_de` aquel marco".
  Devuelve `201`.
- `DELETE /agreements/{id}/links/{vinculoId}` devuelve `204`.
- Reglas: no puede vincularse consigo mismo, ni repetir un vínculo, y solo se toca si el origen está en `borrador`.

## 6. Documentos

### `POST /agreements/{id}/documents` — `multipart/form-data`

| Campo            | Valor                                                                        |
|------------------|------------------------------------------------------------------------------|
| `archivo`        | El PDF                                                                       |
| `tipo_documento` | `convenio_firmado`, `anexo`, `dictamen`, `resolucion`, `acta_pasantia`, `otro` |

El backend:
- valida `mimes:pdf|max:20480`;
- calcula `hash_sha256` con `hash_file('sha256', ...)`;
- rechaza duplicados del mismo convenio con `422`;
- guarda el archivo **fuera de `public/`** con un nombre generado;
- calcula `version` = la última versión de ese `tipo_documento` en ese convenio, más 1.

Devuelve `201` con el documento.

### `GET /documents/{id}/download`

Devuelve el PDF con `Content-Disposition` (`Storage::download(...)`). Antes chequea que el
usuario pueda ver ese convenio.

## 7. Observaciones

- `POST /agreements/{id}/observations` con `{ "observacion": "Falta la cláusula..." }`.
  Solo `admin` y `revision`. Se guarda `usuario_revisor_id = auth()->id()`. Devuelve `201`.
- `PATCH /observations/{id}` con `{ "esta_resuelta": true }`. Solo `admin` y `revision`.
  Si se agrega la columna `respuesta` (§10), el gestor podría contestar con `{ "respuesta": "..." }`.
  Esa pantalla todavía no está hecha.

## 8. Catálogos, panel y avisos

| Ruta | Método | Cuerpo / respuesta |
|------|--------|--------------------|
| `/units` | GET | `[{ id, nombre, codigo }]` |
| `/parties?q=&per_page=100` | GET | Lista de `partes` |
| `/parties` | POST | `{ nombre, cuit_cuil, tipo_personeria, email, telefono, direccion }`. El CUIT tiene formato `NN-NNNNNNNN-N` y es único |
| `/people?q=&per_page=100` | GET | Lista de `personas` |
| `/people` | POST | `{ nombre, apellido, dni, email, telefono }`. El DNI tiene 7 u 8 dígitos y es único |
| `/users` | GET / POST | Solo admin. POST: `{ nombre, email, password, rol, unidad_id, activo }` |
| `/users/{id}` | PUT | Igual que POST. `password` es opcional |
| `/alerts` | GET | Notificaciones del usuario, las más nuevas primero: `[{ id, titulo, mensaje, leida, convenio_id, created_at }]` |
| `/alerts/{id}` | PATCH | `{ "leida": true }` |

La web oculta email, teléfono y DNI al rol `consulta`. Conviene que la API tampoco los mande: para ese rol, `/people` puede devolver solo `{ id, nombre, apellido }`.

### `GET /dashboard`

Los números se calculan sobre el alcance del usuario:

```json
{
  "total": 9,
  "firmados_vigentes": 4,
  "proximos_a_vencer": 1,
  "personas_unicas": 3,
  "por_estado": { "borrador": 2, "revision": 0, "aprobado": 2, "firmado": 5, "rescindido": 0, "archivado": 0 },
  "por_tipo":   { "marco": 4, "especifico": 2, "adenda": 1, "pasantia": 2 },
  "por_unidad": [ { "unidad": "ING", "cantidad": 6 }, { "unidad": "EXACTAS", "cantidad": 2 } ],
  "por_anio":   [ { "anio": 2025, "cantidad": 3 } ],
  "plazos": [ { "...convenio con unidad...": "" } ]
}
```

Cada serie puede ir como objeto `{clave: cantidad}` o como lista. `por_anio` usa el año de
`fecha_inicio` mientras no exista `fecha_firma` (§10). `plazos` lleva los firmados vencidos o
próximos a vencer, ordenados por `fecha_fin`.

**Vigencia**, igual que en el front (`lib/dominio.js → calcularVigencia`):

| Valor | Condición |
|-------|-----------|
| `sin_vencimiento` | `fecha_fin` es NULL |
| `vencido` | `fecha_fin < hoy` |
| `proximo` | `fecha_fin - hoy <= dias_preaviso` |
| `vigente` | El resto |

## 9. Matriz de permisos que asume la web

| Acción                         | admin | gestion            | revision | consulta |
|--------------------------------|-------|--------------------|----------|----------|
| Ver convenios                  | todos | su unidad          | todos    | firmados no vencidos de su unidad |
| Crear / editar (borrador)      | sí    | su unidad          | no       | no       |
| Subir documentos               | sí    | su unidad          | en revisión (dictámenes) | no |
| Observar / aprobar / devolver / resolver observación | sí | no   | sí       | no       |
| Partes y personas (alta)       | sí    | sí                 | no       | no       |
| Usuarios                       | sí    | no                 | no       | no       |

La web oculta los botones según esta tabla, pero **quien decide es el backend**: tiene que
responder `403` aunque alguien llame a la API a mano.

## 10. Diferencias con `schema.sql` que conviene charlar

La web funciona sin estos cambios, pero el enunciado los pide:

1. **Campos de la ficha** que no están en `convenios`: `objeto`, `alcance`, `obligaciones`,
   `condiciones_rescision`, `marco_legal`, `resolucion`, `expediente`,
   `condiciones_renovacion`, `confidencialidad`, `notas` y `fecha_firma`. Pueden ser `TEXT NULL`.
   La web ya los manda y los muestra.
2. **Tipo marco de pasantía**: el ENUM `tipo` no distingue un marco de colaboración de un marco
   de pasantías. Se puede agregar `marco_pasantia` al ENUM, o una columna `subtipo`.
3. **`observaciones_revision.respuesta`** (`TEXT NULL`): para la respuesta del equipo gestor.
4. **`notificaciones.convenio_id`** (`FK NULL`): para que el aviso enlace al convenio.
5. **Revisor asignado**: la matriz habla de "asignados", pero no hay columna para eso. La web
   hoy trata a `revision` como alcance global.
6. **Seed**: Tomás Watson (`revision`) tiene `unidad_id = 1`. Si el backend filtra a los
   revisores por unidad, no va a ver los convenios de ING.
