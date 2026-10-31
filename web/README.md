WEB - Cliente de gestión (Next.js / React)
==========================================

Plataforma web interna para administrar los convenios de la UNLPam. Consume la API REST del
backend (Laravel). Es de uso privado y requiere autenticación.

Mientras el backend no esté listo, la web funciona en **modo simulado**: un servidor falso
dentro del navegador con los datos de `database/seeds.sql` y las mismas reglas de negocio.

TECNOLOGÍAS
-----------
- Next.js 16 (App Router) + React 19, en JavaScript
- Tailwind CSS 4
- Dexie (IndexedDB), para trabajar sin conexión
- Recharts, para el panel

INSTALACIÓN
-----------
```bash
cd web
npm install
cp .env.example .env.local     # por defecto arranca en modo simulado
npm run dev                    # http://localhost:3000
```

Build de producción: `npm run build && npm start`
Lint: `npm run lint`

USUARIOS DE PRUEBA (modo simulado; contraseña `password123`)
-------------------------------------------------------------
| Email                          | Rol      | Alcance                    |
|--------------------------------|----------|----------------------------|
| admin@unlpam.edu.ar            | admin    | todo                       |
| gestion.ing@unlpam.edu.ar      | gestion  | Facultad de Ingeniería     |
| revision@unlpam.edu.ar         | revision | todos (revisión)           |
| consulta.exactas@unlpam.edu.ar | consulta | firmados de Exactas        |

Los cambios hechos en modo simulado se guardan en el navegador (localStorage). El enlace
"reiniciar" de la barra superior los borra y vuelve a los datos del seed.

CONECTAR CON EL BACKEND
-----------------------
1. Levantar Laravel (por ejemplo, `php artisan serve` en http://localhost:8000).
2. En `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_USE_MOCK=false
   ```
3. Reiniciar `npm run dev`. Las variables `NEXT_PUBLIC_*` se leen al arrancar.
4. Si algo no coincide con lo que arma el backend:
   - Rutas, métodos y nombres de parámetros: `lib/api/endpoints.js`.
   - Forma del JSON que llega: `lib/api/adaptadores.js`.
   - El resto de la web no se toca.

Qué espera la web de cada endpoint (JSON de ejemplo, errores, permisos y transiciones):
**[CONTRATO-API.md](./CONTRATO-API.md)**.

PANTALLAS
---------
| Ruta                       | Qué hace                                                                 |
|----------------------------|--------------------------------------------------------------------------|
| `/login`                   | Ingreso                                                                  |
| `/`                        | Panel: indicadores, gráficos por estado, tipo, unidad y año, y plazos    |
| `/convenios`               | Registro con búsqueda, filtros (tipo, estado, unidad, vigencia, fechas), paginación y CSV |
| `/convenios/nuevo`         | Alta con validación. Para pasantías pide estudiante, tutores y horas. Permite elegir un antecedente |
| `/convenios/[id]`          | Ficha con pestañas: datos, partes y personas, pasantía, vínculos, documentos, observaciones, historial. Incluye los cambios de estado |
| `/convenios/[id]/editar`   | Edición de borradores, con resolución de conflictos (409) campo por campo |
| `/revision`                | Bandeja del revisor: observar, aprobar, devolver                         |
| `/plazos`                  | Próximos a vencer, vencidos y "sin vencimiento registrado"               |
| `/avisos`                  | Notificaciones                                                           |
| `/partes`, `/personas`     | Catálogos                                                                |
| `/usuarios`                | Administración de usuarios (solo admin)                                  |
| `/pendientes`              | Cola de cambios hechos sin conexión y conflictos                         |

TRABAJO SIN CONEXIÓN Y SINCRONIZACIÓN
-------------------------------------
- IndexedDB (`lib/db/offline.js`) guarda las fichas y listados consultados, y una cola de
  operaciones pendientes.
- Si se crea o edita un convenio sin conexión, el cambio queda en la cola. La barra superior
  muestra "Sin conexión" y la cantidad de pendientes.
- Al volver la conexión, la cola se envía sola (`lib/db/sincronizacion.js`). Si el servidor
  responde 409, el pendiente pasa a "conflicto" y en `/pendientes` el usuario elige, campo por
  campo, qué valor conservar.

ACCESIBILIDAD (WCAG 2.1)
------------------------
- Cada control tiene su label.
- El foco es visible y se puede navegar todo con teclado. Hay un enlace "Saltar al contenido".
- Los errores aparecen junto al campo y en un resumen con enlaces a cada uno.
- Los diálogos son `<dialog>` nativos y las pestañas usan los roles ARIA.
- Cada gráfico tiene una tabla equivalente para lectores de pantalla.
- Cada página tiene su propio `<title>`.
- El diseño se adapta a escritorio, tableta y celular.

ESTRUCTURA
----------
```
app/
  login/                 ingreso
  (app)/                 pantallas con sesión (comparten barra lateral y superior)
components/
  ui/                    botones, insignias, campos, diálogo, pestañas
  layout/                estructura general
  convenios/             formulario, tablas, documentos, vínculos, observaciones, estados
  panel/                 gráfico de barras
lib/
  api/
    config.js            URL base y modo simulado
    endpoints.js         rutas del backend (único lugar)
    cliente.js           fetch, token Bearer, errores
    errores.js           un tipo de error por código HTTP (401, 403, 404, 409, 422)
    adaptadores.js       JSON de Laravel → forma que usa la web
    servicios.js         funciones que llaman las pantallas
    mock/                servidor simulado + datos del seed
  db/                    Dexie: copia local y cola de pendientes
  auth/sesion.js         token en sessionStorage
  dominio.js             estados, transiciones, tipos, cálculo de vigencia
  permisos.js            qué ve y qué puede hacer cada rol (el backend valida igual)
  csv.js                 armado de CSV con celdas neutralizadas
hooks/useDatos.js        carga de datos con estados de carga y error
```

NOTAS
-----
- El token se guarda en `sessionStorage`: se borra al cerrar la pestaña y al cerrar sesión.
  Al cerrar sesión también se borra la copia local de IndexedDB.
- Los permisos de la web solo ocultan botones. **El backend tiene que validar todo.**
- Todos los datos de prueba son ficticios.
- No subir `.env.local` al repo; ya está en `.gitignore`.
