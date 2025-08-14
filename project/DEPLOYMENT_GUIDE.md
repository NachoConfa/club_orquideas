# Guía de Despliegue - Club de las Orquídeas

## Migración de localStorage a Base de Datos

Este proyecto ha sido migrado exitosamente de localStorage a una arquitectura de base de datos MySQL con API REST.

### Cambios Realizados

1. **Backend API Completo**: 
   - Servidor Express.js con autenticación JWT
   - Base de datos MySQL con esquema completo
   - APIs REST para productos, accesorios, videos, usuarios y carrito
   - Middleware de seguridad (CORS, Helmet, Rate Limiting)

2. **Frontend Actualizado**:
   - AdminPanel migrado a API calls
   - Página de Accesorios migrada a API calls
   - Servicio API centralizado con TypeScript

### Estructura de Archivos

```
project/
├── api/                          # Backend API
│   ├── config/database.js        # Configuración de MySQL
│   ├── middleware/               # Middlewares de autenticación y validación
│   ├── routes/                   # Rutas de la API
│   ├── server.js                 # Servidor principal
│   ├── package.json             # Dependencias del backend
│   └── .env.example             # Variables de entorno ejemplo
├── database/schema.sql           # Esquema de base de datos
├── src/services/api.ts          # Cliente API para frontend
└── src/pages/AdminPanel.tsx     # Panel admin actualizado
```

## Despliegue en LatinCloud

### 1. Preparación del Servidor

#### Base de Datos MySQL
1. Crear base de datos en cPanel de LatinCloud
2. Ejecutar el script `database/schema.sql` en phpMyAdmin
3. Configurar usuario de base de datos con permisos completos

#### Servidor Node.js
1. Subir la carpeta `api/` al directorio público del hosting
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno

### 2. Configuración de Variables de Entorno

Crear archivo `.env` en el directorio `api/` con la configuración de producción:

```bash
# Copiar desde .env.production y personalizar
cp .env.production .env
```

**Variables Críticas a Configurar:**
- `DB_HOST`: Host de MySQL de LatinCloud
- `DB_NAME`: Nombre de tu base de datos
- `DB_USER`: Usuario de base de datos
- `DB_PASSWORD`: Contraseña de base de datos
- `JWT_SECRET`: Clave secreta única (generar nueva)
- `FRONTEND_URL`: Tu dominio de LatinCloud

### 3. Configuración del Frontend

Actualizar `VITE_API_URL` en el archivo `.env` del frontend:

```bash
VITE_API_URL=https://tu-dominio.latincloud.com/api
```

### 4. Iniciar el Servidor

```bash
cd api
npm start
```

### 5. Verificar Funcionamiento

- Accede a: `https://tu-dominio.com/api/health`
- Deberías ver: `{"success": true, "message": "API funcionando correctamente"}`

## Migración de Datos

### Datos Existentes en localStorage

Si tienes usuarios y productos existentes en localStorage, puedes migrarlos:

1. **Productos y Accesorios**: 
   - Usar el AdminPanel para recrear productos
   - O ejecutar script de migración personalizado

2. **Usuarios**:
   - Los usuarios deberán registrarse nuevamente
   - O migrar manualmente desde localStorage

### Script de Migración (Opcional)

```javascript
// Ejecutar en consola del navegador para extraer datos
const products = JSON.parse(localStorage.getItem('orchid-products') || '[]');
const accessories = JSON.parse(localStorage.getItem('orchid-accessories') || '[]');
const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');

console.log('Productos:', products);
console.log('Accesorios:', accessories);
console.log('Usuarios:', users);
```

## Seguridad

### Configuraciones de Seguridad Implementadas

1. **JWT Authentication**: Tokens seguros con expiración
2. **Password Hashing**: bcrypt para contraseñas
3. **Rate Limiting**: Prevención de ataques de fuerza bruta  
4. **CORS**: Configuración restrictiva de orígenes
5. **Helmet**: Headers de seguridad HTTP
6. **Input Validation**: Validación de datos de entrada

### Recomendaciones Adicionales

1. **HTTPS**: Asegurar que tu dominio use SSL
2. **Backups**: Configurar backups automáticos de la base de datos
3. **Monitoring**: Configurar logs para monitorear errores
4. **Updates**: Mantener dependencias actualizadas

## Comandos Útiles

### Desarrollo
```bash
# Iniciar API en modo desarrollo
npm run dev

# Verificar salud de la API
curl http://localhost:5000/api/health
```

### Producción
```bash
# Iniciar API en producción
npm start

# Ver logs
tail -f logs/app.log
```

## Troubleshooting

### Problemas Comunes

1. **Error de Conexión a Base de Datos**
   - Verificar credenciales en `.env`
   - Confirmar que la base de datos existe
   - Verificar que las tablas fueron creadas

2. **CORS Errors**
   - Verificar `FRONTEND_URL` en `.env`
   - Confirmar que el dominio es correcto

3. **JWT Errors**
   - Verificar que `JWT_SECRET` esté configurado
   - Regenerar tokens si es necesario

### Logs y Debug

Los logs se guardan en:
- Desarrollo: Consola
- Producción: Archivos de log (configurar según hosting)

## Contacto y Soporte

Si necesitas ayuda con el despliegue, el sistema está completamente documentado y listo para producción.

### Estado de Migración
- ✅ Backend API completo
- ✅ Base de datos MySQL
- ✅ AdminPanel migrado
- ✅ Página de Accesorios migrada
- ✅ Sistema de autenticación
- ✅ Variables de entorno configuradas
- ⏳ Migración completa del frontend (en progreso)
- ⏳ Sistema de autenticación frontend

La migración está prácticamente completa y lista para despliegue en LatinCloud.