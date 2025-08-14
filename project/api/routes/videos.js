import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken, requireAdmin, requireSubscription } from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los videos (solo suscriptores)
router.get('/', authenticateToken, requireSubscription, async (req, res) => {
  try {
    const { 
      category, 
      search,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = 'SELECT * FROM premium_videos WHERE 1=1';
    const params = [];

    // Filtros
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Ordenar y limitar
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const videos = await executeQuery(query, params);

    res.json({
      success: true,
      data: {
        videos,
        total: videos.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error obteniendo videos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener video por ID (solo suscriptores)
router.get('/:id', authenticateToken, requireSubscription, async (req, res) => {
  try {
    const { id } = req.params;

    const videos = await executeQuery(
      'SELECT * FROM premium_videos WHERE id = ?',
      [id]
    );

    if (videos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        video: videos[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo video:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear video (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      video_url,
      thumbnail,
      duration,
      category,
      tags
    } = req.body;

    // Validaciones básicas
    if (!title || !video_url) {
      return res.status(400).json({
        success: false,
        message: 'Título y URL del video son requeridos'
      });
    }

    const result = await executeQuery(`
      INSERT INTO premium_videos 
      (title, description, video_url, thumbnail, duration, category, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [title, description, video_url, thumbnail, duration, category, tags]);

    // Obtener el video creado
    const newVideo = await executeQuery(
      'SELECT * FROM premium_videos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Video creado exitosamente',
      data: {
        video: newVideo[0]
      }
    });

  } catch (error) {
    console.error('Error creando video:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar video (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      video_url,
      thumbnail,
      duration,
      category,
      tags
    } = req.body;

    // Verificar que existe
    const existingVideo = await executeQuery(
      'SELECT id FROM premium_videos WHERE id = ?',
      [id]
    );

    if (existingVideo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Actualizar video
    await executeQuery(`
      UPDATE premium_videos 
      SET title = ?, description = ?, video_url = ?, thumbnail = ?, 
          duration = ?, category = ?, tags = ?, updated_at = NOW()
      WHERE id = ?
    `, [title, description, video_url, thumbnail, duration, category, tags, id]);

    // Obtener video actualizado
    const updatedVideo = await executeQuery(
      'SELECT * FROM premium_videos WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Video actualizado exitosamente',
      data: {
        video: updatedVideo[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando video:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar video (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existingVideo = await executeQuery(
      'SELECT id FROM premium_videos WHERE id = ?',
      [id]
    );

    if (existingVideo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Eliminar video
    await executeQuery(
      'DELETE FROM premium_videos WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Video eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando video:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener categorías disponibles (solo suscriptores)
router.get('/categories/list', authenticateToken, requireSubscription, async (req, res) => {
  try {
    const categories = await executeQuery(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM premium_videos 
      GROUP BY category 
      ORDER BY category
    `);

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;