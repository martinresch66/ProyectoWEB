# API simulada de la app móvil (Node + Express)

Responde con **las mismas rutas y el mismo JSON** que pide [`web/CONTRATO-API.md`](../../web/CONTRATO-API.md)
y con los datos de [`database/seeds.sql`](../../database/seeds.sql). Así la app móvil se puede desarrollar y mostrar
sin depender del backend de Laravel, y para pasar a Laravel solo se cambia la URL (`EXPO_PUBLIC_API_URL`).

Además implementa lo que solo necesita el celular (MFA, refresh token, huella). Esas rutas no están en el contrato:
están listadas en [`mobile/README.md`](../README.md#qué-necesita-la-app-que-no-está-en-el-contrato-ni-en-la-base) para charlarlas con el backend.

## Cómo correrla

Desde `mobile/`:

```bash
npm install --prefix api
```

```bash
npm run api
```

(o, desde `mobile/api/`, `npm install` y `npm run dev`). Se reinicia sola al guardar un archivo y muestra dónde escucha:

```
API de convenios escuchando en el puerto 4000
  Local:   http://localhost:4000/api/health
  En red:  http://192.168.1.5:4000/api/health
```

Abrir la dirección **En red** en el navegador del celular: tiene que responder `{"status":"ok"}`.
La primera vez, Windows pregunta si deja a Node.js usar la red: aceptar para **redes privadas**.

Usa el puerto **4000** para no chocar con Laravel (8000) ni con la web (3000).

## Usuarios de prueba

Los del seed, todos con la contraseña **`password123`**: `admin@`, `gestion.ing@`, `revision@` y `consulta.exactas@unlpam.edu.ar`.
El código MFA se "envía" de forma simulada: aparece en la consola de la API y la app lo muestra como notificación.

## Endpoints

**Contrato con la web** (iguales a `CONTRATO-API.md`):

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API |
| `POST` | `/api/auth/login` | `{ email, password }` → `{ token, user }` (la web no usa MFA) |
| `GET` | `/api/auth/me` 🔒 | El objeto `user` (con `rol`, `unidad_id` y `unidad`) |
| `POST` | `/api/auth/logout` 🔒 | `204`. Revoca el token (y el `refresh_token` si se manda) |
| `GET` | `/api/agreements` 🔒 | Paginador. Filtros: `q`, `tipo`, `estado`, `unidad_id`, `vigencia`, `desde`, `hasta`, `page`, `per_page` |
| `GET` | `/api/agreements/{id}` 🔒 | Ficha con `unidad`, `creador`, `partes` (con `pivot`), `personas`, `detalle_pasantia`, `vinculos_origen`, `vinculos_destino`, `documentos`, `transiciones`, `observaciones` |
| `GET` | `/api/units` 🔒 | `[{ id, nombre, codigo }]` |
| `GET` | `/api/alerts` 🔒 | Avisos del usuario, los más nuevos primero |
| `PATCH` | `/api/alerts/{id}` 🔒 | `{ "leida": true }` |

**Alcance por rol** (lo decide la API, como pide el contrato): `admin` y `revision` ven todo, `gestion` solo su unidad y
`consulta` solo los firmados no vencidos de su unidad. Un convenio fuera del alcance responde `404`.

**Solo app móvil:**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/mobile/login` | `{ email, password }` → `{ mfa_token, canales }` |
| `POST` | `/api/auth/mobile/mfa/send` | `{ mfa_token, canal }` (`email`, `sms`, `push`) → código de 6 dígitos (vence en 5 min) |
| `POST` | `/api/auth/mobile/mfa/verify` | `{ mfa_token, codigo, device_id }` → `{ token, refresh_token, user }` |
| `POST` | `/api/auth/mobile/refresh` | `{ refresh_token }` → sesión nueva; el refresh token anterior deja de servir (rotación) |
| `POST` | `/api/auth/mobile/biometric/enable` 🔒 | `{ device_id, device_name }` → `{ device_token }` |
| `POST` | `/api/auth/mobile/biometric/login` | `{ device_id, device_token }` → `{ token, refresh_token, user }` |
| `POST` | `/api/auth/mobile/biometric/disable` 🔒 | `{ device_id }` → `204` |

🔒 = requiere `Authorization: Bearer <token>`.

**Errores** con el formato de Laravel (§2 del contrato): `{ "message": "..." }`, y en los `422` también
`{ "errors": { "campo": ["..."] } }`. `401` token ausente, vencido o revocado; `404` no existe o está fuera del alcance.

## Seguridad

- Contraseñas con **scrypt** + salt. Refresh tokens, tokens de huella y códigos MFA guardados como **hash SHA-256**.
- Token de acceso (JWT, 1 hora) con identificador propio para poder **revocarlo** al cerrar sesión.
- Bloqueo de 5 minutos después de 5 contraseñas incorrectas; MFA con 5 intentos y reenvío cada 30 s.
- Mismo mensaje si el email no existe o la contraseña está mal (no revela qué usuarios existen).
- Las sesiones se guardan en `api/.data/sesiones.json` (no se sube a Git) para no perderlas al reiniciar.

## Estructura (capas)

```
src/
├── server.js · app.js
├── routes/         → URLs (auth, agreements, units, alerts)
├── controllers/    → leen la request y devuelven la respuesta
├── services/       → reglas de negocio: alcance por rol, filtros, paginación, MFA
├── domain/         → estados, tipos y cálculo de vigencia (igual que la web)
├── repositories/   → único acceso a los datos; arman el JSON con la forma de Laravel
├── data/
│   ├── seed.js     → copia exacta de database/seeds.sql
│   ├── extra.js    → convenios 6–14 y teléfonos, solo para la app
│   └── db.js       → junta todo en "tablas" en memoria
├── middlewares/    → logs, errores y requireAuth
└── utils/
```

Los cambios que se hagan con la API simulada viven en memoria: al reiniciarla vuelve a los datos del seed.
