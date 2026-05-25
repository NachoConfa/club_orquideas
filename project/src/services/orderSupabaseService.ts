import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import { sendOrderCancelledEmail } from './emailService';
import type { ShippingMethod } from './shippingService';

export interface CheckoutOrderItem {
  id: number;
  sourceId?: string;
  variantId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
}

export interface CheckoutCustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  province: string;
}

export interface CreateOrderInput {
  userId: string;
  items: CheckoutOrderItem[];
  subtotal: number;
  shipping: number;
  shippingMethod: ShippingMethod;
  shippingZoneId?: string;
  shippingZoneName?: string;
  shippingRequiresQuote: boolean;
  paymentFee?: number;
  total: number;
  paymentMethod: 'transfer' | 'cash' | 'mercadopago';
  deliveryMethod: 'delivery' | 'pickup';
  customerInfo: CheckoutCustomerInfo;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
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
  paymentFee: number;
  shippingMethod: ShippingMethod;
  shippingZoneName?: string;
  shippingRequiresQuote: boolean;
  status:
    | 'pending'
    | 'received'
    | 'confirmed'
    | 'paid'
    | 'approved'
    | 'processing'
    | 'completed'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'requires_review';
  paymentStatus?: string;
  stockDeducted?: boolean;
  paymentMethod: 'transfer' | 'cash' | 'mercadopago';
  deliveryMethod: 'delivery' | 'pickup';
  customerInfo: CheckoutCustomerInfo;
}

type OrderRow = {
  id: string;
  user_id?: string | null;
  order_number: string | null;
  subtotal: number | null;
  shipping: number | null;
  shipping_total: number | null;
  payment_fee?: number | null;
  total?: number | null;
  total_amount: number | null;
  status: CustomerOrder['status'] | string | null;
  payment_status?: string | null;
  payment_method: 'transfer' | 'cash' | 'mercadopago' | string | null;
  delivery_method?: 'delivery' | 'pickup' | string | null;
  shipping_method?: ShippingMethod | string | null;
  shipping_zone_name?: string | null;
  shipping_requires_quote?: boolean | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | Record<string, unknown> | null;
  shipping_address?: string | Record<string, unknown> | null;
  billing_address?: string | Record<string, unknown> | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  stock_deducted?: boolean | null;
  stock_deducted_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type OrderItemRow = {
  id: number | string;
  order_id: string;
  product_id?: string | null;
  product_name: string | null;
  product_image?: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal?: number | null;
  total_price: number | null;
  product_details: {
    display_id?: number;
    variant_id?: string | null;
    color?: string;
    size?: string;
  } | null;
};

type CreatedOrderRow = {
  id: string;
  order_number: string;
};

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const createUuid = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;
};

const createOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

const PICKUP_ADDRESS = 'Av. De los Lagos 7000, Nordelta';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MERCADO_PAGO_SURCHARGE_RATE = 0.1;

const toNullableUuid = (value?: string) => (value && UUID_PATTERN.test(value) ? value : null);

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const roundMoney = (value: number) => Math.round(value);

const toPositiveInteger = (value: unknown, fallback = 0) => {
  const numberValue = Math.trunc(toFiniteNumber(value, fallback));
  return numberValue > 0 ? numberValue : fallback;
};

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const supabaseError = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code]
      .filter(Boolean)
      .join(' ');
  }

  return String(error);
};

const getKnownRpcErrorCode = (error: unknown) =>
  [
    'AUTH_REQUIRED',
    'ORDER_PAYLOAD_INVALID',
    'ORDER_USER_MISMATCH',
    'ORDER_ITEMS_REQUIRED',
    'STOCK_PRODUCT_REQUIRED',
    'STOCK_QUANTITY_INVALID',
    'STOCK_PRODUCT_NOT_FOUND',
    'STOCK_VARIANT_REQUIRED',
    'STOCK_VARIANT_NOT_FOUND',
    'STOCK_INSUFFICIENT',
  ].find((marker) => getSupabaseErrorMessage(error).includes(marker));

const normalizePublicErrorMessage = (message: string) =>
  message
    .replace(/más/g, 'mas')
    .replace(/Revisá/g, 'Revisa')
    .replace(/intentá/g, 'intenta');

const createPublicOrderError = (error: unknown, fallback: string) => {
  if (import.meta.env.DEV) {
    console.error(fallback, getSupabaseErrorMessage(error));
  }
  return new Error(normalizePublicErrorMessage(fallback));
};

