// Configuración de EmailJS
// IMPORTANTE: Reemplaza estos valores con los tuyos de EmailJS

export const emailConfig = {
  serviceId: 'service_t2bhhrw',        // Tu Service ID de EmailJS
  publicKey: '4GcfraJdHdes_gRF2',       // Tu Public Key de EmailJS
  templates: {
    orderConfirmation: 'template_iaqnglv',      // Tu Template ID para confirmación de pedidos
    passwordReset: 'template_qt4pp4f', // Template para recuperación de contraseña
    subscription: 'template_subscription', // Template para confirmación de suscripción
    internal: '', // Template para notificaciones internas (opcional - deja vacío si no tienes)
    productAvailability: 'template_k3v1zq4', // Template para notificación de disponibilidad
    activation: 'template_activation' // Template para código de activación
  },
  
  // Nueva cuenta de EmailJS para notificaciones de disponibilidad
  availabilityServiceId: 'service_gc0bcb9',        // Service ID para notificaciones de disponibilidad
  availabilityPublicKey: 'v5ens9u-UJE-VQLBn'      // Public Key para notificaciones de disponibilidad
};

// Instrucciones para configurar EmailJS:
// 1. Ve a https://www.emailjs.com/ y crea una cuenta gratuita
// 2. Conecta tu servicio de email (Gmail, Outlook, etc.)
// 3. Crea un template de email con las siguientes variables:
//    - {{to_email}} - Email del cliente
//    - {{customer_name}} - Nombre del cliente
//    - {{order_id}} - ID del pedido
//    - {{order_date}} - Fecha del pedido
//    - {{customer_phone}} - Teléfono del cliente
//    - {{products_html}} - HTML con los productos (usar {{{products_html}}})
//    - {{subtotal}} - Subtotal formateado
//    - {{shipping}} - Costo de envío formateado
//    - {{total}} - Total formateado
//    - {{payment_method}} - Método de pago
//    - {{delivery_method}} - Método de entrega
//    - {{delivery_address}} - Dirección de entrega
//    - {{show_transfer_data}} - 'block' o 'none' para mostrar datos de transferencia
//    - {{show_pickup_info}} - 'block' o 'none' para mostrar info de retiro
//    - {{show_delivery_info}} - 'block' o 'none' para mostrar info de envío
// 4. Copia tus IDs y keys aquí
// 5. ¡Listo para enviar emails reales!

// NUEVO: Template para recuperación de contraseña
// Crea un nuevo template en EmailJS con estas variables:
// - {{email}} - Email del usuario
// - {{customer_name}} - Nombre del usuario
// - {{reset_link}} - Enlace para cambiar contraseña
// - {{expiry_time}} - Tiempo de expiración (ej: "1 hora")
// - {{company_name}} - Nombre de la empresa

// NUEVO: Template para código de activación de suscripción
// Crea un nuevo template en EmailJS con estas variables:
// - {{email}} - Email del usuario
// - {{customer_name}} - Nombre del usuario
// - {{activation_code}} - Código de activación (ej: "ABC123XY")
// - {{company_name}} - Nombre de la empresa
// - {{plan_name}} - Nombre del plan (ej: "Premium Videos")
// - {{plan_price}} - Precio del plan (ej: "$9.999/mes")