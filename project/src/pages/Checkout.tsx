import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Home,
  Shield,
  Truck,
} from 'lucide-react';
import TurnstileWidget from '../components/TurnstileWidget';
import type { CheckoutResultData } from './CheckoutResultPage';
import { sendOrderReceivedEmail } from '../services/emailService';
import { trackOrderCreated } from '../services/analyticsService';
import { createMercadoPagoPreference } from '../services/mercadoPagoService';
import { createSupabaseOrder } from '../services/orderSupabaseService';
import {
  calculateShippingQuote,
  getShippingZones,
  type ShippingQuote,
  type ShippingZone,
} from '../services/shippingService';
import {
  TURNSTILE_FAILED_MESSAGE,
  TURNSTILE_REQUIRED_MESSAGE,
  isTurnstileEnabled,
  verifyTurnstileToken,
} from '../services/turnstileService';

interface CartItem {
  cartKey: string;
  id: number;
  sourceId?: string;
  variantId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
  stock?: number;
}

interface CheckoutProps {
  items: CartItem[];
  onBack: () => void;
  onOrderComplete: (result: CheckoutResultData) => void;
  user: { id?: string; name: string; email: string; phone?: string; address?: string } | null;
}

type PaymentMethod = 'transfer' | 'cash' | 'mercadopago';
type SelectedPaymentMethod = PaymentMethod | '';

const MERCADO_PAGO_SURCHARGE_RATE = 0.1;

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;
const roundMoney = (value: number) => Math.round(value);
const getMercadoPagoFee = (baseTotal: number) => roundMoney(baseTotal * MERCADO_PAGO_SURCHARGE_RATE);
const CASH_UNAVAILABLE_MESSAGE =
  'El pago en efectivo solo esta disponible para retiro en local o envios dentro de Nordelta/Tigre cercano.';
const SHIPPING_LOCATION_REQUIRED_MESSAGE =
  'Completa tu localidad y provincia para calcular el envio antes de elegir el metodo de pago.';
const SHIPPING_QUOTE_REQUIRED_MESSAGE =
  'Este envio requiere cotizacion. Te vamos a contactar para confirmar el costo antes de pagar.';

const normalizeZoneText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const LOCAL_CASH_ZONE_TERMS = [
  'nordelta',
  'tigre cercano',
  'zona norte cercana',
  'zona local',
  'envio local',
  'local permitida',
];

const allowsCashPayment = (deliveryMethod: 'delivery' | 'pickup', shippingQuote: ShippingQuote) => {
  if (deliveryMethod === 'pickup') {
    return true;
  }

  if (shippingQuote.requiresQuote) {
    return false;
  }

  const zoneText = normalizeZoneText(`${shippingQuote.zoneName ?? ''} ${shippingQuote.label}`);
  return LOCAL_CASH_ZONE_TERMS.some((term) => zoneText.includes(term));
};

const getCheckoutErrorMessage = (error: unknown) => {
  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    publicMessage?: string;
  };

  if (supabaseError?.publicMessage) {
    return supabaseError.publicMessage;
  }

  const errorText = [
    supabaseError?.message,
    supabaseError?.details,
    supabaseError?.hint,
    supabaseError?.code,
    error instanceof Error ? error.message : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (errorText.includes('STOCK_PRODUCT_REQUIRED')) {
    return 'Hay productos invalidos en el carrito. Eliminalos y agregalos nuevamente.';
  }

  if (errorText.includes('STOCK_PRODUCT_NOT_FOUND')) {
    return 'Uno de los productos ya no esta disponible.';
  }

  if (errorText.includes('STOCK_INSUFFICIENT')) {
    return 'No hay stock suficiente para uno o mas productos.';
  }

  if (errorText.includes('ORDER_USER_MISMATCH') || errorText.includes('AUTH_REQUIRED')) {
    return 'Inicia sesion nuevamente para finalizar tu compra.';
  }

  const publicPrefixes = [
    'Hay productos',
    'No hay stock',
    'Inicia sesion',
    'Tu sesion',
    'No pudimos preparar',
    'No pudimos completar',
  ];

  return error instanceof Error && publicPrefixes.some((prefix) => error.message.startsWith(prefix))
    ? error.message
    : 'No pudimos completar tu pedido. Revisa el carrito e intenta nuevamente.';
};