const createInvalidCartProductError = (items: CheckoutOrderItem[]) => {
  if (import.meta.env.DEV) {
    console.warn(
      'Hay items del carrito sin product_id UUID real. El carrito debe rearmarse antes de llamar a create_order_with_stock.',
      items.map((item) => ({
        id: item.id,
        hasSourceId: Boolean(item.sourceId),
        hasVariantId: Boolean(item.variantId),
        quantity: item.quantity,
      }))
    );
  }

  return new Error('Hay productos antiguos en el carrito. Eliminalos y agregalos nuevamente.');
};

const redactOrderPayloadForDebug = (payload: Record<string, unknown>) => ({
  id: payload.id,
  userIdPrefix: typeof payload.user_id === 'string' ? payload.user_id.slice(0, 8) : null,
  order_number: payload.order_number,
  subtotal: payload.subtotal,
  shipping: payload.shipping,
  shipping_total: payload.shipping_total,
  payment_fee: payload.payment_fee,
  total_amount: payload.total_amount,
  status: payload.status,
  payment_method: payload.payment_method,
  payment_status: payload.payment_status,
  delivery_method: payload.delivery_method,
  shipping_method: payload.shipping_method,
  shipping_zone_id: payload.shipping_zone_id,
  shipping_zone_name: payload.shipping_zone_name,
  shipping_requires_quote: payload.shipping_requires_quote,
  hasCustomerEmail: Boolean(payload.customer_email),
  hasCustomerPhone: Boolean(payload.customer_phone),
  hasShippingAddress: Boolean(payload.shipping_address),
});

const redactItemsPayloadForDebug = (items: Record<string, unknown>[]) =>
  items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    hasProductImage: Boolean(item.product_image),
    hasProductDetails: Boolean(item.product_details),
  }));

const redactPaymentPayloadForDebug = (payload: Record<string, unknown>) => ({
  amount: payload.amount,
  method: payload.method,
  status: payload.status,
  payment_status: payload.payment_status,
  hasPreferenceId: Boolean(payload.preference_id),
  hasProviderPaymentId: Boolean(payload.provider_payment_id),
});

const logCreateOrderRpcError = (
  error: unknown,
  context: {
    orderPayload: Record<string, unknown>;
    itemsPayload: Record<string, unknown>[];
    paymentPayload: Record<string, unknown>;
    paymentMethod: CreateOrderInput['paymentMethod'];
    deliveryMethod: CreateOrderInput['deliveryMethod'];
  }
) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  console.error('RPC create_order_with_stock RAW error:', error);
  console.error('RPC error message:', supabaseError?.message);
  console.error('RPC error details:', supabaseError?.details);
  console.error('RPC error hint:', supabaseError?.hint);
  console.error('RPC error code:', supabaseError?.code);
  console.error('RPC payload p_order redacted:', redactOrderPayloadForDebug(context.orderPayload));
  console.error('RPC payload p_items redacted:', redactItemsPayloadForDebug(context.itemsPayload));
  console.error('RPC payload p_payment redacted:', redactPaymentPayloadForDebug(context.paymentPayload));
  console.error('Checkout delivery_method seleccionado:', context.deliveryMethod);
  console.error('Checkout payment_method seleccionado:', context.paymentMethod);

  const knownCode = getKnownRpcErrorCode(error);
  if (knownCode) {
    console.warn('Codigo interno create_order_with_stock:', knownCode);
  }
};

const attachPublicRpcErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    (error as { publicMessage?: string }).publicMessage = getPublicRpcErrorMessage(error);
  }

  return error;
};

const getPublicRpcErrorMessage = (error: unknown) => {
  const errorText = getSupabaseErrorMessage(error);

  if (errorText.includes('STOCK_PRODUCT_REQUIRED')) {
    return 'Hay productos antiguos en el carrito. Eliminalos y agregalos nuevamente.';
  }

  if (errorText.includes('STOCK_PRODUCT_NOT_FOUND')) {
    return 'Hay productos del carrito que ya no estan disponibles. Eliminalos y agregalos nuevamente.';
  }

  if (errorText.includes('STOCK_INSUFFICIENT')) {
    return 'No hay stock suficiente para uno o mas productos del carrito.';
  }

  if (errorText.includes('AUTH_REQUIRED')) {
    return 'Inicia sesion nuevamente antes de completar el pedido.';
  }

  if (errorText.includes('ORDER_USER_MISMATCH')) {
    return 'Tu sesion no coincide con el pedido. Cerra sesion e inicia nuevamente.';
  }

  if (errorText.includes('ORDER_PAYLOAD_INVALID') || errorText.includes('ORDER_ITEMS_REQUIRED')) {
    return 'No pudimos preparar los datos del pedido. Revisa el carrito e intenta nuevamente.';
  }

  return 'No pudimos completar tu pedido. Revisa el carrito e intenta nuevamente.';
};

