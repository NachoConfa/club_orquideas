import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCartItem } from '../middleware/validation.js';

const router = express.Router();

// Obtener carrito del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await executeQuery(`
      SELECT 
        ci.id as cart_item_id,
        ci.product_type,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        CASE 
          WHEN ci.product_type = 'product' THEN p.name
          WHEN ci.product_type = 'accessory' THEN a.name
        END as name,
        CASE 
          WHEN ci.product_type = 'product' THEN p.price
          WHEN ci.product_type = 'accessory' THEN a.price
        END as price,
        CASE 
          WHEN ci.product_type = 'product' THEN p.image
          WHEN ci.product_type = 'accessory' THEN a.image
        END as image,
        CASE 
          WHEN ci.product_type = 'product' THEN p.in_stock
          WHEN ci.product_type = 'accessory' THEN a.in_stock
        END as in_stock,
        p.color,
        p.size,
        p.category as product_category,
        a.category as accessory_category
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_type = 'product' AND ci.product_id = p.id
      LEFT JOIN accessories a ON ci.product_type = 'accessory' AND ci.product_id = a.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `, [userId]);

    // Calcular total
    const total = cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        total: total,
        itemCount: cartItems.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Agregar item al carrito
router.post('/', authenticateToken, validateCartItem, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_type, product_id, quantity = 1 } = req.body;

    // Verificar que el producto existe y está disponible
    let productExists = false;
    let productName = '';

    if (product_type === 'product') {
      const products = await executeQuery(
        'SELECT name, in_stock FROM products WHERE id = ?',
        [product_id]
      );
      if (products.length > 0) {
        productExists = true;
        productName = products[0].name;
        if (!products[0].in_stock) {
          return res.status(400).json({
            success: false,
            message: 'El producto no está disponible'
          });
        }
      }
    } else if (product_type === 'accessory') {
      const accessories = await executeQuery(
        'SELECT name, in_stock FROM accessories WHERE id = ?',
        [product_id]
      );
      if (accessories.length > 0) {
        productExists = true;
        productName = accessories[0].name;
        if (!accessories[0].in_stock) {
          return res.status(400).json({
            success: false,
            message: 'El accesorio no está disponible'
          });
        }
      }
    }

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar si ya existe en el carrito
    const existingItem = await executeQuery(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_type = ? AND product_id = ?',
      [userId, product_type, product_id]
    );

    if (existingItem.length > 0) {
      // Actualizar cantidad
      const newQuantity = existingItem[0].quantity + quantity;
      await executeQuery(
        'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQuantity, existingItem[0].id]
      );
    } else {
      // Agregar nuevo item
      await executeQuery(
        'INSERT INTO cart_items (user_id, product_type, product_id, quantity, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, product_type, product_id, quantity]
      );
    }

    res.status(201).json({
      success: true,
      message: `${productName} agregado al carrito`
    });

  } catch (error) {
    console.error('Error agregando al carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar cantidad de item en carrito
router.put('/:cartItemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1 || quantity > 99) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser entre 1 y 99'
      });
    }

    // Verificar que el item pertenece al usuario
    const cartItem = await executeQuery(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (cartItem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    // Actualizar cantidad
    await executeQuery(
      'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
      [quantity, cartItemId]
    );

    res.json({
      success: true,
      message: 'Cantidad actualizada'
    });

  } catch (error) {
    console.error('Error actualizando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar item del carrito
router.delete('/:cartItemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    // Verificar que el item pertenece al usuario
    const cartItem = await executeQuery(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (cartItem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    // Eliminar item
    await executeQuery(
      'DELETE FROM cart_items WHERE id = ?',
      [cartItemId]
    );

    res.json({
      success: true,
      message: 'Item eliminado del carrito'
    });

  } catch (error) {
    console.error('Error eliminando del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Limpiar carrito completo
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await executeQuery(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Carrito vaciado'
    });

  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;