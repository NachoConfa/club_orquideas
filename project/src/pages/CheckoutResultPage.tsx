import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Home,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
} from '../lib/icons';
import type { CartItem } from '../types/cart';

export type CheckoutResultStatus = 'success' | 'failure' | 'pending';

export interface CheckoutResultData {
  status: CheckoutResultStatus;
  orderId?: string;
  orderNumber?: string;
  paymentId?: string;
  paymentStatus?: string;
  total?: number;
  paymentMethod?: string;
  deliveryMethod?: string;
  shippingLabel?: string;
  shippingRequiresQuote?: boolean;
  emailSent?: boolean;
  source?: 'manual' | 'mercadopago' | 'url';
  items?: CartItem[];
}

interface CheckoutResultPageProps {
  result: CheckoutResultData;
  items: CartItem[];
  onBackHome: () => void;
  onBackToCart: () => void;
  onBackToCheckout: () => void;
  onViewOrders: () => void;
}

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

const getPaymentText = (method?: string) => {
  if (method === 'mercadopago') return 'Mercado Pago';
  if (method === 'cash') return 'Efectivo';
  if (method === 'transfer') return 'Transferencia bancaria';
  return 'A confirmar';
};

const getDeliveryText = (method?: string) => {
  if (method === 'pickup') return 'Retiro en local';
  if (method === 'delivery') return 'Envío a domicilio';
  return 'A coordinar';
};

const getResultConfig = (status: CheckoutResultStatus) => {
  if (status === 'failure') {
    return {
      icon: <AlertCircle className="h-12 w-12 text-[#D96C9F]" />,
      iconBg: 'bg-[#F8DDEB]',
      eyebrow: 'Pago no completado',
      title: 'No pudimos procesar el pago',
      message:
        'El pago no se completó o fue rechazado. Podés intentarlo nuevamente o elegir otro método de pago.',
    };
  }

  if (status === 'pending') {
    return {
      icon: <Clock3 className="h-12 w-12 text-[#B88746]" />,
      iconBg: 'bg-[#EADBC8]',
      eyebrow: 'Pago pendiente',
      title: 'Pago pendiente',
      message: 'Tu pago está pendiente de confirmación. Te avisaremos cuando se acredite.',
    };
  }

  return {
    icon: <CheckCircle2 className="h-12 w-12 text-[#5FAE9B]" />,
    iconBg: 'bg-[#CFE3D4]',
    eyebrow: 'Pedido recibido',
    title: 'Compra realizada con exito',
    message:
      'Gracias por tu compra. Recibimos tu pedido y te vamos a contactar para coordinar la entrega.',
  };
};

const getResultMessage = (result: CheckoutResultData, fallback: string) => {
  if (result.status === 'success' && result.paymentMethod === 'cash') {
    return 'Pedido recibido. Podes abonar en efectivo al retirar o al momento de la entrega.';
  }

  if (result.status === 'success' && result.paymentMethod === 'transfer') {
    return 'Pedido recibido. La compra queda pendiente hasta confirmar la transferencia.';
  }

  return fallback;
};

const CheckoutResultPage = ({
  result,
  items,
  onBackHome,
  onBackToCart,
  onBackToCheckout,
  onViewOrders,
}: CheckoutResultPageProps) => {
  const config = getResultConfig(result.status);
  const resultItems = result.items && result.items.length > 0 ? result.items : items;
  const total =
    result.total ??
    resultItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-[calc(100vh-88px)] bg-[#FFF8EF] px-4 py-10 text-[#2F3A35]">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-[#EADBC8]/80 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-[#F8DDEB]/35 p-8 sm:p-10">
              <div className={`mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full ${config.iconBg}`}>
                {config.icon}
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#D96C9F]">
                {config.eyebrow}
              </p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {config.title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#6B756F]">
                {getResultMessage(result, config.message)}
              </p>

              {result.status === 'success' && (
                <p className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#CFE3D4]/45 p-4 text-sm leading-6 text-[#2F3A35]">
                  El estado real del pago online se confirma por Mercado Pago. Esta pantalla no marca pagos como acreditados por si sola.
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {result.status !== 'failure' && (
                  <button
                    type="button"
                    onClick={onViewOrders}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D96C9F] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#C8568B]"
                  >
                    <PackageCheck className="h-5 w-5" />
                    Ver mis pedidos
                  </button>
                )}

                {(result.status === 'failure' || result.status === 'pending') && (
                  <button
                    type="button"
                    onClick={onBackToCheckout}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D96C9F] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#C8568B]"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Volver al pago
                  </button>
                )}

                {result.status === 'failure' && (
                  <button
                    type="button"
                    onClick={onBackToCart}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#7FAF9B] px-5 py-3 font-semibold text-[#2F3A35] transition-colors hover:bg-[#CFE3D4]/60"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Volver al carrito
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EADBC8] px-5 py-3 font-semibold text-[#2F3A35] transition-colors hover:bg-[#FFF8EF]"
                >
                  <Home className="h-5 w-5" />
                  Volver al inicio
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <h2 className="text-xl font-semibold">Resumen</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#EADBC8]/80 bg-[#FFF8EF] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B756F]">Pedido</p>
                  <p className="mt-2 font-semibold">{result.orderNumber || result.orderId || 'A confirmar'}</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/80 bg-[#FFF8EF] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B756F]">Total</p>
                  <p className="mt-2 font-semibold">{total > 0 ? formatMoney(total) : 'A confirmar'}</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/80 bg-[#FFF8EF] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B756F]">Pago</p>
                  <p className="mt-2 font-semibold">{getPaymentText(result.paymentMethod)}</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/80 bg-[#FFF8EF] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B756F]">Entrega</p>
                  <p className="mt-2 font-semibold">{result.shippingLabel || getDeliveryText(result.deliveryMethod)}</p>
                </div>
              </div>

              {(result.paymentStatus || result.paymentId) && (
                <div className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#CFE3D4]/35 p-4 text-sm text-[#2F3A35]">
                  {result.paymentStatus && <p>Estado informado por el proveedor: {result.paymentStatus}</p>}
                  {result.paymentId && <p className="mt-1">Pago: {result.paymentId}</p>}
                </div>
              )}

              {result.shippingRequiresQuote && (
                <div className="mt-4 rounded-2xl border border-[#EADBC8] bg-[#FFF8EF] p-4 text-sm text-[#6B756F]">
                  El envio requiere cotizacion manual. Te vamos a confirmar el costo final antes de despachar.
                </div>
              )}

              {resultItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#6B756F]">
                    Productos
                  </h3>
                  <div className="space-y-3">
                    {resultItems.slice(0, 4).map((item) => (
                      <div key={item.cartKey} className="flex items-center gap-3 rounded-2xl border border-[#EADBC8]/70 p-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="text-sm text-[#6B756F]">
                            {item.quantity} x {formatMoney(item.price)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatMoney(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onBackToCheckout}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#6B756F] transition-colors hover:text-[#2F3A35]"
              >
                <ArrowLeft className="h-4 w-4" />
                Revisar checkout
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CheckoutResultPage;
