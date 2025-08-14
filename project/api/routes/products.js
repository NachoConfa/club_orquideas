import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateProduct } from '../middleware/validation.js';

const router = express.Router();

// Obtener todos los productos (público)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      color, 
      size, 
      type, 
      in_stock, 
      min_price, 
      max_price,
      search,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Filtros
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (color) {
      query += ' AND color = ?';
      params.push(color);
    }

    if (size) {
      query += ' AND size = ?';
      params.push(size);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
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
      query += ' AND (name LIKE ? OR category LIKE ? OR type LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Ordenar y limitar
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await executeQuery(query, params);

    res.json({
      success: true,
      data: {
        products,
        total: products.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener producto por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const products = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        product: products[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear producto (solo admin)
router.post('/', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
  try {
    const {
      name,
      price,
      original_price,
      image,
      rating = 5.0,
      reviews = 0,
      category,
      color,
      size,
      in_stock = true,
      type
    } = req.body;

    const result = await executeQuery(`
      INSERT INTO products 
      (name, price, original_price, image, rating, reviews, category, color, size, in_stock, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [name, price, original_price, image, rating, reviews, category, color, size, in_stock, type]);

    // Obtener el producto creado
    const newProduct = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: {
        product: newProduct[0]
      }
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar producto (solo admin)
router.put('/:id', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
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
      color,
      size,
      in_stock,
      type
    } = req.body;

    // Verificar que existe
    const existingProduct = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Actualizar producto
    await executeQuery(`
      UPDATE products 
      SET name = ?, price = ?, original_price = ?, image = ?, rating = ?, 
          reviews = ?, category = ?, color = ?, size = ?, in_stock = ?, 
          type = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, price, original_price, image, rating, reviews, category, color, size, in_stock, type, id]);

    // Obtener producto actualizado
    const updatedProduct = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: {
        product: updatedProduct[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar producto (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existingProduct = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Eliminar producto
    await executeQuery(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando producto:', error);
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
      FROM products 
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

// Obtener colores disponibles (público)
router.get('/colors/list', async (req, res) => {
  try {
    const colors = await executeQuery(`
      SELECT DISTINCT color, COUNT(*) as count 
      FROM products 
      WHERE in_stock = TRUE 
      GROUP BY color 
      ORDER BY color
    `);

    res.json({
      success: true,
      data: {
        colors
      }
    });

  } catch (error) {
    console.error('Error obteniendo colores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener tamaños disponibles (público)
router.get('/sizes/list', async (req, res) => {
  try {
    const sizes = await executeQuery(`
      SELECT DISTINCT size, COUNT(*) as count 
      FROM products 
      WHERE in_stock = TRUE 
      GROUP BY size 
      ORDER BY 
        CASE size 
          WHEN 'Pequeña' THEN 1 
          WHEN 'Mediana' THEN 2 
          WHEN 'Grande' THEN 3 
          WHEN 'Extra Grande' THEN 4 
          ELSE 5 
        END
    `);

    res.json({
      success: true,
      data: {
        sizes
      }
    });

  } catch (error) {
    console.error('Error obteniendo tamaños:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;