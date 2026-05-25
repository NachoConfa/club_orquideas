import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type OrderItemRow = {
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
};

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
  total_amount: number | null;
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
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const mercadopagoAccessToken = getRequiredEnv('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || '';
    const authorization = req.headers.get('authorization') || '';
    const userJwt = authorization.replace('Bearer ', '').trim();

    if (!userJwt) {
      return json({ error: 'Missing user session' }, 401);
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
      return json({ error: 'Invalid user session' }, 401);
    }

    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return json({ error: 'Missing orderId' }, 400);
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
          'total_amount',
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
        ].join(', ')
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return json({ error: 'Order not found' }, 404);
    }

    if (order.user_id !== user.id) {
      return json({ error: 'Order does not belong to this user' }, 403);
    }

    const orderRow = order as OrderRow;
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
      return json({ error: 'This order requires a manual shipping quote before online payment' }, 400);
    }

    const { data: orderItems, error: itemsError } = await adminClient
      .from('order_items')
      .select('product_name, quantity, unit_price')
      .eq('order_id', order.id);

    if (itemsError) {
      throw itemsError;
    }

    const items = (orderItems ?? []) as OrderItemRow[];
    if (items.length === 0) {
      return json({ error: 'Order has no items' }, 400);
    }

    const preferenceItems = items.map((item) => ({
      title: item.product_name || 'Producto',
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
      currency_id: 'ARS',
    }));

    const shipping = Number(order.shipping ?? 0);
    if (shipping > 0) {
      preferenceItems.push({
        title: 'Envio',
        quantity: 1,
        unit_price: shipping,
        currency_id: 'ARS',
      });
    }

    const paymentFee = Number(order.payment_fee ?? 0);
    if (paymentFee > 0) {
      preferenceItems.push({
        title: 'Recargo Mercado Pago (10%)',
        quantity: 1,
        unit_price: paymentFee,
        currency_id: 'ARS',
      });
    }

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
      return json({ error: preference.message || 'Mercado Pago preference error', details: preference }, 502);
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

    return json({
      id: preference.id,
      initPoint: preference.init_point,
    });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected Mercado Pago error' },
      500
    );
  }
});
