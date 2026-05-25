import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  sendOrderTransactionalEmail,
  sendPasswordChangedEmail,
  type OrderEmailType,
} from '../_shared/transactionalEmail.ts';

type EmailRequest =
  | { type: OrderEmailType; orderId: string }
  | { type: 'password_changed' };

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

const isOrderEmailType = (value: unknown): value is OrderEmailType =>
  value === 'order_received' || value === 'order_confirmed' || value === 'order_cancelled';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = getRequiredEnv('RESEND_API_KEY');
    const fromEmail = getRequiredEnv('FROM_EMAIL');
    const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || '';
    const replyToEmail = Deno.env.get('REPLY_TO_EMAIL') || undefined;
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

    const body = (await req.json().catch(() => ({}))) as EmailRequest;
    const env = { resendApiKey, fromEmail, siteUrl, replyToEmail };

    if (body.type === 'password_changed') {
      const result = await sendPasswordChangedEmail(env, user);
      return json(req, result);
    }

    if (!isOrderEmailType(body.type) || !body.orderId) {
      return json(req, { error: 'Invalid email request' }, 400);
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, user_id')
      .eq('id', body.orderId)
      .single();

    if (orderError || !order) {
      return json(req, { error: 'Order not found' }, 404);
    }

    let canSend = order.user_id === user.id;
    if (!canSend) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      canSend = profile?.role === 'admin';
    }

    if (!canSend) {
      return json(req, { error: 'Forbidden' }, 403);
    }

    const result = await sendOrderTransactionalEmail(adminClient, env, body.type, body.orderId);
    return json(req, result);
  } catch (error) {
    console.error('send-transactional-email error:', error);
    return json(
      req,
      { error: error instanceof Error ? error.message : 'Unexpected email error' },
      500
    );
  }
});
