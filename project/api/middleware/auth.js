import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// Middleware para verificar JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const user = await executeQuery(
      'SELECT id, name, email, is_admin, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (!user || user.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no válido' 
      });
    }

    req.user = user[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }
    
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Middleware para verificar si el usuario es admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de administrador' 
    });
  }
  next();
};

// Middleware para verificar suscripción premium
export const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Autenticación requerida' 
      });
    }

    // Verificar suscripción activa
    const subscription = await executeQuery(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? 
      AND status = 'active' 
      AND (expiry_date IS NULL OR expiry_date > NOW())
      ORDER BY created_at DESC 
      LIMIT 1
    `, [req.user.id]);

    if (!subscription || subscription.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Suscripción premium requerida' 
      });
    }

    req.subscription = subscription[0];
    next();
  } catch (error) {
    console.error('Error verificando suscripción:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Alias para requirePremium (DESPUÉS de definir requirePremium)
export const requireSubscription = requirePremium;

// Función para generar JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Función para generar refresh token (opcional)
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }
  );
};