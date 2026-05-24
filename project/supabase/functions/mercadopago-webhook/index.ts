import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendOrderTransactionalEmail } from '../_shared/transactionalEmail.ts';

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

const mapPaymentToOrderStatus = (paymentStatus: string) => {
  switch (paymentStatus) {
    case 'approved':
    case 'paid':
      return 'confirmed';
    case 'rejected':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const isConfirmedPaymentStatus = (paymentStatus: string) =>
  paymentStatus === 'approved' || paymentStatus === 'paid';

const sendConfirmedEmailIfConfigured = async (adminClient: any, orderId: string, supabaseUrl: string) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL');

  if (!resendApiKey || !fromEmail) {
    return;
  }

  try {
    await sendOrderTransactionalEmail(
      adminClient,
      {
        resendApiKey,
        fromEmail,
        siteUrl: Deno.env.get('SITE_URL') || supabaseUrl,
        replyToEmail: Deno.env.get('REPLY_TO_EMAIL') || undefined,
      },
      'order_confirmed',
      orderId
    );
  } catch (emailError) {
    console.error('Mercado Pago order confirmed email failed:', emailError);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const mercadopagoAccessToken = getRequiredEnv('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const topic = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic');
    const paymentId = body.data?.id || url.searchParams.get('id');

    if (topic !== 'payment' || !paymentId) {
      return json({ received: true });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
    });

    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      return json({ error: payment.message || 'Mercado Pago payment lookup failed' }, 502);
    }

    const orderId = payment.external_reference || payment.metadata?.order_id;
    if (!orderId) {
      return json({ received: true, ignored: 'payment without order reference' });
    }

    const paymentStatus = String(payment.status || 'pending');
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await adminClient
      .from('payments')
      .update({
        amount: Number(payment.transaction_amount ?? 0),
        method: 'mercadopago',
        status: paymentStatus,
        payment_status: paymentStatus,
        provider_payment_id: String(payment.id),
      })
      .eq('order_id', orderId);

    if (isConfirmedPaymentStatus(paymentStatus)) {
      const { data: confirmationData, error: confirmationError } = await adminClient.rpc(
        'confirm_order_payment_and_deduct_stock',
        {
          p_order_id: orderId,
          p_payment_status: paymentStatus,
          p_order_status: 'confirmed',
        }
      );

      if (confirmationError) {
        console.error('Error confirming Mercado Pago order stock:', confirmationError);
        await adminClient
          .from('orders')
          .update({
            status: 'requires_review',
            payment_status: paymentStatus,
            mercadopago_payment_id: String(payment.id),
            mercadopago_payment_status: paymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        return json({ received: true, error: 'STOCK_CONFIRMATION_FAILED' }, 409);
      }

      const confirmation = Array.isArray(confirmationData) ? confirmationData[0] : confirmationData;
      await adminClient
        .from('orders')
        .update({
          mercadopago_payment_id: String(payment.id),
          mercadopago_payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (confirmation && confirmation.stock_deducted === false) {
        return json({ received: true, warning: 'ORDER_REQUIRES_STOCK_REVIEW' });
      }

      await sendConfirmedEmailIfConfigured(adminClient, orderId, supabaseUrl);

      return json({ received: true });
    }

    await adminClient
      .from('orders')
      .update({
        status: mapPaymentToOrderStatus(paymentStatus),
        payment_status: paymentStatus,
        mercadopago_payment_id: String(payment.id),
        mercadopago_payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected webhook error' }, 500);
  }
});
