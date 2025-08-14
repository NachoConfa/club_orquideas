import { body, validationResult } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Validaciones para registro de usuario
export const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email es demasiado largo'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  
  handleValidationErrors
];

// Validaciones para login
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
  
  handleValidationErrors
];

// Validaciones para productos
export const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del producto es requerido')
    .isLength({ max: 255 })
    .withMessage('El nombre es demasiado largo'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  
  body('original_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio original debe ser un número positivo'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isLength({ max: 100 })
    .withMessage('La categoría es demasiado larga'),
  
  body('color')
    .trim()
    .notEmpty()
    .withMessage('El color es requerido')
    .isLength({ max: 50 })
    .withMessage('El color es demasiado largo'),
  
  body('size')
    .trim()
    .notEmpty()
    .withMessage('El tamaño es requerido')
    .isLength({ max: 50 })
    .withMessage('El tamaño es demasiado largo'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('El tipo es requerido')
    .isLength({ max: 100 })
    .withMessage('El tipo es demasiado largo'),
  
  body('in_stock')
    .optional()
    .isBoolean()
    .withMessage('in_stock debe ser verdadero o falso'),
  
  handleValidationErrors
];

// Validaciones para accesorios
export const validateAccessory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del accesorio es requerido')
    .isLength({ max: 255 })
    .withMessage('El nombre es demasiado largo'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  
  body('original_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio original debe ser un número positivo'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isLength({ max: 100 })
    .withMessage('La categoría es demasiado larga'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida'),
  
  body('in_stock')
    .optional()
    .isBoolean()
    .withMessage('in_stock debe ser verdadero o falso'),
  
  handleValidationErrors
];

// Validaciones para videos premium
export const validateVideo = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es requerido')
    .isLength({ max: 255 })
    .withMessage('El título es demasiado largo'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida'),
  
  body('duration')
    .trim()
    .notEmpty()
    .withMessage('La duración es requerida')
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La duración debe tener formato MM:SS'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isLength({ max: 100 })
    .withMessage('La categoría es demasiado larga'),
  
  body('difficulty')
    .isIn(['Principiante', 'Intermedio', 'Avanzado'])
    .withMessage('La dificultad debe ser Principiante, Intermedio o Avanzado'),
  
  body('instructor')
    .trim()
    .notEmpty()
    .withMessage('El instructor es requerido')
    .isLength({ max: 255 })
    .withMessage('El nombre del instructor es demasiado largo'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser verdadero o falso'),
  
  handleValidationErrors
];

// Validación para cambio de contraseña
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('La confirmación de contraseña no coincide');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Validación para carrito
export const validateCartItem = [
  body('product_type')
    .isIn(['product', 'accessory'])
    .withMessage('El tipo de producto debe ser product o accessory'),
  
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('La cantidad debe ser entre 1 y 99'),
  
  handleValidationErrors
];