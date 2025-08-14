import express from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { validateUserRegistration, validateLogin, validatePasswordChange } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Registro de usuario
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar si el email ya existe
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const result = await executeQuery(
      'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // Generar token
    const token = generateToken(userId);

    // Obtener usuario creado (sin contraseña)
    const newUser = await executeQuery(
      'SELECT id, name, email, created_at, is_admin FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: newUser[0],
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Login de usuario
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const users = await executeQuery(
      'SELECT id, name, email, password, is_admin, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // Verificar si está activo
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    await executeQuery(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generar token
    const token = generateToken(user.id);

    // Remover contraseña del objeto user
    delete user.password;

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Verificar token (obtener usuario actual)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Obtener datos adicionales del usuario
    const userDetails = await executeQuery(`
      SELECT 
        u.id, u.name, u.email, u.created_at, u.last_login, u.is_admin,
        s.status as subscription_status, s.expiry_date as subscription_expiry
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      AND s.status = 'active' 
      AND (s.expiry_date IS NULL OR s.expiry_date > NOW())
      WHERE u.id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        user: userDetails[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Cambiar contraseña
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Obtener contraseña actual
    const users = await executeQuery(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Reset de contraseña (enviar código)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Verificar si existe el usuario
    const users = await executeQuery(
      'SELECT id, name FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    // Por seguridad, siempre devolver success aunque no exista el usuario
    res.json({
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });

    // Solo proceder si existe el usuario
    if (users.length > 0) {
      // Aquí podrías implementar el envío de email
      // Por ahora solo log
      console.log('Reset password solicitado para:', email);
    }

  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar perfil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido y debe tener al menos 2 caracteres'
      });
    }

    // Actualizar nombre
    await executeQuery(
      'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), userId]
    );

    // Obtener usuario actualizado
    const updatedUser = await executeQuery(
      'SELECT id, name, email, created_at, is_admin FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Logout (opcional - para limpiar sesiones del lado servidor)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Aquí podrías invalidar el token si manejas una blacklist
    // Por ahora solo confirmamos logout
    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;