const Checkout: React.FC<CheckoutProps> = ({ items, onBack, onOrderComplete, user }) => {
  const [paymentMethod, setPaymentMethod] = useState<SelectedPaymentMethod>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittingRef = useRef(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const provinceInputRef = useRef<HTMLInputElement>(null);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [isLoadingShippingZones, setIsLoadingShippingZones] = useState(false);
  const [shippingZoneError, setShippingZoneError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    province: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((current) => ({
        ...current,
        email: user.email,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        phone: user.phone || current.phone,
        address: user.address || current.address,
      }));
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadShippingZones = async () => {
      setIsLoadingShippingZones(true);
      setShippingZoneError('');

      try {
        const zones = await getShippingZones();
        if (isMounted) {
          setShippingZones(zones);
        }
      } catch (error) {
        console.error('Error cargando zonas de envio:', error);
        if (isMounted) {
          setShippingZones([]);
          setShippingZoneError(
            error instanceof Error ? error.message : 'No se pudieron cargar las zonas de envío.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingShippingZones(false);
        }
      }
    };

    loadShippingZones();

    return () => {
      isMounted = false;
    };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingQuote = calculateShippingQuote(
    deliveryMethod,
    shippingZones,
    formData.city,
    formData.province,
    formData.address
  );
  const shipping = deliveryMethod === 'pickup' ? 0 : shippingQuote.amount;
  const hasDeliveryLocation = Boolean(formData.city.trim() && formData.province.trim());
  const hasResolvedShippingZone = Boolean(shippingQuote.zoneId || shippingQuote.zoneName);
  const hasClosedDeliveryShipping =
    deliveryMethod === 'delivery' &&
    hasDeliveryLocation &&
    !isLoadingShippingZones &&
    hasResolvedShippingZone &&
    !shippingQuote.requiresQuote;
  const canChoosePaymentMethod = deliveryMethod === 'pickup' || hasClosedDeliveryShipping;
  const paymentMethodsDisabled = !canChoosePaymentMethod;
  const baseTotal = subtotal + shipping;
  const paymentFee = paymentMethod === 'mercadopago' ? getMercadoPagoFee(baseTotal) : 0;
  const total = baseTotal + paymentFee;
  const shippingRequiresManualQuote =
    deliveryMethod === 'delivery' && hasDeliveryLocation && !isLoadingShippingZones && shippingQuote.requiresQuote;
  const cannotPayOnline = paymentMethodsDisabled;
  const cashPaymentAllowed = canChoosePaymentMethod && allowsCashPayment(deliveryMethod, shippingQuote);
  const shouldShowCaptcha = isTurnstileEnabled();
  const canShowFinalTotal = deliveryMethod === 'pickup' || hasClosedDeliveryShipping;
  const shippingDisplayText =
    deliveryMethod === 'pickup'
      ? 'GRATIS'
      : isLoadingShippingZones
        ? 'Calculando...'
        : !hasDeliveryLocation
          ? 'Pendiente de calcular'
          : shippingQuote.requiresQuote
            ? 'A cotizar'
            : formatMoney(shipping);
  const paymentDisabledMessage = shippingRequiresManualQuote
    ? SHIPPING_QUOTE_REQUIRED_MESSAGE
    : SHIPPING_LOCATION_REQUIRED_MESSAGE;
  const isSubmitDisabled = isProcessing || !formData.email.trim() || paymentMethodsDisabled || !paymentMethod;
  const submitButtonText = (() => {
    if (isProcessing) {
      return 'Procesando...';
    }

    if (paymentMethodsDisabled) {
      return shippingRequiresManualQuote ? 'Envio a cotizar' : 'Calcula el envio para continuar';
    }

    if (!paymentMethod) {
      return 'Elegi un metodo de pago';
    }

    return paymentMethod === 'mercadopago'
      ? `Continuar a Mercado Pago - ${formatMoney(total)}`
      : `Completar pedido - ${formatMoney(total)}`;
  })();

  useEffect(() => {
    if (deliveryMethod === 'pickup') {
      if (!paymentMethod) {
        setPaymentMethod('transfer');
      }
      return;
    }

    if (!canChoosePaymentMethod && paymentMethod) {
      setPaymentMethod('');
      return;
    }

    if (!cashPaymentAllowed && paymentMethod === 'cash') {
      setPaymentMethod('');
    }
  }, [canChoosePaymentMethod, cashPaymentAllowed, deliveryMethod, paymentMethod]);

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileResetKey((current) => current + 1);
  };

  const focusFirstMissingShippingField = () => {
    if (!formData.city.trim()) {
      cityInputRef.current?.focus();
      return;
    }

    if (!formData.province.trim()) {
      provinceInputRef.current?.focus();
    }
  };

  const getCustomerInfoForOrder = () =>
    deliveryMethod === 'pickup'
      ? {
          ...formData,
          address: formData.address || 'Av. De los Lagos 7000, Nordelta',
          city: formData.city || 'Nordelta',
          province: formData.province || 'Buenos Aires',
          postalCode: formData.postalCode || '',
        }
      : formData;

  const sendConfirmationEmail = async (orderId: string) => {
    try {
      const emailResult = await sendOrderReceivedEmail(orderId);
      return emailResult.success;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  };

  const openWhatsAppNotification = () => {
    const orderDetails = items
      .map((item) => `${item.quantity}x ${item.name} - ${formatMoney(item.price * item.quantity)}`)
      .join('\n');
    const shippingLine =
      deliveryMethod === 'pickup'
        ? 'Retiro en local: GRATIS'
        : shippingQuote.requiresQuote
          ? `${shippingQuote.label}: a cotizar`
          : `${shippingQuote.label}: ${formatMoney(shipping)}`;
    const paymentFeeLine = paymentFee > 0 ? `Recargo Mercado Pago (10%): ${formatMoney(paymentFee)}\n` : '';
    const paymentLabel =
      paymentMethod === 'cash'
        ? 'Efectivo'
        : paymentMethod === 'mercadopago'
          ? 'Mercado Pago'
          : 'Transferencia bancaria';
    const message =
      `NUEVA ORDEN - Club de Las Orquideas\n\n` +
      `Cliente: ${formData.firstName} ${formData.lastName}\n` +
      `Email: ${formData.email}\n` +
      `Telefono: ${formData.phone}\n` +
      `${
        deliveryMethod === 'pickup'
          ? 'RETIRO EN LOCAL'
          : `Direccion: ${formData.address}, ${formData.city}, ${formData.province}`
      }\n\n` +
      `PRODUCTOS:\n${orderDetails}\n\n` +
      `Subtotal: ${formatMoney(subtotal)}\n` +
      `${shippingLine}\n` +
      paymentFeeLine +
      `TOTAL: ${formatMoney(total)}\n\n` +
      `Metodo de pago: ${paymentLabel}` +
      `${
        paymentMethod === 'transfer'
          ? '\n\nPENDIENTE: Esperando comprobante de transferencia a CBU 0000003100056904758628'
          : ''
      }` +
      `${
        shippingQuote.requiresQuote
          ? '\n\nENVIO A COTIZAR: confirmar costo final antes de solicitar pago.'
          : ''
      }`;

    const whatsappNumber = '+5491122906442';
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isProcessing) {
      return;
    }

    if (items.length === 0) {
      alert('Tu carrito esta vacio.');
      return;
    }

    if (!formData.email.trim()) {
      alert('Por favor, ingresa un email valido para recibir la confirmacion del pedido.');
      return;
    }

    if (deliveryMethod === 'delivery' && !hasDeliveryLocation) {
      alert(SHIPPING_LOCATION_REQUIRED_MESSAGE);
      focusFirstMissingShippingField();
      return;
    }

    if (deliveryMethod === 'delivery' && !formData.address.trim()) {
      alert('Completa la direccion para coordinar el envio.');
      return;
    }

    if (deliveryMethod === 'delivery' && isLoadingShippingZones) {
      alert('Estamos calculando el envio. Espera unos segundos e intenta nuevamente.');
      return;
    }

    if (deliveryMethod === 'delivery' && !hasClosedDeliveryShipping) {
      alert(shippingRequiresManualQuote ? SHIPPING_QUOTE_REQUIRED_MESSAGE : SHIPPING_LOCATION_REQUIRED_MESSAGE);
      focusFirstMissingShippingField();
      return;
    }

    if (!user?.id) {
      alert('Inicia sesion antes de completar el pedido.');
      return;
    }

    if (!paymentMethod) {
      alert('Elegi un metodo de pago para continuar.');
      return;
    }

    if (paymentMethod === 'cash' && !cashPaymentAllowed) {
      alert('El pago en efectivo no esta disponible para esta zona de envio.');
      setPaymentMethod('');
      return;
    }

    if (shouldShowCaptcha && !turnstileToken) {
      alert(TURNSTILE_REQUIRED_MESSAGE);
      return;
    }

    isSubmittingRef.current = true;
    setIsProcessing(true);

    try {
      if (shouldShowCaptcha) {
        const turnstileVerification = await verifyTurnstileToken(turnstileToken);

        if (!turnstileVerification.success) {
          alert(turnstileVerification.error || TURNSTILE_FAILED_MESSAGE);
          resetTurnstile();
          return;
        }
      }

      const customerInfoForOrder = getCustomerInfoForOrder();
      const savedOrder = await createSupabaseOrder({
        userId: user.id,
        items,
        subtotal,
        shipping: deliveryMethod === 'pickup' ? 0 : shipping,
        shippingMethod: deliveryMethod === 'pickup' ? 'pickup' : shippingQuote.method,
        shippingZoneId: deliveryMethod === 'pickup' ? undefined : shippingQuote.zoneId,
        shippingZoneName: deliveryMethod === 'pickup' ? 'Retiro en local' : shippingQuote.zoneName,
        shippingRequiresQuote: deliveryMethod === 'pickup' ? false : shippingQuote.requiresQuote,
        paymentFee,
        total,
        paymentMethod,
        deliveryMethod,
        customerInfo: customerInfoForOrder,
      });
      trackOrderCreated({ id: savedOrder.id, total });
      const receivedEmailWasSent = await sendConfirmationEmail(savedOrder.id);

      if (paymentMethod === 'mercadopago') {
        try {
          const preference = await createMercadoPagoPreference(savedOrder.id);
          window.location.assign(preference.initPoint);
        } catch (preferenceError) {
          console.error('Pedido creado, pero no se pudo generar la preferencia de Mercado Pago:', preferenceError);
          alert('Recibimos tu pedido, pero no pudimos abrir Mercado Pago. Revisalo en Mis pedidos para coordinar el pago.');
          onOrderComplete({
            status: 'pending',
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            total,
            paymentMethod,
            deliveryMethod,
            shippingLabel: deliveryMethod === 'pickup' ? 'Retiro en local sin costo' : shippingQuote.label,
            shippingRequiresQuote: deliveryMethod === 'delivery' && shippingQuote.requiresQuote,
            emailSent: receivedEmailWasSent,
            source: 'mercadopago',
            items,
          });
        }
        return;
      }

      openWhatsAppNotification();
      onOrderComplete({
        status: 'success',
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        total,
        paymentMethod,
        deliveryMethod,
        shippingLabel: deliveryMethod === 'pickup' ? 'Retiro en local sin costo' : shippingQuote.label,
        shippingRequiresQuote: deliveryMethod === 'delivery' && shippingQuote.requiresQuote,
        emailSent: receivedEmailWasSent,
        source: 'manual',
        items,
      });
    } catch (error) {
      const supabaseError = error as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      console.error('Checkout submit error original:', error);
      console.error('Checkout submit error message:', supabaseError?.message);
      console.error('Checkout submit error details:', supabaseError?.details);
      console.error('Checkout submit error hint:', supabaseError?.hint);
      console.error('Checkout submit error code:', supabaseError?.code);
      console.error('Cart items al fallar:', items);
      console.error('Usuario actual:', user);
      console.error('Método entrega:', deliveryMethod);
      console.error('Método pago:', paymentMethod);
      console.error('Error guardando pedido en Supabase:', error);
      alert(getCheckoutErrorMessage(error));
      resetTurnstile();
    } finally {
      isSubmittingRef.current = false;
      setIsProcessing(false);
    }
  };

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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Informacion del pedido</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Correo electronico"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />

              <input
                type="tel"
                placeholder="Telefono"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Metodo de entrega</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={() => setDeliveryMethod('delivery')}
                      className="mr-3"
                    />
                    <Truck className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <span className="font-medium">Envio a domicilio</span>
                      <p className="text-sm text-gray-500">Calculado por zona.</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={() => setDeliveryMethod('pickup')}
                      className="mr-3"
                    />
                    <Home className="h-5 w-5 text-green-500 mr-3" />
                    <div>
                      <span className="font-medium">Retiro en local</span>
                      <p className="text-sm text-gray-500">Av. De los Lagos 7000, Nordelta - sin costo.</p>
                    </div>
                  </label>
                </div>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800">Direccion de envio</h4>

                  <input
                    type="text"
                    placeholder="Direccion completa"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      ref={cityInputRef}
                      type="text"
                      placeholder="Ciudad o localidad"
                      value={formData.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                    <input
                      ref={provinceInputRef}
                      type="text"
                      placeholder="Provincia"
                      value={formData.province}
                      onChange={(e) => updateForm('province', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Codigo postal"
                    value={formData.postalCode}
                    onChange={(e) => updateForm('postalCode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />

                  <div className="rounded-lg border border-blue-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{shippingQuote.label}</p>
                        <p className="mt-1 text-sm text-gray-600">{shippingQuote.description}</p>
                        {shippingZoneError && (
                          <p className="mt-2 text-sm text-red-600">{shippingZoneError}</p>
                        )}
                      </div>
                      <div className="text-right font-bold text-gray-900">
                        {shippingDisplayText}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Metodo de pago</h3>
                {paymentMethodsDisabled && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {paymentDisabledMessage}
                  </div>
                )}
                <div className="space-y-3">
                  <label
                    className={`flex items-center p-4 border rounded-lg ${
                      paymentMethodsDisabled ? 'bg-gray-50 text-gray-400' : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      disabled={paymentMethodsDisabled}
                      onChange={() => {
                        if (!paymentMethodsDisabled) {
                          setPaymentMethod('transfer');
                        }
                      }}
                      className="mr-3"
                    />
                    <Banknote className="h-5 w-5 text-green-500 mr-3" />
                    <span>Transferencia bancaria</span>
                  </label>

                  <label
                    className={`flex items-center p-4 border rounded-lg ${
                      cashPaymentAllowed ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      disabled={!cashPaymentAllowed}
                      onChange={() => {
                        if (cashPaymentAllowed) {
                          setPaymentMethod('cash');
                        }
                      }}
                      className="mr-3"
                    />
                    <Banknote className="h-5 w-5 text-orange-500 mr-3" />
                    <div>
                      <span>Pago en efectivo {deliveryMethod === 'pickup' ? '(en el local)' : '(contra entrega)'}</span>
                      {canChoosePaymentMethod && !cashPaymentAllowed && (
                        <p className="mt-1 text-sm text-gray-500">{CASH_UNAVAILABLE_MESSAGE}</p>
                      )}
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-4 border rounded-lg ${
                      cannotPayOnline ? 'bg-gray-50 text-gray-400' : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="mercadopago"
                      checked={paymentMethod === 'mercadopago'}
                      disabled={cannotPayOnline}
                      onChange={() => {
                        if (!cannotPayOnline) {
                          setPaymentMethod('mercadopago');
                        }
                      }}
                      className="mr-3"
                    />
                    <CreditCard className="h-5 w-5 text-sky-500 mr-3" />
                    <div>
                      <span>Mercado Pago</span>
                      <p className="text-sm text-gray-500">
                        {cannotPayOnline
                          ? paymentDisabledMessage
                          : 'Tarjeta, dinero en cuenta y otros medios disponibles. Incluye recargo del 10%.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {paymentMethod === 'transfer' && canChoosePaymentMethod && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3">Datos para transferencia bancaria</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-green-700">CBU:</span>
                      <span className="font-mono font-semibold text-green-800">0000003100056904758628</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-green-700">Titular:</span>
                      <span className="font-semibold text-green-800">Ignacio Adrian Confalonieri</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-green-700">Alias:</span>
                      <span className="font-semibold text-green-800">ignacio.confalonieri</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-green-700">CUIT:</span>
                      <span className="font-mono font-semibold text-green-800">20-47436820-4</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-yellow-800">
                    Despues de realizar la transferencia, envia el comprobante por WhatsApp para confirmar tu pedido.
                  </p>
                </div>
              )}

              {shouldShowCaptcha && (
                <TurnstileWidget
                  key={`checkout-${turnstileResetKey}`}
                  action="checkout"
                  onVerify={setTurnstileToken}
                />
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitButtonText}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Resumen del pedido</h3>

            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.cartKey} className="flex items-center space-x-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.size} - {item.color}</p>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-800">{formatMoney(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{deliveryMethod === 'pickup' ? 'Retiro en local:' : 'Envio:'}</span>
                <span className={shippingQuote.requiresQuote ? 'font-semibold text-amber-600' : ''}>
                  {shippingDisplayText}
                </span>
              </div>
              {paymentFee > 0 && (
                <div className="flex justify-between">
                  <span>Recargo Mercado Pago (10%):</span>
                  <span>{formatMoney(paymentFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>{canShowFinalTotal ? 'Total:' : 'Total a confirmar:'}</span>
                <span>{canShowFinalTotal ? formatMoney(total) : 'A confirmar'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                <span>Compra segura y pedido registrado correctamente</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                {deliveryMethod === 'delivery' ? (
                  <Truck className="h-4 w-4 mr-2 text-blue-500" />
                ) : (
                  <Home className="h-4 w-4 mr-2 text-green-500" />
                )}
                <span>{shippingQuote.description}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
