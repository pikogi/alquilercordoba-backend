# Backend - Alquiler Córdoba

Backend API desarrollado con Node.js, Express y SQLite.

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` en esta carpeta:

```env
PORT=3001
JWT_SECRET=tu-clave-secreta-super-segura-cambiala-en-produccion
FRONTEND_URL=http://localhost:5175
```

## Ejecutar

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

## Estructura

- `src/server.js` - Servidor principal
- `src/routes/` - Rutas de la API
  - `auth.js` - Autenticación (login, register, me)
  - `properties.js` - Gestión de propiedades
  - `availability.js` - Gestión de disponibilidad
  - `upload.js` - Subida de archivos
- `src/database/init.js` - Inicialización de base de datos
- `src/middleware/auth.js` - Middleware de autenticación
- `src/utils/jwt.js` - Utilidades JWT

## Base de Datos

La base de datos SQLite se crea automáticamente en `database.sqlite` cuando se inicia el servidor por primera vez.

## Usuario por Defecto

Se crea un usuario administrador por defecto:
- Email: `admin@example.com`
- Password: `admin123`

**¡IMPORTANTE!** Cambia esta contraseña en producción.

## Endpoints

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual (requiere autenticación)

- `GET /api/properties` - Listar todas las propiedades
- `GET /api/properties/filter` - Filtrar propiedades
- `GET /api/properties/:id` - Obtener propiedad por ID
- `POST /api/properties` - Crear propiedad (requiere autenticación)
- `PUT /api/properties/:id` - Actualizar propiedad (requiere autenticación)

- `GET /api/availability` - Listar disponibilidad
- `GET /api/availability/filter` - Filtrar disponibilidad
- `POST /api/availability` - Crear bloqueo de fecha (requiere autenticación)
- `DELETE /api/availability/:id` - Eliminar bloqueo (requiere autenticación)

- `POST /api/upload` - Subir archivo (requiere autenticación)



