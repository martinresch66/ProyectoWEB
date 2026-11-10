# MOBILE — App móvil de convenios (React Native + Expo)

App para que las autoridades de la UNLPam consulten, firmen y sigan los convenios desde el celular.
Usa **la misma API REST que la web** (rutas y JSON de [`web/CONTRATO-API.md`](../web/CONTRATO-API.md))
y los mismos datos de prueba de [`database/seeds.sql`](../database/seeds.sql).

Esta carpeta tiene dos proyectos:

| Carpeta | Qué es |
|---|---|
| `mobile/` (raíz) | La app (Expo SDK 58, React Native 0.88, TypeScript, Expo Router). |
| `mobile/api/` | **API simulada** en Node + Express con las mismas rutas del contrato. Sirve para desarrollar y mostrar la app mientras el backend de Laravel no tenga todo. Agrega lo que solo usa el celular (MFA, huella, refresh token). |

## Cómo correrla

Hacen falta **dos terminales**, las dos paradas en la carpeta `mobile/` (`cd mobile` desde la raíz del repo).
Si se corren desde la raíz `ProyectoWEB/`, npm crea una carpeta `api/` vacía afuera de `mobile/` y la API no arranca.

**Terminal 1 — API simulada** (la primera vez, `npm install --prefix api`):

```bash
npm run api
```

Muestra las direcciones donde escucha, por ejemplo `http://192.168.1.5:4000/api/health`.

**Terminal 2 — App** (la primera vez, `npm install`):

```bash
npx expo start
```

Escanear el QR con **Expo Go**. El celular y la PC tienen que estar en la **misma red Wi-Fi**.
La app busca la API sola en la misma PC que corre Expo, puerto 4000.

### Usuarios de prueba (los de `database/seeds.sql`, contraseña `1234`)

Con la API simulada la contraseña es `1234` para entrar rápido. Contra el backend de Laravel es `password123` (la de `seeds.sql`).

| Email | Rol | Qué ve |
|---|---|---|
| admin@unlpam.edu.ar | admin | todo |
| gestion.ing@unlpam.edu.ar | gestion | convenios de Ingeniería |
| revision@unlpam.edu.ar | revision | todos |
| consulta.exactas@unlpam.edu.ar | consulta | firmados no vencidos de Exactas |

En la pantalla de login (solo en desarrollo) hay un cuadro para completarlos con un toque.
Después de la contraseña se pide un **código de verificación**: se elige mail, SMS o push y el código
llega como notificación simulada (también se ve en la pantalla y en la consola de la API).

### Usar el backend de Laravel en lugar de la API simulada

