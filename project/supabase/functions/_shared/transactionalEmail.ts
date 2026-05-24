type SupabaseAdminClient = {
  from: (table: string) => any;
};

export type OrderEmailType = 'order_received' | 'order_confirmed' | 'order_cancelled';

type ResendEnv = {
  resendApiKey: string;
  fromEmail: string;
  siteUrl?: string;
  replyToEmail?: string;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  order_number: string | null;
  subtotal: number | null;
  shipping: number | null;
  shipping_total: number | null;
  payment_fee: number | null;
  total_amount: number | null;
  total: number | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  delivery_method: string | null;
  shipping_method: string | null;
  shipping_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  shipping_zone_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  order_received_email_sent_at: string | null;
  order_confirmed_email_sent_at: string | null;
  order_cancelled_email_sent_at: string | null;
};

type OrderItemRow = {
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
  total_price: number | null;
};

const STORE_NAME = 'Club de Las Orquideas';
const WHATSAPP = '+54 9 11 2290 6442';

const EMAIL_CONFIG: Record<
  OrderEmailType,
  {
    sentAtColumn: keyof Pick<
      OrderRow,
      'order_received_email_sent_at' | 'order_confirmed_email_sent_at' | 'order_cancelled_email_sent_at'
    >;
    subject: string;
    title: string;
    preheader: string;
  }
> = {
  order_received: {
    sentAtColumn: 'order_received_email_sent_at',
    subject: 'Recibimos tu pedido en Club de Las Orquideas',
    title: 'Pedido recibido',
    preheader: 'Tu pedido queda pendiente de confirmacion.',
  },
  order_confirmed: {
    sentAtColumn: 'order_confirmed_email_sent_at',
    subject: 'Tu pedido fue confirmado',
    title: 'Pedido confirmado',
    preheader: 'Estamos preparando todo para coordinar la entrega o retiro.',
  },
  order_cancelled: {
    sentAtColumn: 'order_cancelled_email_sent_at',
    subject: 'Tu pedido fue cancelado',
    title: 'Pedido cancelado',
    preheader: 'Tu pedido fue cancelado correctamente.',
  },
};

const money = (value: unknown) => {
  const amount = Number(value ?? 0);
  return `$${amount.toLocaleString('es-AR')}`;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const paymentLabel = (method: string | null) => {
  if (method === 'cash') return 'Efectivo';
  if (method === 'mercadopago') return 'Mercado Pago';
  if (method === 'transfer') return 'Transferencia bancaria';
  return 'A coordinar';
};

const deliveryLabel = (order: OrderRow) => {
  if (order.delivery_method === 'pickup') {
    return 'Retiro en local';
  }

  const method = order.shipping_method === 'uber' ? 'Uber' : 'Envio a domicilio';
  return order.shipping_zone_name ? `${method} - ${order.shipping_zone_name}` : method;
};

const deliveryAddress = (order: OrderRow) => {
  if (order.delivery_method === 'pickup') {
    return 'Av. De los Lagos 7000, Nordelta';
  }

  return [order.shipping_address, order.city, order.province, order.postal_code]
    .filter(Boolean)
    .join(', ');
};

const itemTotal = (item: OrderItemRow) =>
  Number(item.total_price ?? item.subtotal ?? Number(item.unit_price ?? 0) * Number(item.quantity ?? 0));

const renderItemsTable = (items: OrderItemRow[]) =>
  items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;">${escapeHtml(item.product_name || 'Producto')}</td>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;text-align:center;">${Number(item.quantity ?? 0)}</td>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;text-align:right;">${money(item.unit_price)}</td>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;text-align:right;font-weight:700;">${money(itemTotal(item))}</td>
        </tr>`
    )
    .join('');

const renderConfirmedItems = (items: OrderItemRow[]) =>
  items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;">${escapeHtml(item.product_name || 'Producto')}</td>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;text-align:center;">${Number(item.quantity ?? 0)}</td>
          <td style="padding:12px;border-bottom:1px solid #eadbc8;text-align:right;font-weight:700;">${money(itemTotal(item))}</td>
        </tr>`
    )
    .join('');

const orderMessage = (type: OrderEmailType, order: OrderRow) => {
  if (type === 'order_confirmed') {
    return order.delivery_method === 'pickup'
      ? 'Tu pedido ya fue confirmado. Podes retirar por Av. De los Lagos 7000, Nordelta, coordinando previamente.'
      : 'Tu pedido ya fue confirmado. Estamos preparando todo y te vamos a contactar para coordinar la entrega.';
  }

  if (type === 'order_cancelled') {
    return 'Tu pedido fue cancelado correctamente. Si fue un error o queres volver a comprar, podes contactarnos por WhatsApp.';
  }

  if (order.payment_method === 'cash') {
    return 'Tu pedido queda pendiente hasta coordinar el pago.';
  }

  if (order.payment_method === 'transfer') {
    return 'Tu pedido queda pendiente hasta que confirmemos la transferencia.';
  }

  if (order.payment_method === 'mercadopago') {
    return 'Tu pago se confirma automaticamente cuando Mercado Pago lo aprueba.';
  }

  return 'Tu pedido queda pendiente de confirmacion.';
};

