# Sistema de Gestión de Convenios - UNLPam

Trabajo Práctico Integrador Final para las asignaturas **Programación Orientada a la Web (POW)** y **Laboratorio de Aplicaciones Móviles ** — Universidad Nacional de La Pampa (2026).

Plataforma multiplataforma institucional para la administración, firma, seguimiento, control de vencimientos y auditoría de convenios marco, específicos, adendas y pasantías.

---

## Integrantes del Equipo

- **Joaquin Cenicero** 
- **Tomas Watson**
- **Juan Ponkosky**
- **Martin Resch**

---

## Tecnologías Utilizadas

- **Backend:** PHP 8.2+ / Laravel 11 (API REST con autenticación Sanctum / JWT)
- **Base de Datos:** MySQL 8
- **Frontend Web:** Next.js + React + Tailwind CSS + Dexie.js (IndexedDB Offline)
- **Frontend Móvil:** React Native + Expo + React Navigation + SQLite/AsyncStorage

---

## Estructura del Repositorio

- [`/backend`](./backend/README.md) — API REST en Laravel y reglas de negocio.
- [`/database`](./database/README.md) — Scripts SQL, diagramas ER y datos ficticios de prueba.
- [`/web`](./web/README.md) — Aplicación web de administración en Next.js.
- [`/mobile`](./mobile/README.md) — Aplicación móvil en React Native (Expo).
- [`/docs`](./docs/README.md) — Informes técnicos, diccionario de datos, diseños en Figma y documentación API.

---

## Puesta en Marcha Rápida (Desarrollo Local)

### Requisitos Previos
- PHP >= 8.2 + Composer
- Node.js >= 18 + npm
- XAMPP / MySQL Server
- Expo Go en dispositivo físico o Emulador Android/iOS

### 1. Clonar e Iniciar el Backend (API)

cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
