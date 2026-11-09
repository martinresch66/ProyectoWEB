# Arquitectura de la app móvil

La parte móvil tiene dos piezas: la **app** (React Native + Expo) y una **API simulada** (Node + Express, en `mobile/api/`)
que responde igual que el backend de Laravel según `web/CONTRATO-API.md`. La app puede hablar con cualquiera de las dos
cambiando solo la URL.

Las dos están organizadas en **capas**: cada capa tiene una sola responsabilidad y solo habla con la capa de abajo.
Así se puede cambiar una capa (por ejemplo, pasar de la API simulada al backend real) sin tocar las demás.

## Vista general

```mermaid
flowchart LR
    subgraph Celular["📱 App móvil (Expo)"]
        UI["Presentación<br/>pantallas + componentes"]
        Logica["Lógica de UI<br/>hooks + contextos"]
        Servicios["Servicios<br/>(acceso a la API)"]
        UI --> Logica --> Servicios
    end

    subgraph PC["🖥️ API simulada (Node + Express) o backend Laravel"]
        Rutas["Rutas"]
        Controladores["Controladores"]
        ServiciosAPI["Servicios<br/>(reglas de negocio)"]
        Repos["Repositorios<br/>(acceso a datos)"]
        Rutas --> Controladores --> ServiciosAPI --> Repos
    end

    Datos[("Datos<br/>simulada: seeds.sql en memoria<br/>Laravel: base de datos")]

    Servicios -- "HTTP / JSON (CONTRATO-API.md)<br/>Authorization: Bearer token" --> Rutas
    Repos --> Datos
```

## App — capas

```mermaid
flowchart TB
    subgraph Presentacion["Capa de presentación"]
        Paginas["src/app/<br/>Páginas (rutas de Expo Router)"]
        Componentes["src/components/<br/>Atomic Design: átomos → moléculas → organismos → templates"]
        Tema["src/theme/<br/>colores de la web, Inter, modo claro/oscuro"]
    end

    subgraph LogicaUI["Capa de lógica de UI"]
        Hooks["src/hooks/<br/>useAsync"]
        Contextos["src/context/<br/>AuthContext (sesión)"]
    end

    subgraph DatosApp["Capa de datos"]
        ServiciosApp["src/services/<br/>convenios.service, auth.service, storage"]
        Adaptadores["src/services/api/<br/>endpoints.ts (rutas) · adaptadores.ts (JSON)"]
        Cliente["src/services/api/client.ts<br/>cliente HTTP único"]
    end

    Modelos["src/models/ + src/domain/<br/>campos de schema.sql, estados y vigencia"]

    Paginas --> Componentes
    Paginas --> Hooks
    Componentes --> Tema
    Hooks --> ServiciosApp
    ServiciosApp --> Adaptadores --> Cliente
    Paginas -.usa.-> Modelos
    ServiciosApp -.usa.-> Modelos
```

| Carpeta | Responsabilidad |
|---|---|
| `src/app/` | **Páginas.** Cada archivo es una pantalla (Expo Router). Arman la pantalla con componentes y piden datos con hooks. No llaman a la API directamente. |
| `src/components/atoms/` | **Átomos:** piezas mínimas (texto, botón, ícono, badge, avatar, input, card). |
| `src/components/molecules/` | **Moléculas:** combinan átomos (tarjeta de convenio, insignias de estado y vigencia, campo con etiqueta, buscador, selector). |
| `src/components/organisms/` | **Organismos:** secciones completas (header con buscador, listado de convenios). |
| `src/components/templates/` | **Templates:** estructura base de una pantalla (`Screen`, `AuthScreen`). |
| `src/theme/` | Colores claro/oscuro (los de la web), tipografía Inter, tamaños de letra, espaciados. |
| `src/hooks/` | Lógica reutilizable de UI (carga de datos, estados de carga y error). |
| `src/context/` | Estado global: sesión del usuario (`AuthContext`). |
| `src/services/` | **Acceso a datos.** Única capa que conoce la API y el almacenamiento local. `api/endpoints.ts` tiene todas las rutas y `api/adaptadores.ts` normaliza el JSON (igual que `web/lib/api/`). |
| `src/models/` | Tipos con los mismos campos que `database/schema.sql` (convenio, parte, persona, documento, transición…). |
| `src/domain/` | Estados, tipos, roles y cálculo de vigencia: los mismos textos y reglas que `web/lib/dominio.js`. |
| `src/config/` | Configuración (URL de la API). |
| `src/utils/` | Funciones auxiliares (formato de fechas). |

## Atomic Design