const renderOrderEmail = (type: OrderEmailType, order: OrderRow, items: OrderItemRow[], siteUrl?: string) => {
  const config = EMAIL_CONFIG[type];
  const customerName = order.customer_name?.trim() || 'Cliente';
  const total = Number(order.total_amount ?? order.total ?? 0);
  const shipping = Number(order.shipping_total ?? order.shipping ?? 0);
  const paymentFee = Number(order.payment_fee ?? 0);
  const isConfirmed = type === 'order_confirmed';
  const rows = isConfirmed ? renderConfirmedItems(items) : renderItemsTable(items);
  const columns = isConfirmed
    ? '<th style="padding:12px;text-align:left;">Producto</th><th style="padding:12px;text-align:center;">Cant.</th><th style="padding:12px;text-align:right;">Total</th>'
    : '<th style="padding:12px;text-align:left;">Producto</th><th style="padding:12px;text-align:center;">Cant.</th><th style="padding:12px;text-align:right;">Unitario</th><th style="padding:12px;text-align:right;">Total</th>';
  const button = siteUrl
    ? `<a href="${escapeHtml(siteUrl)}" style="display:inline-block;margin-top:20px;border-radius:999px;background:#d96c9f;color:#ffffff;text-decoration:none;padding:12px 20px;font-weight:700;">Ver mis pedidos</a>`
    : '';

  const totals = type === 'order_cancelled'
    ? ''
    : `
      <table role="presentation" width="100%" style="margin-top:18px;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6b756f;">Subtotal</td><td style="padding:6px 0;text-align:right;">${money(order.subtotal)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b756f;">Envio</td><td style="padding:6px 0;text-align:right;">${shipping > 0 ? money(shipping) : order.delivery_method === 'pickup' ? 'Gratis' : 'A coordinar'}</td></tr>
        ${paymentFee > 0 ? `<tr><td style="padding:6px 0;color:#6b756f;">Recargo Mercado Pago (10%)</td><td style="padding:6px 0;text-align:right;">${money(paymentFee)}</td></tr>` : ''}
        <tr><td style="padding:12px 0 0;border-top:1px solid #eadbc8;font-size:18px;font-weight:700;">Total final</td><td style="padding:12px 0 0;border-top:1px solid #eadbc8;text-align:right;font-size:18px;font-weight:700;color:#2f3a35;">${money(total)}</td></tr>
      </table>`;

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#fff8ef;font-family:Arial,Helvetica,sans-serif;color:#2f3a35;">
        <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(config.preheader)}</div>
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff8ef;padding:24px 0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" style="max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #eadbc8;border-radius:18px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 18px;background:#f8ddeb;">
                    <p style="margin:0 0 8px;color:#6b756f;font-size:13px;letter-spacing:.12em;text-transform:uppercase;">${STORE_NAME}</p>
                    <h1 style="margin:0;font-size:28px;line-height:1.2;color:#2f3a35;">${escapeHtml(config.title)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 16px;font-size:16px;">Hola ${escapeHtml(customerName)},</p>
                    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">${escapeHtml(orderMessage(type, order))}</p>
                    <div style="border:1px solid #eadbc8;border-radius:14px;padding:16px;background:#fff8ef;margin-bottom:20px;">
                      <p style="margin:0 0 8px;color:#6b756f;font-size:13px;">Pedido</p>
                      <p style="margin:0;font-size:20px;font-weight:700;">#${escapeHtml(order.order_number || order.id)}</p>
                      ${type === 'order_received' ? '<p style="margin:8px 0 0;color:#b88746;font-weight:700;">Pendiente de confirmacion</p>' : ''}
                    </div>
                    <table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #eadbc8;border-radius:12px;overflow:hidden;">
                      <thead style="background:#fff8ef;color:#6b756f;font-size:13px;"><tr>${columns}</tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                    ${totals}
                    <div style="margin-top:22px;border-top:1px solid #eadbc8;padding-top:18px;color:#6b756f;font-size:14px;line-height:1.6;">
                      <p style="margin:0;"><strong>Pago:</strong> ${escapeHtml(paymentLabel(order.payment_method))}</p>
                      <p style="margin:4px 0 0;"><strong>Entrega:</strong> ${escapeHtml(deliveryLabel(order))}</p>
                      <p style="margin:4px 0 0;"><strong>Direccion/Zona:</strong> ${escapeHtml(deliveryAddress(order) || order.shipping_zone_name || 'A coordinar')}</p>
                    </div>
                    ${type === 'order_received' ? '<p style="margin:22px 0 0;font-size:15px;line-height:1.6;">Te vamos a contactar por WhatsApp para coordinar los proximos pasos.</p>' : ''}
                    ${button}
                    <p style="margin:28px 0 0;color:#6b756f;font-size:14px;line-height:1.6;">
                      ${STORE_NAME}<br />
                      WhatsApp: ${WHATSAPP}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

  const text = [
    `${STORE_NAME}`,
    config.title,
    `Hola ${customerName},`,
    orderMessage(type, order),
    `Pedido: #${order.order_number || order.id}`,
    `Pago: ${paymentLabel(order.payment_method)}`,
    `Entrega: ${deliveryLabel(order)}`,
    `Total: ${money(total)}`,
    `WhatsApp: ${WHATSAPP}`,
  ].join('\n');

  return { subject: config.subject, html, text };
};

