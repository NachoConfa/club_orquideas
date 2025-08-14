import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener favoritos del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_type } = req.query;

    let query = `
      SELECT 
        f.id as favorite_id,
        f.product_type,
        f.product_id,
        f.created_at,
        CASE 
          WHEN f.product_type = 'product' THEN p.name
          WHEN f.product_type = 'accessory' THEN a.name
        END as name,
        CASE 
          WHEN f.product_type = 'product' THEN p.price
          WHEN f.product_type = 'accessory' THEN a.price
        END as price,
        CASE 
          WHEN f.product_type = 'product' THEN p.original_price
          WHEN f.product_type = 'accessory' THEN a.original_price
        END as original_price,
        CASE 
          WHEN f.product_type = 'product' THEN p.image
          WHEN f.product_type = 'accessory' THEN a.image
        END as image,
        CASE 
          WHEN f.product_type = 'product' THEN p.rating
          WHEN f.product_type = 'accessory' THEN a.rating
        END as rating,
        CASE 
          WHEN f.product_type = 'product' THEN p.reviews
          WHEN f.product_type = 'accessory' THEN a.reviews
        END as reviews,
        CASE 
          WHEN f.product_type = 'product' THEN p.in_stock
          WHEN f.product_type = 'accessory' THEN a.in_stock
        END as in_stock,
        p.color,
        p.size,
        p.category as product_category,
        a.category as accessory_category
      FROM favorites f
      LEFT JOIN products p ON f.product_type = 'product' AND f.product_id = p.id
      LEFT JOIN accessories a ON f.product_type = 'accessory' AND f.product_id = a.id
      WHERE f.user_id = ?
    `;

    const params = [userId];

    // Filtrar por tipo de producto si se especifica
    if (product_type) {
      query += ' AND f.product_type = ?';
      params.push(product_type);
    }

    query += ' ORDER BY f.created_at DESC';

    const favorites = await executeQuery(query, params);

    res.json({
      success: true,
      data: {
        favorites,
        total: favorites.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Agregar a favoritos
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_type, product_id } = req.body;

    // Validaciones
    if (!product_type || !product_id) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de producto y ID son requeridos'
      });
    }

    if (!['product', 'accessory'].includes(product_type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de producto debe ser "product" o "accessory"'
      });
    }

    // Verificar que el producto existe
    let productExists = false;
    let productName = '';

    if (product_type === 'product') {
      const products = await executeQuery(
        'SELECT name FROM products WHERE id = ?',
        [product_id]
      );
      if (products.length > 0) {
        productExists = true;
        productName = products[0].name;
      }
    } else if (product_type === 'accessory') {
      const accessories = await executeQuery(
        'SELECT name FROM accessories WHERE id = ?',
        [product_id]
      );
      if (accessories.length > 0) {
        productExists = true;
        productName = accessories[0].name;
      }
    }

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar si ya está en favoritos
    const existingFavorite = await executeQuery(
      'SELECT id FROM favorites WHERE user_id = ? AND product_type = ? AND product_id = ?',
      [userId, product_type, product_id]
    );

    if (existingFavorite.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El producto ya está en tus favoritos'
      });
    }

    // Agregar a favoritos
    await executeQuery(
      'INSERT INTO favorites (user_id, product_type, product_id, created_at) VALUES (?, ?, ?, NOW())',
      [userId, product_type, product_id]
    );

    res.status(201).json({
      success: true,
      message: `${productName} agregado a favoritos`
    });

  } catch (error) {
    console.error('Error agregando a favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar de favoritos
router.delete('/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { favoriteId } = req.params;

    // Verificar que el favorito pertenece al usuario
    const favorite = await executeQuery(
      'SELECT id FROM favorites WHERE id = ? AND user_id = ?',
      [favoriteId, userId]
    );

    if (favorite.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorito no encontrado'
      });
    }

    // Eliminar favorito
    await executeQuery(
      'DELETE FROM favorites WHERE id = ?',
      [favoriteId]
    );

    res.json({
      success: true,
      message: 'Eliminado de favoritos'
    });

  } catch (error) {
    console.error('Error eliminando favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Verificar si un producto está en favoritos
router.get('/check/:productType/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productType, productId } = req.params;

    const favorite = await executeQuery(
      'SELECT id FROM favorites WHERE user_id = ? AND product_type = ? AND product_id = ?',
      [userId, productType, productId]
    );

    res.json({
      success: true,
      data: {
        isFavorite: favorite.length > 0,
        favoriteId: favorite.length > 0 ? favorite[0].id : null
      }
    });

  } catch (error) {
    console.error('Error verificando favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;