```mermaid
flowchart LR
    A["Átomos<br/>AppText · Button · Icon · Badge<br/>Avatar · Card · Input · IconButton"]
    M["Moléculas<br/>EstadoBadge · VigenciaBadge · ConvenioCard<br/>FormField · SearchBar · SegmentedControl<br/>ListItem · SectionHeader · EmptyState"]
    O["Organismos<br/>AppHeader · AuthHeader · ConvenioList"]
    T["Templates<br/>Screen · AuthScreen"]
    P["Páginas<br/>Inicio · Buscar · Firmar · Perfil<br/>Ficha del convenio · …"]
    A --> M --> O --> T --> P
```

Ejemplo concreto: la página **Inicio** usa el template `Screen` y el organismo `ConvenioList`.
`ConvenioList` usa la molécula `ConvenioCard`, que combina los átomos `Card`, `AppText` e `Icon` con las moléculas
`EstadoBadge` y `VigenciaBadge`, que a su vez son un `Badge` (átomo).

En la app hay una pantalla **Perfil → Componentes** que muestra todo el catálogo.

## API simulada — capas

| Carpeta | Responsabilidad |
|---|---|
| `src/routes/` | Define las URLs del contrato (`GET /api/agreements`, …) y a qué controlador van. |
| `src/controllers/` | Lee la request (parámetros, query, body, usuario) y devuelve la respuesta HTTP. |
| `src/services/` | Reglas de negocio: alcance por rol, filtros, paginación, MFA. No sabe de HTTP. |
| `src/domain/` | Estados, tipos y vigencia (igual que la web). |
| `src/repositories/` | Acceso a los datos. Arman el JSON con la forma que devolvería Laravel. |
| `src/data/` | `seed.js` (copia de `database/seeds.sql`), `extra.js` (datos solo para la app) y `db.js`. |
| `src/middlewares/` | Logs, errores con el formato de Laravel y `requireAuth` (valida el token). |
| `src/utils/` | Auxiliares (errores HTTP, criptografía, normalización de texto). |

## Flujo de una búsqueda (ejemplo)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as Página Buscar
    participant H as useAsync (hook)
    participant S as conveniosService (app)
    participant R as Ruta /api/agreements
    participant C as Controlador
    participant SV as Servicio (API)
    participant RP as Repositorio

    U->>P: escribe "smartcity" en el header
    P->>H: pide los datos con q="smartcity"
    H->>S: listar({ q: "smartcity" })
    S->>R: GET /api/agreements?q=smartcity
    R->>C: listar(req)
    C->>SV: listar(usuario, { q })
    SV->>RP: findAll()
    RP-->>SV: convenios
    SV-->>C: solo los de su alcance, filtrados y paginados
    C-->>S: 200 JSON (paginador de Laravel)
    S-->>H: Paginado<Convenio> (pasado por adaptadores.ts)
    H-->>P: data / loading / error
    P-->>U: muestra los resultados
```

## Autenticación

Login en dos pasos (contraseña + código MFA) con **tokens**: un token de acceso de corta duración y un refresh token
para renovarlo. Son las rutas `/auth/mobile/*`, que la web no usa (la web entra con `POST /auth/login`, que devuelve `{ token, user }`).

```mermaid
sequenceDiagram
    actor U as Usuario
    participant App as App (AuthContext)
    participant SS as SecureStore (celular)
    participant API as API /api/auth/mobile

    U->>App: email + contraseña
    App->>API: POST /login
    API-->>App: mfa_token + canales (email, sms, push)
    U->>App: elige canal
    App->>API: POST /mfa/send
    API-->>App: código "enviado" (simulado)
    App-->>U: notificación con el código
    U->>App: ingresa el código
    App->>API: POST /mfa/verify
    API-->>App: token (1 h) + refresh_token (30 días) + user (rol y unidad)
    App->>SS: guarda la sesión encriptada

    Note over App,API: Cada pedido lleva "Authorization: Bearer token"
    App->>API: GET /api/agreements (token vencido)
    API-->>App: 401
    App->>API: POST /refresh
    API-->>App: token nuevo + refresh token nuevo (rotación)
    App->>API: reintenta GET /api/agreements
    API-->>App: 200
```

**Ingreso con huella:** después del primer login, la app ofrece activarlo. La API entrega un *token de dispositivo* que se
guarda en SecureStore. Para ingresar, el celular valida la huella (la huella nunca sale del celular) y recién ahí envía ese
token a `POST /auth/mobile/biometric/login`.

**Sesión persistente y offline:** al abrir la app, la sesión se lee de SecureStore sin usar la red, por eso no se vuelve a
pedir el login (y permite usar la app sin conexión). Si no hay conexión, la sesión no se cierra; solo se cierra si la API
rechaza el refresh token.

**Alcance por rol:** la app no filtra convenios por su cuenta: la API devuelve solo los que el rol y la unidad del usuario
permiten (§4 del contrato) y responde `404` si se pide uno fuera del alcance.

**Rutas protegidas:** el layout raíz usa `Stack.Protected`. Sin sesión solo existen `login` y `verificacion`; con sesión, el resto de la app.
