import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CreditCard, Eye, Home, MapPin, Package, Truck, XCircle } from 'lucide-react';
import { cancelSupabaseOrder, getSupabaseOrdersForUser, type CustomerOrder } from '../services/orderSupabaseService';
import { useConfirm } from '../components/feedback/ConfirmProvider';
import { useToast } from '../components/feedback/ToastProvider';

interface OrdersProps {
  onBack: () => void;
  user: { id?: string; name: string; email: string } | null;
}

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

const OrdersSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-5 w-44 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-28 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
    case 'received':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
    case 'paid':
    case 'processing':
    case 'approved':
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'requires_review':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'received':
      return 'Recibido';
    case 'confirmed':
      return 'Confirmado';
    case 'paid':
      return 'Pagado';
    case 'approved':
      return 'Aprobado';
    case 'processing':
      return 'En preparación';
    case 'completed':
      return 'Completado';
    case 'shipped':
      return 'Enviado';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    case 'requires_review':
      return 'Requiere revisión';
    default:
      return 'Desconocido';
  }
};

const CANCELABLE_ORDER_STATUSES = new Set([
  'pending',
  'pending_cash_payment',
  'awaiting_transfer',
  'awaiting_payment',
  'payment_pending',
  'received',
]);

const BLOCKED_ORDER_STATUSES = new Set(['confirmed', 'paid', 'approved', 'processing', 'completed', 'delivered']);

const isOrderCancelable = (order: CustomerOrder) => {
  const status = String(order.status || '').toLowerCase();
  const paymentStatus = String(order.paymentStatus || '').toLowerCase();

  if (order.stockDeducted || status === 'cancelled' || paymentStatus === 'cancelled') {
    return false;
  }

  if (BLOCKED_ORDER_STATUSES.has(status) || BLOCKED_ORDER_STATUSES.has(paymentStatus)) {
    return false;
  }

  return CANCELABLE_ORDER_STATUSES.has(status) || CANCELABLE_ORDER_STATUSES.has(paymentStatus);
};

const getPaymentText = (paymentMethod: CustomerOrder['paymentMethod']) => {
  switch (paymentMethod) {
    case 'mercadopago':
      return 'Mercado Pago';
    case 'cash':
      return 'Efectivo';
    default:
      return 'Transferencia';
  }
};

const getShippingText = (order: CustomerOrder) => {
  if (order.deliveryMethod === 'pickup') {
    return 'Retiro en local';
  }

  if (order.shippingMethod === 'uber') {
    return `Envío por Uber${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`;
  }

  return order.shippingRequiresQuote
    ? `Encomienda a cotizar${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`
    : `Encomienda${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`;
};

const getOrderItemDetails = (item: CustomerOrder['items'][number]) =>
  [
    item.color,
    item.size,
    item.floweringStems ? `${item.floweringStems} ${item.floweringStems === 1 ? 'vara' : 'varas'}` : '',
  ].filter(Boolean);