Crear `mobile/.env` (copiando `.env.example`) con la URL del backend, siempre terminada en `/api`, y reiniciar con `npx expo start --clear`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api
```

Laravel tiene que correr con `php artisan serve --host 0.0.0.0` para que el celular llegue. Ojo: el login de la app
usa las rutas extra de la sección siguiente; hasta que el backend las tenga, la app solo funciona con la API simulada.

## Qué necesita la app que no está en el contrato ni en la base

La app no toca `backend/`, `web/` ni `database/`. Esto es lo que habría que **charlar con quien arma el backend**
para que la app funcione contra Laravel (la API simulada ya lo implementa así):

**Rutas extra (todas bajo `/api/auth/mobile/`)**

| Ruta | Para qué |
|---|---|
| `POST /auth/mobile/login` `{ email, password }` → `{ mfa_token, canales: [{ canal, destino }] }` | Paso 1 del login con verificación en dos pasos (el enunciado de móviles pide MFA). |
| `POST /auth/mobile/mfa/send` `{ mfa_token, canal }` → `{ canal, destino, vence_en, reenviar_en_segundos }` | Envía el código de 6 dígitos por `email`, `sms` o `push`. |
| `POST /auth/mobile/mfa/verify` `{ mfa_token, codigo, device_id }` → `{ token, refresh_token, user }` | Verifica el código y abre la sesión. `user` es el mismo objeto de `/auth/me`. |
| `POST /auth/mobile/refresh` `{ refresh_token }` → igual que el anterior | Renueva la sesión sin pedir la contraseña ("una vez logueado no se pide más"). Rota el refresh token. |
| `POST /auth/mobile/biometric/enable` (con token) `{ device_id, device_name }` → `{ device_token }` | Activa el ingreso con huella en ese celular. |
| `POST /auth/mobile/biometric/login` `{ device_id, device_token }` → `{ token, refresh_token, user }` | Ingreso con huella (la huella se valida en el celular; acá se valida el token del dispositivo). |
| `POST /auth/mobile/biometric/disable` (con token) `{ device_id }` → `204` | Desactiva la huella en ese celular. |

`POST /auth/logout` acepta además `{ refresh_token }` en el cuerpo, para invalidarlo.

**Datos que hoy no tiene `database/schema.sql`**

1. `usuarios.telefono` (`VARCHAR(50) NULL`): para mandar el código MFA por SMS. Sin teléfono, la app ofrece solo mail y push.
2. Tabla de **refresh tokens** (`usuario_id`, `token_hash`, `device_id`, `vence_en`): Sanctum no los tiene.
3. Tabla de **dispositivos con huella** (`usuario_id`, `device_id`, `device_name`, `token_hash`).
4. Desafíos MFA (`usuario_id`, `codigo_hash`, `canal`, `intentos`, `vence_en`): puede ser caché de Laravel en lugar de tabla.

Más adelante (etapas siguientes) van a hacer falta también: firma de convenios con fecha, hora y ubicación
(latitud/longitud) e imagen de la firma manuscrita, comentarios entre usuarios, identidad registrada (firma, rostro),
token de notificaciones push por dispositivo y `notificaciones.convenio_id` (ya propuesto en el §10 del contrato).
Se van a ir sumando a esta lista.

**Datos de ejemplo extra:** el seed tiene 5 convenios y ninguno "aprobado" (listo para firmar), así que la API simulada
agrega los convenios 6 a 14 en [`api/src/data/extra.js`](api/src/data/extra.js). El seed se copia sin cambios en
[`api/src/data/seed.js`](api/src/data/seed.js).

## Qué hay hecho

| | |
|---|---|
| **Login** | Email y contraseña, verificación en dos pasos (mail / SMS / push simulados), ingreso con huella, la sesión queda guardada (no se pide login otra vez), cierre de sesión. |
| **Autenticación con tokens** | Token Bearer en cada pedido; si vence, la app lo renueva sola con el refresh token. Sesión guardada encriptada (SecureStore). |
| **Inicio** | Saludo con rol y unidad, listado de convenios que el backend devuelve según el rol (los boxes de resumen son la próxima etapa). |
| **Buscador** | En el header y en su pestaña (busca en código, título y resumen). |
| **Firmar** | Convenios en estado `aprobado` (en la web, aprobado → firmado es "Registrar firma"). |
| **Ficha del convenio** | Estado, tipo y vigencia (mismos colores que la web), resumen, unidad, fechas, partes, personas, pasantía, convenios vinculados (padre/hijo), documentos, historial y observaciones sin resolver. |
| **Mi Perfil** | Datos del usuario, modo claro/oscuro, tamaño de letra (chica / mediana / grande, en toda la app), huella y cerrar sesión. |
| **Diseño** | Colores, tipografía (Inter) e insignias iguales a la web. Atomic Design en `src/components/` (catálogo en Perfil → Componentes). |

## Requisitos de la app (POW)

- Dos mecanismos de acceso como mínimo (contraseña + PIN o biometría). ✅ contraseña + MFA + huella
- Lector QR: abre la ficha si el usuario tiene permiso. Si no reconoce un código en 60 segundos, cierra la lectura y muestra un mensaje claro. El QR no contiene datos privados, solo una referencia segura.
- Geolocalización optativa: pedir permiso, ofrecer selección manual si se rechaza, sin seguimiento continuo. Bienvenida y acceso rápido a los convenios de la sede/unidad.
- Modo claro y oscuro con buen contraste. ✅
- Atomic Design en al menos una sección, documentado en `/docs`. ✅ ([docs/arquitectura.md](docs/arquitectura.md))
- Módulo simulado de "valor del sistema" (tiempo/tareas ahorradas) con los supuestos explicitados.
- Notificaciones locales o push: asignación de revisión, cambio de estado, vencimientos y preavisos.
- Persistencia local y sincronización de pendientes.

## Estructura

```
mobile/
├── api/                    → API simulada (Node + Express), ver api/README.md
├── docs/arquitectura.md    → capas, Atomic Design y diagramas
└── src/
    ├── app/                → páginas (cada archivo es una pantalla, Expo Router)
    │   ├── _layout.tsx     → navegación raíz, fuentes, tema, sesión y rutas protegidas
    │   ├── login.tsx · verificacion.tsx · activar-huella.tsx
    │   ├── (tabs)/         → Inicio, Buscar, Firmar, Perfil
    │   └── convenio/[id]   → ficha del convenio
    ├── components/         → Atomic Design: atoms/ molecules/ organisms/ templates/
    ├── context/            → AuthContext (sesión, MFA, huella)
    ├── domain/dominio.ts   → estados, tipos, roles y vigencia (igual que web/lib/dominio.js)
    ├── models/             → tipos con los campos de schema.sql (snake_case)
    ├── services/
    │   ├── api/endpoints.ts    → ÚNICO lugar con las rutas de la API
    │   ├── api/adaptadores.ts  → JSON de la API → forma que usa la app
    │   ├── api/client.ts       → fetch, token Bearer, renovación y errores
    │   └── …                   → convenios, sesión, almacenamiento seguro, biometría, notificaciones
    ├── theme/              → colores de la web (claro/oscuro), Inter, tamaños de letra
    ├── hooks/ · config/ · utils/
```

**Reglas:** las pantallas no llaman a `fetch` (usan `src/services/`); si cambia una ruta se toca `endpoints.ts` y si cambia
la forma del JSON, `adaptadores.ts`. No usar colores ni tamaños sueltos: siempre `useAppTheme()` y `AppText`.

## Problemas comunes

- **`Unknown command: "expo"`**: se escribió `npm expo start`; es `npx expo start`.
- **"No pudimos cargar los convenios"**: la app no llega a la API. Revisar que `npm run api` esté corriendo; abrir desde el
  navegador del celular la dirección "En red" que muestra la API (`http://IP:4000/api/health`). Si no abre, permitir Node.js
  en el Firewall de Windows (redes privadas) o revisar que estén en la misma red. Si la PC tiene varias placas de red
  (VirtualBox, VPN) o se usa `--tunnel`, crear `mobile/.env` con la IP correcta.
- **Expo Go no conecta con la PC**: misma red Wi-Fi, o `npx expo start --tunnel` (en ese caso también hace falta `mobile/.env`).
- **Vulnerabilidades al hacer `npm install`**: no es un error. **No ejecutar `npm audit fix --force`** (baja la versión de Expo).

## Comandos

```bash
npx expo install <paquete>   # instalar paquetes (elige la versión compatible con Expo)
npx expo start               # servidor de desarrollo
npm run api                  # API simulada
npx expo lint                # ESLint
npx tsc --noEmit             # chequeo de tipos
npx expo-doctor              # diagnóstico de dependencias
```