const normalizeCustomerInfoForOrder = (input: CreateOrderInput) => {
  if (input.deliveryMethod !== 'pickup') {
    return input.customerInfo;
  }

  return {
    ...input.customerInfo,
    address: input.customerInfo.address || PICKUP_ADDRESS,
    city: input.customerInfo.city || 'Nordelta',
    province: input.customerInfo.province || 'Buenos Aires',
    postalCode: input.customerInfo.postalCode || '',
  };
};

const parseAddressRecord = (value: unknown) => {
  if (!value) {
    return {} as Record<string, unknown>;
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return { address: String(value) };
};

const splitCustomerName = (name: string | null | undefined) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
};

const getPaymentStatus = (input: CreateOrderInput) => {
  if (input.paymentMethod === 'cash') {
    return 'pending_cash_payment';
  }

  if (input.paymentMethod === 'transfer') {
    return 'awaiting_transfer';
  }

  return 'pending';
};

export const createSupabaseOrder = async (input: CreateOrderInput) => {
  const client = getClient();
  const {
    data: { user: sessionUser },
    error: sessionError,
  } = await client.auth.getUser();

  if (sessionError || !sessionUser?.id) {
    if (import.meta.env.DEV) {
      console.error('No hay sesion real de Supabase para crear el pedido:', sessionError);
    }
    throw new Error('Inicia sesion nuevamente antes de completar el pedido.');
  }

  if (sessionUser.id !== input.userId) {
    if (import.meta.env.DEV) {
      console.error('ORDER_USER_MISMATCH antes de llamar a la RPC:', {
        sessionUserIdPrefix: sessionUser.id.slice(0, 8),
        inputUserIdPrefix: input.userId.slice(0, 8),
      });
    }
    throw new Error('Tu sesion no coincide con el pedido. Cerra sesion e inicia nuevamente.');
  }

  const invalidCartItems = input.items.filter((item) => !toNullableUuid(item.sourceId));
  if (invalidCartItems.length > 0) {
    throw createInvalidCartProductError(invalidCartItems);
  }

  const orderId = createUuid();
  const orderNumber = createOrderNumber();
  const customerInfo = normalizeCustomerInfoForOrder(input);
  const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`.trim();
  const paymentStatus = getPaymentStatus(input);
  const subtotal = toFiniteNumber(input.subtotal);
  const shippingCost = input.deliveryMethod === 'pickup' ? 0 : toFiniteNumber(input.shipping);
  const baseTotal = subtotal + shippingCost;
  const paymentFee = input.paymentMethod === 'mercadopago' ? roundMoney(baseTotal * MERCADO_PAGO_SURCHARGE_RATE) : 0;
  const totalAmount = baseTotal + paymentFee;
  const shippingAddress =
    input.deliveryMethod === 'pickup'
      ? `Retiro en local - ${PICKUP_ADDRESS}`
      : customerInfo.address.trim();
  const orderPayload: Record<string, unknown> = {
    id: orderId,
    user_id: input.userId,
    order_number: orderNumber,
    subtotal,
    shipping: shippingCost,
    shipping_total: shippingCost,
    payment_fee: paymentFee,
    total_amount: totalAmount,
    status: 'pending',
    payment_method: input.paymentMethod,
    payment_status: paymentStatus,
    delivery_method: input.deliveryMethod,
    shipping_method: input.deliveryMethod === 'pickup' ? 'pickup' : input.shippingMethod,
    shipping_address: shippingAddress,
    billing_address: shippingAddress,
    city: input.deliveryMethod === 'pickup' ? 'Nordelta' : customerInfo.city,
    province: input.deliveryMethod === 'pickup' ? 'Buenos Aires' : customerInfo.province,
    postal_code: customerInfo.postalCode || null,
    shipping_zone_id: input.deliveryMethod === 'pickup' ? null : toNullableUuid(input.shippingZoneId),
    shipping_zone_name: input.deliveryMethod === 'pickup' ? 'Retiro en local' : input.shippingZoneName || null,
    shipping_requires_quote: input.deliveryMethod === 'pickup' ? false : input.shippingRequiresQuote,
    customer_name: customerName,
    customer_email: customerInfo.email,
    customer_phone: customerInfo.phone,
    notes:
      input.paymentMethod === 'cash'
        ? input.deliveryMethod === 'pickup'
          ? 'Pago en efectivo al retirar por el local.'
          : 'Pago en efectivo a coordinar al momento de la entrega.'
        : input.paymentMethod === 'transfer'
          ? 'Pendiente de comprobante de transferencia.'
          : null,
  };

  const itemsPayload = input.items.map<Record<string, unknown>>((item) => {
    const quantity = toPositiveInteger(item.quantity, 1);
    const unitPrice = toFiniteNumber(item.price);

    return {
      product_id: toNullableUuid(item.sourceId),
      product_name: item.name,
      product_image: item.image,
      quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
      product_details: {
        display_id: item.id,
        variant_id: toNullableUuid(item.variantId),
        color: item.color,
        size: item.size,
      },
    };
  });

  const paymentPayload: Record<string, unknown> = {
    amount: totalAmount,
    method: input.paymentMethod,
    status: paymentStatus,
    payment_status: paymentStatus,
    preference_id: null,
    provider_payment_id: null,
  };

  let rpcResult;

  try {
    rpcResult = await client.rpc('create_order_with_stock', {
      p_order: orderPayload,
      p_items: itemsPayload,
      p_payment: paymentPayload,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error original en createSupabaseOrder:', error);
    }
    logCreateOrderRpcError(error, {
      orderPayload,
      itemsPayload,
      paymentPayload,
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
    });
    throw error;
  }

  const { data, error } = rpcResult;

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error original en createSupabaseOrder:', error);
    }
    logCreateOrderRpcError(error, {
      orderPayload,
      itemsPayload,
      paymentPayload,
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
    });

    throw attachPublicRpcErrorMessage(error);
  }

  const createdOrder = (Array.isArray(data) ? data[0] : data) as CreatedOrderRow | undefined;
  if (!createdOrder?.id) {
    throw createPublicOrderError(
      new Error('La RPC create_order_with_stock no devolvio el pedido creado.'),
      'No pudimos completar tu pedido. Revisa el carrito e intenta nuevamente.'
    );
  }

  return {
    id: createdOrder.id,
    orderNumber: createdOrder.order_number || orderNumber,
  };
};

const normalizeOrderStatus = (status: string | null): CustomerOrder['status'] => {
  switch (status) {
    case 'received':
    case 'confirmed':
    case 'paid':
    case 'approved':
    case 'processing':
    case 'completed':
    case 'shipped':
    case 'delivered':
    case 'cancelled':
    case 'requires_review':
      return status;
    default:
      return 'pending';
  }
};

const logUserOrdersQueryError = (queryName: string, error: unknown) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  console.error(`${queryName} error:`, error);
  console.error(`${queryName} message:`, supabaseError?.message);
  console.error(`${queryName} details:`, supabaseError?.details);
  console.error(`${queryName} hint:`, supabaseError?.hint);
  console.error(`${queryName} code:`, supabaseError?.code);
};

const getOrdersForUser = async (userId: string): Promise<OrderRow[]> => {
  const client = getClient();
  const selectColumns = [
    'id',
    'user_id',
    'order_number',
    'subtotal',
    'shipping',
    'shipping_total',
    'total',
    'total_amount',
    'status',
    'payment_status',
    'payment_method',
    'shipping_requires_quote',
    'customer_name',
    'customer_email',
    'customer_phone',
    'delivery_address',
    'notes',
    'stock_deducted',
    'stock_deducted_at',
    'created_at',
    'updated_at',
  ];

  const { data, error } = await client
    .from('orders')
    .select(selectColumns.join(', '))
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logUserOrdersQueryError('getSupabaseOrdersForUser orders query', error);
    throw new Error('No se pudieron cargar tus pedidos.');
  }

  return (data ?? []) as unknown as OrderRow[];
};

export const getSupabaseOrdersForUser = async (userId: string): Promise<CustomerOrder[]> => {
  const client = getClient();
  const orderRows = await getOrdersForUser(userId);
  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((order) => order.id);
  const { data: items, error: itemError } = await client
    .from('order_items')
    .select('id, order_id, product_id, product_name, quantity, unit_price, subtotal, total_price, product_details')
    .in('order_id', orderIds);

  if (itemError) {
    logUserOrdersQueryError('getSupabaseOrdersForUser order_items query', itemError);
    throw new Error('No se pudieron cargar tus pedidos.');
  }

  const itemsByOrder = ((items ?? []) as OrderItemRow[]).reduce<Record<string, OrderItemRow[]>>(
    (groupedItems, item) => {
      groupedItems[item.order_id] = [...(groupedItems[item.order_id] ?? []), item];
      return groupedItems;
    },
    {}
  );

  return orderRows.map((order) => {
    const addressRecord = parseAddressRecord(order.shipping_address ?? order.delivery_address ?? order.billing_address);
    const addressText = String(addressRecord.address ?? order.delivery_address ?? '').toLowerCase();
    const normalizedDeliveryMethod =
      order.delivery_method === 'pickup' ||
      addressText.includes('retiro') ||
      addressText.includes(PICKUP_ADDRESS.toLowerCase())
        ? 'pickup'
        : 'delivery';
    const splitName = splitCustomerName(order.customer_name);
    const customerInfo = {
      email: order.customer_email || '',
      firstName: splitName.firstName,
      lastName: splitName.lastName,
      address: String(addressRecord.address ?? ''),
      city: order.city || String(addressRecord.city ?? ''),
      postalCode: order.postal_code || String(addressRecord.postalCode ?? addressRecord.postal_code ?? ''),
      phone: order.customer_phone || String(addressRecord.phone ?? ''),
      province: order.province || String(addressRecord.province ?? ''),
    };
    const shippingInfo = (customerInfo as CheckoutCustomerInfo & {
      shipping?: {
        method?: ShippingMethod;
        zone_name?: string | null;
        requires_quote?: boolean;
      };
    }).shipping;

    const orderItems = (itemsByOrder[order.id] ?? []).map((item) => ({
      id: Number(item.product_details?.display_id ?? item.id),
      name: item.product_name || 'Producto',
      price: Number(item.unit_price ?? 0),
      quantity: Number(item.quantity ?? 0),
      image: item.product_image || '',
    }));

    const subtotal = Number(order.subtotal ?? orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const shipping = Number(order.shipping ?? order.shipping_total ?? 0);
    const rawTotal = Number(order.total_amount ?? order.total ?? subtotal + shipping);
    const paymentFee = Number(order.payment_fee ?? Math.max(rawTotal - subtotal - shipping, 0));
    const total = rawTotal;
    const shippingMethod =
      normalizedDeliveryMethod === 'pickup'
        ? 'pickup'
        : order.shipping_method === 'uber' || shippingInfo?.method === 'uber'
          ? 'uber'
          : 'encomienda';

    return {
      id: order.id,
      orderNumber: order.order_number || order.id,
      date: order.created_at || new Date().toISOString(),
      items: orderItems,
      total,
      subtotal,
      shipping,
      paymentFee,
      shippingMethod,
      shippingZoneName: order.shipping_zone_name || shippingInfo?.zone_name || undefined,
      shippingRequiresQuote: Boolean(order.shipping_requires_quote ?? shippingInfo?.requires_quote),
      status: normalizeOrderStatus(order.status),
      paymentStatus: order.payment_status || undefined,
      stockDeducted: Boolean(order.stock_deducted),
      paymentMethod:
        order.payment_method === 'cash'
          ? 'cash'
          : order.payment_method === 'mercadopago'
            ? 'mercadopago'
            : 'transfer',
      deliveryMethod: normalizedDeliveryMethod,
      customerInfo,
    };
  });
};

const getCancelOrderPublicMessage = (error: unknown) => {
  const errorText = getSupabaseErrorMessage(error);

  if (errorText.includes('ORDER_ALREADY_DEDUCTED') || errorText.includes('ORDER_ALREADY_CONFIRMED')) {
    return 'Este pedido ya fue confirmado y no puede cancelarse desde aca.';
  }

  if (errorText.includes('ORDER_NOT_CANCELABLE')) {
    return 'Solo podes cancelar pedidos pendientes.';
  }

  if (errorText.includes('ORDER_FORBIDDEN') || errorText.includes('AUTH_REQUIRED')) {
    return 'Inicia sesion nuevamente para cancelar este pedido.';
  }

  return 'No se pudo cancelar el pedido.';
};

export const cancelSupabaseOrder = async (orderId: string) => {
  const client = getClient();
  const payload = { p_order_id: orderId };
  const { data, error } = await client.rpc('cancel_pending_order', payload);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('cancel_pending_order error:', error);
      console.error('cancel_pending_order payload:', payload);
    }
    throw new Error(getCancelOrderPublicMessage(error));
  }

  const result = Array.isArray(data) ? data[0] : data;
  void sendOrderCancelledEmail(orderId);

  return result;
};
