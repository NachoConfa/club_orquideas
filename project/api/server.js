import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import accessoryRoutes from './routes/accessories.js';
import cartRoutes from './routes/cart.js';
import videoRoutes from './routes/videos.js';
import favoriteRoutes from './routes/favorites.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutos por defecto
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // límite de requests por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configurar CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://tu-dominio.com'] // Agregar tu dominio de producción
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5176'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares globales
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Aplicar rate limiting
app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/accessories', accessoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/favorites', favoriteRoutes);

// Ruta para servir archivos estáticos (si necesitas subir imágenes)
app.use('/api/uploads', express.static('uploads'));

// Middleware para rutas no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  
  // Error de sintaxis JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la solicitud'
    });
  }

  // Error de base de datos
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'Ya existe un registro con estos datos'
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida a otro registro'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // DEBUG: Mostrar todas las variables críticas
    console.log('🔍 ===== DEBUG DE VARIABLES =====');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `SET (${process.env.DB_PASSWORD.length} chars)` : 'NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('🔍 ===== FIN DEBUG =====');
    
    // Probar conexión a la base de datos
    console.log('🔄 Probando conexión a la base de datos...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      console.error('❌ Revisa las variables de entorno arriba');
      // TEMPORAL: No salir, solo advertir para debug
      console.warn('⚠️  Continuando sin base de datos para debug...');
    } else {
      console.log('✅ Base de datos conectada correctamente');
    }

    // Iniciar servidor (bind a 0.0.0.0 para Railway)
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ===================================');
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`🚀 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 API URL: http://localhost:${PORT}/api`);
      console.log(`🚀 Health check: http://localhost:${PORT}/api/health`);
      console.log('🚀 ===================================');
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;