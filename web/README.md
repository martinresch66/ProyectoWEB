WEB - Cliente de gestión (Next.js / React)
==========================================

PROPOSITO
Plataforma web interna para administrar convenios de la UNLPam. Consume la
API REST del backend. Uso privado: requiere autenticación.

TECNOLOGIAS
- Next.js + React
- Tailwind CSS (o librería de UI elegida)
- Dexie (IndexedDB) para trabajo sin conexión
- Recharts o Chart.js para el dashboard

PANTALLAS A IMPLEMENTAR
- Login
- Registro de convenios (búsqueda, filtros por tipo/estado/unidad/fechas,
  paginación)
- Ficha de detalle (tipo, unidad, partes, estado, vigencia, antecedentes,
  documentos)
- Alta y edición con validación
- Subida de documentos y versiones
- Panel de revisión (aprobar o devolver con observaciones)
- Dashboard de estadísticas
- Alertas y plazos (próximos a vencer / vencidos / "sin vencimiento
  registrado")
- Exportación CSV

OFFLINE Y SINCRONIZACION
- IndexedDB guarda fichas consultadas y una cola de operaciones pendientes.
- Al reconectar se envía la cola; ante un 409 se muestra el conflicto y el
  usuario decide qué versión conservar.
- Indicador visible de "sin conexión / pendiente de sincronizar".

ACCESIBILIDAD (WCAG 2.1)
- Labels asociados a controles, foco visible, contraste suficiente,
  navegación por teclado, mensajes de error comprensibles.
- Interfaz adaptable a escritorio, tableta y móvil.

INSTALACION
1. cd web
2. npm install
3. cp .env.example .env.local   (definir NEXT_PUBLIC_API_URL)
4. npm run dev        (http://localhost:3000)

BUILD
npm run build && npm start

ESTRUCTURA SUGERIDA
app/ (rutas), components/ (ui, forms, tables), lib/ (api, db, auth),
hooks/, types/

NOTAS
- No guardar tokens ni datos sensibles sin necesidad.
- Todo dato de prueba debe ser ficticio.