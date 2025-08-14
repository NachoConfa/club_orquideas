# 🌺 Club de Las Orquídeas - Backend

Backend con integración completa de **MercadoPago** para suscripciones premium.

## 🚀 Instalación y Configuración

### 1. **Instalar Dependencias**
```bash
# Instalar dependencias del backend
npm install express cors mercadopago dotenv nodemon
```

### 2. **Configurar Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales reales
nano .env
```

### 3. **Obtener Credenciales de MercadoPago**

#### **Para Pruebas (TEST):**
1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Crea una aplicación
3. Copia las credenciales de **TEST**:
   - `MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx`
   - `MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx`

#### **Para Producción (PROD):**
1. Completa la verificación de tu cuenta
2. Copia las credenciales de **PRODUCCIÓN**:
   - `MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx`
   - `MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx`

### 4. **Crear Plan de Suscripción**
```bash
# Iniciar servidor
npm run dev

# Crear plan (solo una vez)
curl -X POST http://localhost:3001/api/create-plan

# Copiar el plan_id devuelto y agregarlo a .env
MERCADOPAGO_PLAN_ID=tu_plan_id_aqui
```

## 🔧 **Endpoints Disponibles**

### **Suscripciones:**
- `POST /api/create-subscription` - Crear suscripción
- `GET /api/verify-subscription/:id` - Verificar suscripción
- `POST /api/create-plan` - Crear plan (setup inicial)

### **Webhooks:**
- `POST /webhook/mercadopago` - Notificaciones de MercadoPago

### **Utilidades:**
- `GET /health` - Estado del servidor

## 📱 **Configurar Webhooks en MercadoPago**

1. Ve a tu aplicación en MercadoPago
2. Configura webhook: `https://tu-dominio.com/webhook/mercadopago`
3. Selecciona eventos: `subscription_preapproval`

## 🚀 **Ejecutar en Desarrollo**

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

## 🌐 **Desplegar en Producción**

### **Variables de Entorno Requeridas:**
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx  
MERCADOPAGO_PLAN_ID=xxxxx
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://tu-dominio.com
```

### **Comandos de Despliegue:**
```bash
# Instalar dependencias
npm install --production

# Iniciar servidor
npm start
```

## 🔍 **Testing**

### **Verificar Configuración:**
```bash
curl http://localhost:3001/health
```

### **Crear Suscripción de Prueba:**
```bash
curl -X POST http://localhost:3001/api/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "payer_email": "test@example.com",
    "payer_name": "Usuario Test",
    "back_url": "http://localhost:5173"
  }'
```

## 📊 **Logs y Monitoreo**

El servidor registra automáticamente:
- ✅ Suscripciones creadas
- 🔍 Verificaciones de estado  
- 🔔 Webhooks recibidos
- ❌ Errores y excepciones

## 🛡️ **Seguridad**

- ✅ CORS configurado para frontend
- ✅ Validación de datos de entrada
- ✅ Manejo seguro de tokens
- ✅ Logs de auditoría

## 📞 **Soporte**

Si tienes problemas:
1. Verifica las credenciales en `.env`
2. Revisa los logs del servidor
3. Confirma que el plan existe en MercadoPago
4. Verifica la configuración de webhooks