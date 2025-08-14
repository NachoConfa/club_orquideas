import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateAccessory } from '../middleware/validation.js';

const router = express.Router();

// Obtener todos los accesorios (público)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      in_stock, 
      min_price, 
      max_price,
      search,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = 'SELECT * FROM accessories WHERE 1=1';
    const params = [];

    // Filtros
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (in_stock !== undefined) {
      query += ' AND in_stock = ?';
      params.push(in_stock === 'true');
    }

    if (min_price) {
      query += ' AND price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND price <= ?';
      params.push(parseFloat(max_price));
    }

    if (search) {
      query += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Ordenar y limitar
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const accessories = await executeQuery(query, params);

    res.json({
      success: true,
      data: {
        accessories,
        total: accessories.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error obteniendo accesorios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener accesorio por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accessories = await executeQuery(
      'SELECT * FROM accessories WHERE id = ?',
      [id]
    );

    if (accessories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accesorio no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        accessory: accessories[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo accesorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear accesorio (solo admin)
router.post('/', authenticateToken, requireAdmin, validateAccessory, async (req, res) => {
  try {
    const {
      name,
      price,
      original_price,
      image,
      rating = 5.0,
      reviews = 0,
      category,
      description,
      in_stock = true
    } = req.body;

    const result = await executeQuery(`
      INSERT INTO accessories 
      (name, price, original_price, image, rating, reviews, category, description, in_stock, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [name, price, original_price, image, rating, reviews, category, description, in_stock]);

    // Obtener el accesorio creado
    const newAccessory = await executeQuery(
      'SELECT * FROM accessories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Accesorio creado exitosamente',
      data: {
        accessory: newAccessory[0]
      }
    });

  } catch (error) {
    console.error('Error creando accesorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar accesorio (solo admin)
router.put('/:id', authenticateToken, requireAdmin, validateAccessory, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      original_price,
      image,
      rating,
      reviews,
      category,
      description,
      in_stock
    } = req.body;

    // Verificar que existe
    const existingAccessory = await executeQuery(
      'SELECT id FROM accessories WHERE id = ?',
      [id]
    );

    if (existingAccessory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accesorio no encontrado'
      });
    }

    // Actualizar accesorio
    await executeQuery(`
      UPDATE accessories 
      SET name = ?, price = ?, original_price = ?, image = ?, rating = ?, 
          reviews = ?, category = ?, description = ?, in_stock = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, price, original_price, image, rating, reviews, category, description, in_stock, id]);

    // Obtener accesorio actualizado
    const updatedAccessory = await executeQuery(
      'SELECT * FROM accessories WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Accesorio actualizado exitosamente',
      data: {
        accessory: updatedAccessory[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando accesorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar accesorio (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existingAccessory = await executeQuery(
      'SELECT id FROM accessories WHERE id = ?',
      [id]
    );

    if (existingAccessory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accesorio no encontrado'
      });
    }

    // Eliminar accesorio
    await executeQuery(
      'DELETE FROM accessories WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Accesorio eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando accesorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener categorías disponibles (público)
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await executeQuery(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM accessories 
      WHERE in_stock = TRUE 
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