import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Calendar, MapPin, CreditCard, Eye, Truck, Home } from 'lucide-react';

interface Order {
  id: string;
  date: string;
  items: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  total: number;
  subtotal: number;
  shipping: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: 'transfer' | 'cash';
  deliveryMethod: 'delivery' | 'pickup';
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
}

interface OrdersProps {
  onBack: () => void;
  user: { name: string; email: string } | null;
}

const Orders: React.FC<OrdersProps> = ({ onBack, user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      const savedOrders = localStorage.getItem(`orchid-orders-${user.email}`);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      default: return 'Desconocido';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para ver tus pedidos.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver a mis pedidos</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Pedido #{selectedOrder.id}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                {getStatusText(selectedOrder.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Información del Pedido */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Pedido</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-700">Fecha: {new Date(selectedOrder.date).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-700">
                      Pago: {selectedOrder.paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {selectedOrder.deliveryMethod === 'pickup' ? (
                      <Home className="h-5 w-5 text-gray-400 mr-3" />
                    ) : (
                      <Truck className="h-5 w-5 text-gray-400 mr-3" />
                    )}
                    <span className="text-gray-700">
                      {selectedOrder.deliveryMethod === 'pickup' ? 'Retiro en local' : 'Envío a domicilio'}
                    </span>
                  </div>
                  {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.customerInfo.address && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div className="text-gray-700">
                        <p>{selectedOrder.customerInfo.address}</p>
                        <p>{selectedOrder.customerInfo.city}, {selectedOrder.customerInfo.province}</p>
                        <p>CP: {selectedOrder.customerInfo.postalCode}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del Cliente */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Contacto</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Nombre:</strong> {selectedOrder.customerInfo.firstName} {selectedOrder.customerInfo.lastName}</p>
                  <p><strong>Email:</strong> {selectedOrder.customerInfo.email}</p>
                  <p><strong>Teléfono:</strong> {selectedOrder.customerInfo.phone}</p>
                </div>
              </div>
            </div>

            {/* Productos */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos</h3>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-800">
                      ${(item.price * item.quantity).toLocaleString('es-AR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de Pago */}
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Pago</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${selectedOrder.subtotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedOrder.deliveryMethod === 'pickup' ? 'Retiro en local:' : 'Envío:'}</span>
                  <span>{selectedOrder.shipping === 0 ? 'GRATIS' : `$${selectedOrder.shipping.toLocaleString('es-AR')}`}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-emerald-600">${selectedOrder.total.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          </div>
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
          <span>Volver al inicio</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-8">
            <Package className="h-8 w-8 text-emerald-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Mis Pedidos</h1>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes pedidos aún</h3>
              <p className="text-gray-500 mb-6">¡Explora nuestro catálogo y realiza tu primera compra!</p>
              <button
                onClick={onBack}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                Ver Catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-800">Pedido #{order.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('es-ES')}</p>
                      <p className="text-lg font-bold text-emerald-600">${order.total.toLocaleString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <img
                            key={index}
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-full border-2 border-white"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.deliveryMethod === 'pickup' ? 'Retiro en local' : `Envío a ${order.customerInfo.city}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center space-x-2 bg-emerald-100 text-emerald-700 py-2 px-4 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Detalles</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;