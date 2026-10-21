MOBILE - Aplicación móvil (React Native)
========================================

PROPOSITO
App interna para consultar y gestionar convenios desde el celular. Usa la
MISMA API REST que la web. Requiere autenticación.

TECNOLOGIAS
- React Native con Expo
- React Navigation
- expo-secure-store (tokens)
- expo-local-authentication (biometría)
- expo-camera / expo-barcode-scanner (QR)
- expo-location (geolocalización)
- expo-notifications
- SQLite o AsyncStorage para datos sin conexión

REQUISITOS ESPECIFICOS
- Dos mecanismos de acceso como mínimo (contraseña + PIN o biometría).
- Lector QR: abre la ficha si el usuario tiene permiso. Si no reconoce un
  código en 60 segundos, cierra la lectura y muestra un mensaje claro.
  El QR NO contiene datos privados, solo una referencia segura.
- Geolocalización OPTATIVA: pedir permiso, ofrecer selección manual si se
  rechaza, SIN seguimiento continuo. Muestra bienvenida y acceso rápido a
  los convenios de la sede/unidad.
- Modo claro y oscuro con buen contraste.
- Atomic Design en al menos una sección (átomos, moléculas, organismos),
  documentado en /docs.
- Módulo simulado de "valor del sistema" (tiempo/tareas ahorradas) con los
  supuestos explicitados. No hay cobros reales.
- Notificaciones locales o push: asignación de revisión, cambio de estado,
  vencimientos y preavisos.
- Persistencia local y sincronización de pendientes.

INSTALACION
1. cd mobile
2. npm install
3. cp .env.example .env   (definir API_URL accesible desde el emulador/celular)
4. npx expo start
5. Abrir en emulador o en Expo Go

NOTA DE RED
Desde el emulador Android, localhost del equipo es 10.0.2.2.
En un celular físico usar la IP local de la PC.

ESTRUCTURA SUGERIDA
src/screens, src/navigation, src/components/{atoms,molecules,organisms},
src/services, src/storage, src/theme

NOTAS
- Probar en emulador o dispositivo real y registrar resultados en /docs.
- Datos de prueba solo ficticios.