const sendResendEmail = async ({
  to,
  subject,
  html,
  text,
  env,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  env: ResendEnv;
}) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.fromEmail,
      to: [to],
      subject,
      html,
      text,
      reply_to: env.replyToEmail || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend responded ${response.status}`);
  }

  return data;
};

export const sendOrderTransactionalEmail = async (
  adminClient: SupabaseAdminClient,
  env: ResendEnv,
  type: OrderEmailType,
  orderId: string
) => {
  const config = EMAIL_CONFIG[type];
  const selectColumns = [
    'id',
    'user_id',
    'order_number',
    'subtotal',
    'shipping',
    'shipping_total',
    'payment_fee',
    'total_amount',
    'total',
    'status',
    'payment_method',
    'payment_status',
    'delivery_method',
    'shipping_method',
    'shipping_address',
    'city',
    'province',
    'postal_code',
    'shipping_zone_name',
    'customer_name',
    'customer_email',
    'customer_phone',
    'order_received_email_sent_at',
    'order_confirmed_email_sent_at',
    'order_cancelled_email_sent_at',
  ].join(', ');

  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select(selectColumns)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw orderError || new Error('Order not found');
  }

  const orderRow = order as OrderRow;
  if (orderRow[config.sentAtColumn]) {
    return { skipped: true, reason: 'already_sent' };
  }

  if (!orderRow.customer_email) {
    return { skipped: true, reason: 'missing_customer_email' };
  }

  if (type === 'order_confirmed') {
    const status = String(orderRow.status || '').toLowerCase();
    const paymentStatus = String(orderRow.payment_status || '').toLowerCase();
    if (status === 'cancelled' || paymentStatus === 'cancelled') {
      return { skipped: true, reason: 'cancelled_order' };
    }
  }

  const { data: items, error: itemsError } = await adminClient
    .from('order_items')
    .select('product_name, quantity, unit_price, subtotal, total_price')
    .eq('order_id', orderId);

  if (itemsError) {
    throw itemsError;
  }

  const rendered = renderOrderEmail(type, orderRow, (items ?? []) as OrderItemRow[], env.siteUrl);
  const resendResult = await sendResendEmail({
    to: orderRow.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    env,
  });

  const { error: updateError } = await adminClient
    .from('orders')
    .update({
      [config.sentAtColumn]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .is(config.sentAtColumn, null);

  if (updateError) {
    console.error('Order email was sent but sent_at could not be saved:', updateError);
  }

  return { sent: true, resend: resendResult };
};

export const sendPasswordChangedEmail = async (
  env: ResendEnv,
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null }
) => {
  const email = user.email;
  if (!email) {
    return { skipped: true, reason: 'missing_email' };
  }

  const name =
    String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim() ||
    email.split('@')[0] ||
    'Cliente';
  const subject = 'Tu contrasena fue actualizada';
  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#fff8ef;font-family:Arial,Helvetica,sans-serif;color:#2f3a35;">
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff8ef;padding:24px 0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" style="max-width:620px;border-collapse:collapse;background:#ffffff;border:1px solid #eadbc8;border-radius:18px;overflow:hidden;">
                <tr><td style="padding:28px;background:#f8ddeb;"><p style="margin:0 0 8px;color:#6b756f;font-size:13px;letter-spacing:.12em;text-transform:uppercase;">${STORE_NAME}</p><h1 style="margin:0;font-size:26px;">Contrasena actualizada</h1></td></tr>
                <tr><td style="padding:28px;font-size:16px;line-height:1.6;"><p>Hola ${escapeHtml(name)},</p><p>Te confirmamos que la contrasena de tu cuenta fue actualizada correctamente.</p><p>Si no realizaste este cambio, contactanos lo antes posible.</p><p style="margin-top:28px;color:#6b756f;">${STORE_NAME}<br />WhatsApp: ${WHATSAPP}</p></td></tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  const text = `Hola ${name},\nTe confirmamos que la contrasena de tu cuenta fue actualizada correctamente.\nSi no realizaste este cambio, contactanos lo antes posible.\n${STORE_NAME}\nWhatsApp: ${WHATSAPP}`;

  const resend = await sendResendEmail({ to: email, subject, html, text, env });
  return { sent: true, resend };
};