const Orders: React.FC<OrdersProps> = ({ onBack, user }) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionOrderId, setActionOrderId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { confirm } = useConfirm();
  const toast = useToast();

  const loadOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setNotice('');

    try {
      const userOrders = await getSupabaseOrdersForUser(user.id);
      setOrders(userOrders);
    } catch (loadError) {
      console.error('Error cargando pedidos de Supabase:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus pedidos.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [user]);

  const cancelOrder = async (order: CustomerOrder) => {
    if (!isOrderCancelable(order)) {
      setError('Este pedido ya fue confirmado y no puede cancelarse desde acá.');
      toast.warning('Este pedido ya fue confirmado y no puede cancelarse desde acá.');
      return;
    }

    const confirmed = await confirm({
      title: 'Cancelar pedido',
      message: '¿Seguro que querés cancelar este pedido?',
      confirmLabel: 'Cancelar pedido',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setActionOrderId(order.id);
    setError('');
    setNotice('');

    try {
      await cancelSupabaseOrder(order.id);
      setNotice('Pedido cancelado correctamente.');
      toast.success('Pedido cancelado correctamente.');
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === order.id
          ? { ...currentOrder, status: 'cancelled', paymentStatus: 'cancelled' }
          : currentOrder
      );
      await loadOrders();
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar el pedido.';
      setError(message);
      toast.error(message);
    } finally {
      setActionOrderId('');
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EF] px-4">
        <div className="rounded-2xl border border-[#F1E3D4] bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="mb-4 text-2xl font-bold text-[#16352B]">Acceso requerido</h2>
          <p className="mb-6 text-[#6B7280]">Debés iniciar sesión para ver tus pedidos.</p>
          <button
            onClick={onBack}
            className="rounded-lg bg-[#0F8F61] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#0C7A52]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-[#FFF8EF]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <button
            onClick={() => setSelectedOrder(null)}
            className="mb-6 flex items-center space-x-2 text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver a mis pedidos</span>
          </button>

          <div className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-[#16352B]">Pedido #{selectedOrder.orderNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                {getStatusText(selectedOrder.status)}
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
            )}

            {notice && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del pedido</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-700">
                      Fecha: {new Date(selectedOrder.date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-700">Pago: {getPaymentText(selectedOrder.paymentMethod)}</span>
                  </div>
                  <div className="flex items-center">
                    {selectedOrder.deliveryMethod === 'pickup' ? (
                      <Home className="h-5 w-5 text-gray-400 mr-3" />
                    ) : (
                      <Truck className="h-5 w-5 text-gray-400 mr-3" />
                    )}
                    <span className="text-gray-700">{getShippingText(selectedOrder)}</span>
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

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de contacto</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Nombre:</strong> {selectedOrder.customerInfo.firstName} {selectedOrder.customerInfo.lastName}</p>
                  <p><strong>Email:</strong> {selectedOrder.customerInfo.email}</p>
                  <p><strong>Teléfono:</strong> {selectedOrder.customerInfo.phone}</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos</h3>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex flex-col gap-3 rounded-lg bg-[#FFF8EF] p-4 sm:flex-row sm:items-center sm:space-x-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      {getOrderItemDetails(item).length > 0 && (
                        <p className="text-xs text-gray-500">{getOrderItemDetails(item).join(' · ')}</p>
                      )}
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-800 sm:text-right">{formatMoney(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-[#FFF8EF] p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de pago</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatMoney(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedOrder.deliveryMethod === 'pickup' ? 'Retiro en local:' : 'Envío:'}</span>
                  <span>
                    {selectedOrder.deliveryMethod === 'pickup'
                      ? 'GRATIS'
                      : selectedOrder.shippingRequiresQuote
                        ? 'A cotizar'
                        : formatMoney(selectedOrder.shipping)}
                  </span>
                </div>
                {selectedOrder.paymentFee > 0 && (
                  <div className="flex justify-between">
                    <span>Recargo Mercado Pago (10%):</span>
                    <span>{formatMoney(selectedOrder.paymentFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>{selectedOrder.shippingRequiresQuote ? 'Total parcial:' : 'Total:'}</span>
                  <span className="text-emerald-600">{formatMoney(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {isOrderCancelable(selectedOrder) && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => cancelOrder(selectedOrder)}
                  disabled={actionOrderId === selectedOrder.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {actionOrderId === selectedOrder.id ? 'Cancelando...' : 'Cancelar pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EF]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center space-x-2 text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center">
            <Package className="mr-3 h-8 w-8 text-[#0F8F61]" />
            <h1 className="text-2xl font-bold text-[#16352B] sm:text-3xl">Mis pedidos</h1>
          </div>

          {error && (
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadOrders()}
                disabled={isLoading}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Cargando...' : 'Reintentar'}
              </button>
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</div>
          )}

          {isLoading ? (
            <OrdersSkeleton />
          ) : !error && orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="mb-2 text-xl font-semibold text-[#16352B]">Todavía no tenés pedidos</h3>
              <p className="text-gray-500 mb-6">Explorá nuestro catálogo y realizá tu primera compra.</p>
              <button
                onClick={onBack}
                className="rounded-lg bg-[#0F8F61] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#0C7A52]"
              >
                Ver catálogo
              </button>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-[#F1E3D4] p-4 transition-shadow hover:shadow-md sm:p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">Pedido #{order.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('es-ES')}</p>
                      <p className="text-lg font-bold text-emerald-600">{formatMoney(order.total)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600">
                        {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500">{getShippingText(order)}</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      {isOrderCancelable(order) && (
                        <button
                          type="button"
                          onClick={() => cancelOrder(order)}
                          disabled={actionOrderId === order.id}
                          className="flex min-h-11 items-center justify-center space-x-2 rounded-lg bg-red-50 px-4 py-2 text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{actionOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex min-h-11 items-center justify-center space-x-2 rounded-lg bg-[#E8F7EF] px-4 py-2 text-[#0F8F61] transition-colors hover:bg-[#D2EBDD]"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Ver detalles</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Orders;
