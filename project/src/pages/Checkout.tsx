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
import { useToast } from '../components/feedback/ToastProvider';
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
  floweringStems?: number;
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
  'El pago en efectivo solo está disponible para retiro en local o envíos dentro de Nordelta/Tigre cercano.';
const SHIPPING_LOCATION_REQUIRED_MESSAGE =
  'Completá tu localidad y provincia para calcular el envío antes de elegir el método de pago.';
const SHIPPING_QUOTE_REQUIRED_MESSAGE =
  'Este envío requiere cotización. Te vamos a contactar para confirmar el costo antes de pagar.';

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
    return 'Iniciá sesión nuevamente para finalizar tu compra.';
  }

  const publicPrefixes = [
    'Hay productos',
    'No hay stock',
    'Iniciá sesión',
    'Tu sesión',
    'No pudimos preparar',
    'No pudimos completar',
  ];

  return error instanceof Error && publicPrefixes.some((prefix) => error.message.startsWith(prefix))
    ? error.message
    : 'No pudimos completar tu pedido. Revisa el carrito e intenta nuevamente.';
};

const redactEmailForDebug = (email?: string) => {
  if (!email) {
    return '';
  }

  const [localPart, domain] = email.split('@');
  return `${localPart?.slice(0, 2) || '**'}***@${domain || '***'}`;
};

const redactUserForDebug = (user: CheckoutProps['user']) =>
  user
    ? {
        idPrefix: user.id?.slice(0, 8),
        email: redactEmailForDebug(user.email),
        hasPhone: Boolean(user.phone),
        hasAddress: Boolean(user.address),
      }
    : null;

const redactCartItemsForDebug = (items: CartItem[]) =>
  items.map((item) => ({
    cartKey: item.cartKey,
    id: item.id,
    hasSourceId: Boolean(item.sourceId),
    hasVariantId: Boolean(item.variantId),
    quantity: item.quantity,
    price: item.price,
  }));

