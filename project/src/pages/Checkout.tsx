import React, { useState } from 'react';
import { useEffect } from 'react';
import { ArrowLeft, Banknote, Shield, Truck, CheckCircle, Home, Mail } from 'lucide-react';
import { sendOrderConfirmationEmail, sendInternalNotification } from '../services/emailService';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
}

interface CheckoutProps {
  items: CartItem[];
  onBack: () => void;
  onOrderComplete: () => void;
  user: { name: string; email: string } | null;
}

const Checkout: React.FC<CheckoutProps> = ({ items, onBack, onOrderComplete, user }) => {
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    province: ''
  });

  // Pre-poblar datos del usuario logueado
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ').slice(1).join(' ') || ''
      }));
    }
  }, [user]);

  // Función para calcular el costo de envío basado en la localidad
  const calculateShipping = () => {
    if (deliveryMethod === 'pickup') return 0;
    
    // No calcular envío si no hay dirección completa
    if (!formData.city || !formData.province) return 0;
    
    const city = formData.city.toLowerCase();
    const province = formData.province.toLowerCase();
    
    // Nordelta - envío más económico (zona local)
    if (city.includes('nordelta') || city.includes('tigre') && city.includes('nordelta')) {
      return 3000;
    }
    
    // Zona Tigre y alrededores
    if (city.includes('tigre') || city.includes('san fernando') || city.includes('san isidro') || 
        city.includes('vicente lópez') || city.includes('olivos') || city.includes('martínez') ||
        city.includes('acassuso') || city.includes('beccar') || city.includes('boulogne')) {
      return 6000;
    }
    
    // CABA - Capital Federal
    if (city.includes('buenos aires') || city.includes('caba') || city.includes('capital federal') ||
        province.includes('caba') || city.includes('palermo') || city.includes('belgrano') ||
        city.includes('recoleta') || city.includes('puerto madero') || city.includes('san telmo') ||
        city.includes('barracas') || city.includes('la boca') || city.includes('constitución')) {
      return 16000;
    }
    
    // GBA - Gran Buenos Aires
    if (province.includes('buenos aires') || city.includes('la plata') || city.includes('quilmes') ||
        city.includes('avellaneda') || city.includes('lanús') || city.includes('lomas de zamora') ||
        city.includes('almirante brown') || city.includes('esteban echeverría') || city.includes('morón') ||
        city.includes('tres de febrero') || city.includes('san martín') || city.includes('malvinas argentinas')) {
      return 9000;
    }
    
    // Provincias del interior - precios reales de envío
    const provinceShipping: { [key: string]: number } = {
      'córdoba': 13000,
      'santa fe': 12000,
      'rosario': 12000,
      'mendoza': 15000,
      'tucumán': 16000,
      'salta': 17000,
      'jujuy': 18000,
      'santiago del estero': 15000,
      'corrientes': 14000,
      'misiones': 15000,
      'entre ríos': 11000,
      'paraná': 11000,
      'formosa': 17000,
      'chaco': 15000,
      'la rioja': 16000,
      'catamarca': 16000,
      'san juan': 15000,
      'san luis': 14000,
      'neuquén': 19000,
      'río negro': 20000,
      'chubut': 23000,
      'santa cruz': 26000,
      'tierra del fuego': 29000,
      'ushuaia': 29000,
      'bariloche': 20000,
      'mar del plata': 10000,
      'bahía blanca': 13000
    };
    
    // Buscar coincidencia por provincia o ciudad
    for (const [location, price] of Object.entries(provinceShipping)) {
      if (province.includes(location) || city.includes(location)) {
        return price;
      }
    }
    
    // Precio por defecto para otras localidades
    return 13000;
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = calculateShipping();
  const total = subtotal + shipping;

  // Función para enviar email de confirmación
  const sendConfirmationEmail = async () => {
    try {
      const orderId = Date.now().toString();
      
      // Preparar datos para el email
      const orderEmailData = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        orderId,
        orderDate: new Date().toLocaleDateString('es-ES'),
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal,
        shipping,
        total,
        paymentMethod,
        deliveryMethod,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode
      };

      // Enviar email de confirmación al cliente
      const emailSent = await sendOrderConfirmationEmail(orderEmailData);
      setEmailSent(emailSent);

      // Enviar notificación interna (opcional)
      await sendInternalNotification(orderEmailData);
      
    } catch (error) {
      console.error('Error enviando email:', error);
      setEmailSent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que el email no esté vacío
    if (!formData.email || formData.email.trim() === '') {
      alert('Por favor, ingresa un email válido para recibir la confirmación del pedido.');
      return;
    }
    
    setIsProcessing(true);

    // Simular procesamiento de pago
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Enviar email de confirmación
    await sendConfirmationEmail();

    console.log('📧 Estado del envío de email:', emailSent ? 'Exitoso' : 'Falló');

    // Guardar pedido en localStorage
    if (user) {
      const orderData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        total,
        subtotal,
        shipping,
        status: 'pending' as const,
        paymentMethod,
        deliveryMethod,
        customerInfo: formData
      };

      const existingOrders = JSON.parse(localStorage.getItem(`orchid-orders-${user.email}`) || '[]');
      existingOrders.unshift(orderData);
      localStorage.setItem(`orchid-orders-${user.email}`, JSON.stringify(existingOrders));
    }

    // Enviar notificación por WhatsApp (simulado)
    const orderDetails = items.map(item => 
      `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toLocaleString('es-AR')}`
    ).join('\n');
    
    const message = `🌺 NUEVA ORDEN - Club de Las Orquídeas\n\n` +
      `Cliente: ${formData.firstName} ${formData.lastName}\n` +
      `Email: ${formData.email}\n` +
      `Teléfono: ${formData.phone}\n` +
      `${deliveryMethod === 'pickup' ? 'RETIRO EN LOCAL' : `Dirección: ${formData.address}, ${formData.city}, ${formData.province}`}\n\n` +
      `PRODUCTOS:\n${orderDetails}\n\n` +
      `Subtotal: $${subtotal.toLocaleString('es-AR')}\n` +
      `${deliveryMethod === 'pickup' ? 'Retiro en local' : 'Envío'}: $${shipping.toLocaleString('es-AR')}\n` +
      `TOTAL: $${total.toLocaleString('es-AR')}\n\n` +
      `Método de pago: ${
        paymentMethod === 'cash' ? 'Efectivo' : 
        'Transferencia Bancaria'
      }${paymentMethod === 'transfer' ? '\n\n⚠️ PENDIENTE: Esperando comprobante de transferencia a CBU 0000003100056904758628' : ''}`;

    // Enviar notificación por WhatsApp
    const whatsappNumber = '+5491122906442';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodedMessage}`;
    
    // Abrir WhatsApp en una nueva ventana
    window.open(whatsappUrl, '_blank');
    
    console.log('📱 Notificación enviada por WhatsApp a:', whatsappNumber);
    
    setIsProcessing(false);
    setOrderComplete(true);
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Orden Completada!</h2>
            <p className="text-gray-600 mb-4">
              Tu pedido ha sido procesado exitosamente por un total de <span className="font-bold text-green-600">${total.toLocaleString('es-AR')}</span>.
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-center mb-2">
                <Mail className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-semibold">
                  {emailSent ? '✅ Email enviado' : '📧 Enviando email...'}
                </span>
              </div>
              <p className="text-sm text-green-700">
                Hemos enviado la confirmación de tu pedido a <strong>{formData.email}</strong>
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                📱 Se ha enviado una notificación por WhatsApp con los detalles de tu pedido.
              </p>
            </div>
            
            {deliveryMethod === 'pickup' ? (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-center mb-2">
                  <Home className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="text-orange-800 font-semibold">Retiro en Local</span>
                </div>
                <p className="text-sm text-orange-700">
                  Te contactaremos cuando tu pedido esté listo para retirar en Av. De los Lagos 7000, Nordelta.
                </p>
              </div>
            ) : (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-center mb-2">
                  <Truck className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-purple-800 font-semibold">Envío a Domicilio</span>
                </div>
                <p className="text-sm text-purple-700">
                  Tu pedido será enviado a {formData.city}, {formData.province} en 3-7 días hábiles.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={onOrderComplete}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al carrito</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de Checkout */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Información del Pedido</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />

              <input
                type="tel"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />

              {/* Método de Entrega */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Método de Entrega</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={(e) => setDeliveryMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <Truck className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <span className="font-medium">Envío a Domicilio</span>
                      <p className="text-sm text-gray-500">Costo según localidad</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={(e) => setDeliveryMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <Home className="h-5 w-5 text-green-500 mr-3" />
                    <div>
                      <span className="font-medium">Retiro en Local</span>
                      <p className="text-sm text-gray-500">Av. De los Lagos 7000, Nordelta - Sin costo</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Campos de dirección solo si es envío */}
              {deliveryMethod === 'delivery' && (
                <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800">Dirección de Envío</h4>
                  
                  <input
                    type="text"
                    placeholder="Dirección completa"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Ciudad"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Provincia"
                      value={formData.province}
                      onChange={(e) => setFormData({...formData, province: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Código Postal"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              )}

              {/* Métodos de Pago */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Método de Pago</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <Banknote className="h-5 w-5 text-green-500 mr-3" />
                    <span>Transferencia Bancaria</span>
                  </label>
                  
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <Banknote className="h-5 w-5 text-orange-500 mr-3" />
                    <span>Pago en Efectivo {deliveryMethod === 'pickup' ? '(En el local)' : '(Contra entrega)'}</span>
                  </label>
                </div>
              </div>

              {/* Información de Transferencia */}
              {paymentMethod === 'transfer' && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3">Datos para Transferencia Bancaria</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">CBU:</span>
                      <span className="font-mono font-semibold text-green-800">0000003100056904758628</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Titular:</span>
                      <span className="font-semibold text-green-800">Ignacio Adrian Confalonieri</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Alias:</span>
                      <span className="font-semibold text-green-800">ignacio.confalonieri</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Banco:</span>
                      <span className="font-semibold text-green-800">Mercado Pago</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">CUIT:</span>
                      <span className="font-mono font-semibold text-green-800">20-47436820-4</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-100 rounded border-l-4 border-yellow-500">
                    <p className="text-xs text-yellow-800">
                      💡 Después de realizar la transferencia, envía el comprobante por WhatsApp para confirmar tu pedido.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || !formData.email || formData.email.trim() === ''}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Procesando...' : 
                  `Completar Pedido - $${total.toLocaleString('es-AR')}`
                }
              </button>
            </form>
          </div>

          {/* Resumen del Pedido */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Resumen del Pedido</h3>
            
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.size} • {item.color}</p>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    ${(item.price * item.quantity).toLocaleString('es-AR')}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span>{deliveryMethod === 'pickup' ? 'Retiro en local:' : 'Envío:'}</span>
                <span className={shipping === 0 && deliveryMethod === 'pickup' ? 'text-green-600 font-semibold' : ''}>
                  {deliveryMethod === 'pickup' ? 'GRATIS' : 
                   shipping === 0 ? 'A calcular' : 
                   `$${shipping.toLocaleString('es-AR')}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${total.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                <span>Compra 100% segura</span>
              </div>
              {deliveryMethod === 'delivery' ? (
                <div className="flex items-center text-sm text-gray-600">
                  <Truck className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Envío calculado según tu ubicación</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-600">
                  <Home className="h-4 w-4 mr-2 text-green-500" />
                  <span>Retiro gratuito en nuestro local</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;