import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

type CustomerInfo = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  shipping?: {
    requires_quote?: boolean;
  };
};

type OrderRow = {
  id: string;
  user_id: string;
  order_number: string | null;
  subtotal: number | null;
  shipping: number | null;
  payment_fee: number | null;
  total: number | null;
  total_amount: number | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  delivery_method: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  shipping_requires_quote: boolean | null;
  stock_deducted: boolean | null;
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const allowedBackUrlOrigins = new Set([
  'https://www.modoplantas.com',
  'https://modoplantas.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const getSiteUrl = (req: Request) => {
  const configuredSiteUrl = Deno.env.get('SITE_URL');
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  const requestOrigin = req.headers.get('origin') || '';
  return allowedBackUrlOrigins.has(requestOrigin) ? requestOrigin : 'https://www.modoplantas.com';
};

const normalizeStatus = (value: unknown) => String(value ?? '').trim().toLowerCase();

const CANCELLED_STATUSES = new Set(['cancelled', 'cancelado']);
const PAID_STATUSES = new Set(['paid', 'approved', 'confirmed', 'processing', 'completed', 'delivered']);
const PENDING_STATUSES = new Set([
  'pending',
  'pending_cash_payment',
  'awaiting_transfer',
  'awaiting_payment',
  'payment_pending',
  'received',
]);

const getOrderPaymentGuardError = (order: OrderRow) => {
  const orderStatus = normalizeStatus(order.status);
  const paymentStatus = normalizeStatus(order.payment_status);
  const paymentMethod = normalizeStatus(order.payment_method);

  if (CANCELLED_STATUSES.has(orderStatus) || CANCELLED_STATUSES.has(paymentStatus)) {
    return 'ORDER_ALREADY_CANCELLED';
  }

  if (orderStatus === 'requires_review' || paymentStatus === 'requires_review') {
    return 'ORDER_REQUIRES_REVIEW';
  }

  if (order.stock_deducted) {
    return 'ORDER_ALREADY_PAID';
  }

  if (PAID_STATUSES.has(orderStatus) || PAID_STATUSES.has(paymentStatus)) {
    return 'ORDER_ALREADY_PAID';
  }

  if (paymentMethod && paymentMethod !== 'mercadopago') {
    return 'ORDER_NOT_PAYABLE';
  }

  if (!PENDING_STATUSES.has(orderStatus) && !PENDING_STATUSES.has(paymentStatus)) {
    return 'ORDER_NOT_PAYABLE';
  }

  const total = Number(order.total_amount ?? order.total ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 'ORDER_NOT_PAYABLE';
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const mercadopagoAccessToken = getRequiredEnv('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = getSiteUrl(req);
    const authorization = req.headers.get('authorization') || '';
    const userJwt = authorization.replace('Bearer ', '').trim();

    if (!userJwt) {
      return json(req, { error: 'Missing user session' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(userJwt);

    if (userError || !user) {
      return json(req, { error: 'Invalid user session' }, 401);
    }

    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return json(req, { error: 'Missing orderId' }, 400);
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(
        [
          'id',
          'user_id',
          'order_number',
          'subtotal',
          'shipping',
          'payment_fee',
          'total',
          'total_amount',
          'status',
          'payment_status',
          'payment_method',
          'delivery_method',
          'customer_email',
          'customer_name',
          'customer_phone',
          'shipping_address',
          'city',
          'province',
          'postal_code',
          'shipping_requires_quote',
          'stock_deducted',
        ].join(', ')
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return json(req, { error: 'ORDER_NOT_FOUND' }, 404);
    }

    if (order.user_id !== user.id) {
      return json(req, { error: 'ORDER_NOT_FOUND' }, 404);
    }

    const orderRow = order as OrderRow;
    const guardError = getOrderPaymentGuardError(orderRow);
    if (guardError) {
      const status = guardError === 'ORDER_NOT_PAYABLE' ? 400 : 409;
      return json(req, { error: guardError }, status);
    }

    const nameParts = String(orderRow.customer_name ?? '').trim().split(/\s+/).filter(Boolean);
    const customerInfo: CustomerInfo = {
      email: orderRow.customer_email ?? undefined,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || undefined,
      phone: orderRow.customer_phone ?? undefined,
      address: orderRow.shipping_address ?? undefined,
      city: orderRow.city ?? undefined,
      postalCode: orderRow.postal_code ?? undefined,
      province: orderRow.province ?? undefined,
      shipping: {
        requires_quote: Boolean(orderRow.shipping_requires_quote),
      },
    };

    if (customerInfo.shipping?.requires_quote) {
      return json(req, { error: 'ORDER_REQUIRES_REVIEW' }, 400);
    }

    const finalTotal = Number(orderRow.total_amount ?? orderRow.total ?? 0);
    if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
      return json(req, { error: 'ORDER_TOTAL_INVALID' }, 400);
    }

    const preferenceItems = [
      {
        title: `Pedido Modo Plantas / Pedido ${orderRow.order_number || orderRow.id}`,
        quantity: 1,
        unit_price: finalTotal,
        currency_id: 'ARS',
      },
    ];

    const preferenceBody = {
      items: preferenceItems,
      payer: {
        name: customerInfo.firstName || undefined,
        surname: customerInfo.lastName || undefined,
        email: customerInfo.email || user.email || undefined,
        phone: customerInfo.phone ? { number: customerInfo.phone } : undefined,
        address: {
          street_name: customerInfo.address || undefined,
          zip_code: customerInfo.postalCode || undefined,
        },
      },
      back_urls: siteUrl
        ? {
            success: `${siteUrl}/?payment=success&order_id=${order.id}`,
            failure: `${siteUrl}/?payment=failure&order_id=${order.id}`,
            pending: `${siteUrl}/?payment=pending&order_id=${order.id}`,
          }
        : undefined,
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'MODO PLANTAS',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: user.id,
      },
    };

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok) {
      return json(req, { error: preference.message || 'Mercado Pago preference error', details: preference }, 502);
    }

    await adminClient
      .from('orders')
      .update({
        payment_method: 'mercadopago',
        payment_status: 'pending',
        mercadopago_preference_id: preference.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await adminClient
      .from('payments')
      .update({
        method: 'mercadopago',
        status: 'pending',
        payment_status: 'pending',
        preference_id: preference.id,
      })
      .eq('order_id', order.id);

    return json(req, {
      id: preference.id,
      initPoint: preference.init_point,
    });
  } catch (error) {
    console.error(error);
    return json(
      req,
      { error: error instanceof Error ? error.message : 'Unexpected Mercado Pago error' },
      500
    );
  }
});