const Checkout: React.FC<CheckoutProps> = ({ items, onBack, onOrderComplete, user }) => {
  const [paymentMethod, setPaymentMethod] = useState<SelectedPaymentMethod>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittingRef = useRef(false);
  const toast = useToast();
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
        if (import.meta.env.DEV) {
          console.error('Error cargando zonas de envio:', error);
        }
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
      return shippingRequiresManualQuote ? 'Envío a cotizar' : 'Calculá el envío para continuar';
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
      if (import.meta.env.DEV) {
        console.error('Error enviando email:', error);
      }
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
      `NUEVA ORDEN - Modo Plantas\n\n` +
      `Cliente: ${formData.firstName} ${formData.lastName}\n` +
      `Email: ${formData.email}\n` +
      `Teléfono: ${formData.phone}\n` +
      `${
        deliveryMethod === 'pickup'
          ? 'RETIRO EN LOCAL'
          : `Dirección: ${formData.address}, ${formData.city}, ${formData.province}`
      }\n\n` +
      `PRODUCTOS:\n${orderDetails}\n\n` +
      `Subtotal: ${formatMoney(subtotal)}\n` +
      `${shippingLine}\n` +
      paymentFeeLine +
      `TOTAL: ${formatMoney(total)}\n\n` +
      `Método de pago: ${paymentLabel}` +
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
      toast.warning('Tu carrito está vacío.');
      return;
    }

    if (!formData.email.trim()) {
      toast.warning('Por favor, ingresá un email válido para recibir la confirmación del pedido.');
      return;
    }

    if (deliveryMethod === 'delivery' && !hasDeliveryLocation) {
      toast.warning(SHIPPING_LOCATION_REQUIRED_MESSAGE);
      focusFirstMissingShippingField();
      return;
    }

    if (deliveryMethod === 'delivery' && !formData.address.trim()) {
      toast.warning('Completá la dirección para coordinar el envío.');
      return;
    }

    if (deliveryMethod === 'delivery' && isLoadingShippingZones) {
      toast.info('Estamos calculando el envío. Esperá unos segundos e intentá nuevamente.');
      return;
    }

    if (deliveryMethod === 'delivery' && !hasClosedDeliveryShipping) {
      toast.warning(shippingRequiresManualQuote ? SHIPPING_QUOTE_REQUIRED_MESSAGE : SHIPPING_LOCATION_REQUIRED_MESSAGE);
      focusFirstMissingShippingField();
      return;
    }

    if (!user?.id) {
      toast.warning('Iniciá sesión antes de completar el pedido.');
      return;
    }

    if (!paymentMethod) {
      toast.warning('Elegí un método de pago para continuar.');
      return;
    }

    if (paymentMethod === 'cash' && !cashPaymentAllowed) {
      toast.warning('El pago en efectivo no está disponible para esta zona de envío.');
      setPaymentMethod('');
      return;
    }

    if (shouldShowCaptcha && !turnstileToken) {
      toast.warning(TURNSTILE_REQUIRED_MESSAGE);
      return;
    }

    isSubmittingRef.current = true;
    setIsProcessing(true);

    try {
      if (shouldShowCaptcha) {
        const turnstileVerification = await verifyTurnstileToken(turnstileToken);

        if (!turnstileVerification.success) {
          toast.error(turnstileVerification.error || TURNSTILE_FAILED_MESSAGE);
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
          if (import.meta.env.DEV) {
            console.error('Pedido creado, pero no se pudo generar la preferencia de Mercado Pago:', preferenceError);
          }
          toast.warning('Recibimos tu pedido, pero no pudimos abrir Mercado Pago. Revisalo en Mis pedidos para coordinar el pago.');
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

      if (import.meta.env.DEV) {
        console.error('Checkout submit error original:', error);
        console.error('Checkout submit error message:', supabaseError?.message);
        console.error('Checkout submit error details:', supabaseError?.details);
        console.error('Checkout submit error hint:', supabaseError?.hint);
        console.error('Checkout submit error code:', supabaseError?.code);
        console.error('Cart items al fallar redacted:', redactCartItemsForDebug(items));
        console.error('Usuario actual redacted:', redactUserForDebug(user));
        console.error('Método entrega:', deliveryMethod);
        console.error('Método pago:', paymentMethod);
      }
      toast.error(getCheckoutErrorMessage(error));
      resetTurnstile();
    } finally {
      isSubmittingRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8EF]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <button
          onClick={onBack}
          className="mb-6 flex items-center space-x-2 text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al carrito</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-[#F1E3D4] bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-[#16352B]">Información del pedido</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                  required
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                required
              />

              <input
                type="tel"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                required
              />

              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-[#16352B]">Método de entrega</h3>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center rounded-xl border border-[#F1E3D4] p-4 transition-colors hover:bg-[#E8F7EF]">
                    <input
                      type="radio"
                      name="delivery"
                      value="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={() => setDeliveryMethod('delivery')}
                      className="mr-3"
                    />
                    <Truck className="mr-3 h-5 w-5 text-[#0F8F61]" />
                    <div>
                      <span className="font-medium text-[#16352B]">Envío a domicilio</span>
                      <p className="text-sm text-[#6B7280]">Calculado por zona.</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center rounded-xl border border-[#F1E3D4] p-4 transition-colors hover:bg-[#E8F7EF]">
                    <input
                      type="radio"
                      name="delivery"
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={() => setDeliveryMethod('pickup')}
                      className="mr-3"
                    />
                    <Home className="mr-3 h-5 w-5 text-[#0F8F61]" />
                    <div>
                      <span className="font-medium text-[#16352B]">Retiro en local</span>
                      <p className="text-sm text-[#6B7280]">Av. De los Lagos 7000, Nordelta - sin costo.</p>
                    </div>
                  </label>
                </div>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="mt-4 space-y-4 rounded-xl border border-[#D2EBDD] bg-[#E8F7EF] p-4">
                  <h4 className="font-semibold text-[#16352B]">Dirección de envío</h4>

                  <input
                    type="text"
                    placeholder="Dirección completa"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-white"
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      ref={cityInputRef}
                      type="text"
                      placeholder="Ciudad o localidad"
                      value={formData.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-white"
                      required
                    />
                    <input
                      ref={provinceInputRef}
                      type="text"
                      placeholder="Provincia"
                      value={formData.province}
                      onChange={(e) => updateForm('province', e.target.value)}
                      className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Código postal"
                    value={formData.postalCode}
                    onChange={(e) => updateForm('postalCode', e.target.value)}
                    className="w-full rounded-lg border border-[#F1E3D4] px-4 py-3 text-[#16352B] focus:border-[#0F8F61] focus:ring-2 focus:ring-white"
                    required
                  />

                  <div className="rounded-lg border border-[#D2EBDD] bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#16352B]">{shippingQuote.label}</p>
                        <p className="mt-1 text-sm text-[#6B7280]">{shippingQuote.description}</p>
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
                <h3 className="mb-4 text-lg font-semibold text-[#16352B]">Método de pago</h3>
                {paymentMethodsDisabled && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {paymentDisabledMessage}
                  </div>
                )}
                <div className="space-y-3">
                  <label
                    className={`flex items-center rounded-xl border border-[#F1E3D4] p-4 ${
                      paymentMethodsDisabled ? 'bg-gray-50 text-gray-400' : 'cursor-pointer transition-colors hover:bg-[#E8F7EF]'
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
                    <Banknote className="mr-3 h-5 w-5 text-[#0F8F61]" />
                    <span>Transferencia bancaria</span>
                  </label>

                  <label
                    className={`flex items-center rounded-xl border border-[#F1E3D4] p-4 ${
                      cashPaymentAllowed ? 'cursor-pointer transition-colors hover:bg-[#E8F7EF]' : 'bg-gray-50 text-gray-400'
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
                    <Banknote className="mr-3 h-5 w-5 text-[#D96C9F]" />
                    <div>
                      <span>Pago en efectivo {deliveryMethod === 'pickup' ? '(en el local)' : '(contra entrega)'}</span>
                      {canChoosePaymentMethod && !cashPaymentAllowed && (
                        <p className="mt-1 text-sm text-[#6B7280]">{CASH_UNAVAILABLE_MESSAGE}</p>
                      )}
                    </div>
                  </label>

                  <label
                    className={`flex items-center rounded-xl border border-[#F1E3D4] p-4 ${
                      cannotPayOnline ? 'bg-gray-50 text-gray-400' : 'cursor-pointer transition-colors hover:bg-[#E8F7EF]'
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
                    <CreditCard className="mr-3 h-5 w-5 text-[#0F8F61]" />
                    <div>
                      <span>Mercado Pago</span>
                      <p className="text-sm text-[#6B7280]">
                        {cannotPayOnline
                          ? paymentDisabledMessage
                          : 'Tarjeta, dinero en cuenta y otros medios disponibles. Incluye recargo del 10%.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {paymentMethod === 'transfer' && canChoosePaymentMethod && (
                <div className="mt-6 rounded-xl border border-[#D2EBDD] bg-[#E8F7EF] p-4">
                  <h4 className="mb-3 font-semibold text-[#16352B]">Datos para transferencia bancaria</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0F8F61]">CBU:</span>
                      <span className="font-mono font-semibold text-[#16352B]">0000003100056904758628</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0F8F61]">Titular:</span>
                      <span className="font-semibold text-[#16352B]">Ignacio Adrian Confalonieri</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0F8F61]">Alias:</span>
                      <span className="font-semibold text-[#16352B]">ignacio.confalonieri</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0F8F61]">CUIT:</span>
                      <span className="font-mono font-semibold text-[#16352B]">20-47436820-4</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-yellow-800">
                    Después de realizar la transferencia, enviá el comprobante por WhatsApp para confirmar tu pedido.
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
                className="w-full rounded-lg bg-[#0F8F61] px-6 py-4 font-semibold text-white transition-all duration-200 hover:bg-[#0C7A52] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitButtonText}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#F1E3D4] bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-bold text-[#16352B]">Resumen del pedido</h3>

            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.cartKey} className="flex items-center space-x-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-[#16352B]">{item.name}</h4>
                    <p className="text-sm text-[#6B7280]">
                      {[item.size, item.color, item.floweringStems ? `${item.floweringStems} varas` : '']
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                    <p className="text-sm text-[#6B7280]">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-[#16352B]">{formatMoney(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{deliveryMethod === 'pickup' ? 'Retiro en local:' : 'Envío:'}</span>
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
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-[#16352B]">
                <span>{canShowFinalTotal ? 'Total:' : 'Total a confirmar:'}</span>
                <span>{canShowFinalTotal ? formatMoney(total) : 'A confirmar'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center text-sm text-[#6B7280]">
                <Shield className="mr-2 h-4 w-4 text-[#0F8F61]" />
                <span>Compra segura y pedido registrado correctamente</span>
              </div>
              <div className="flex items-center text-sm text-[#6B7280]">
                {deliveryMethod === 'delivery' ? (
                  <Truck className="mr-2 h-4 w-4 text-[#0F8F61]" />
                ) : (
                  <Home className="mr-2 h-4 w-4 text-[#0F8F61]" />
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
