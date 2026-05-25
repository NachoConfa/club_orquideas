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

const BRAND_NAME = 'Modo Plantas';
const BRAND_SUBTITLE = 'Pasión por la naturaleza';
const WHATSAPP = '+54 9 11 2290 6442';
const DEFAULT_FROM_EMAIL = 'no-reply@modoplantas.com';

const COLORS = {
  background: '#fff8ef',
  card: '#ffffff',
  brandGreen: '#0f8f61',
  brandGreenHover: '#0c7a52',
  greenSoft: '#e8f7ef',
  text: '#1f2933',
  mutedText: '#6b7280',
  border: '#f1e3d4',
  warning: '#fff3cd',
  error: '#fdecec',
};

const formatSenderEmail = (_fromEmail: string) => `${BRAND_NAME} <${DEFAULT_FROM_EMAIL}>`;

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
    mainText: string;
    buttonLabel: string;
  }
> = {
  order_received: {
    sentAtColumn: 'order_received_email_sent_at',
    subject: 'Recibimos tu pedido en Modo Plantas',
    title: 'Pedido recibido',
    preheader: 'Recibimos tu pedido y quedó pendiente de confirmación.',
    mainText: 'Recibimos tu pedido y quedó pendiente de confirmación.',
    buttonLabel: 'Ver mis pedidos',
  },
  order_confirmed: {
    sentAtColumn: 'order_confirmed_email_sent_at',
    subject: 'Tu pedido fue confirmado',
    title: 'Pedido confirmado',
    preheader: 'Tu pedido ya fue confirmado.',
    mainText: 'Tu pedido ya fue confirmado. Estamos preparando todo para coordinar la entrega o retiro.',
    buttonLabel: 'Ver mi pedido',
  },
  order_cancelled: {
    sentAtColumn: 'order_cancelled_email_sent_at',
    subject: 'Tu pedido fue cancelado',
    title: 'Pedido cancelado',
    preheader: 'Tu pedido fue cancelado correctamente.',
    mainText: 'Tu pedido fue cancelado correctamente.',
    buttonLabel: 'Volver a la tienda',
  },
};

const formatCurrency = (value: unknown) => {
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

  const method = order.shipping_method === 'uber' ? 'Uber' : 'Envío a domicilio';
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

const emailHeader = () => `
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;color:${COLORS.brandGreen};font-size:26px;line-height:1.2;font-weight:700;">${BRAND_NAME}</h1>
    <p style="margin:6px 0 0;color:${COLORS.text};font-size:14px;">${BRAND_SUBTITLE}</p>
  </div>`;

const emailFooter = () => `
  <div style="border-top:1px solid ${COLORS.border};margin-top:30px;padding-top:20px;text-align:center;color:${COLORS.mutedText};font-size:13px;line-height:1.6;">
    <p style="margin:0 0 6px;">WhatsApp: ${WHATSAPP}</p>
    <p style="margin:0;">Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
  </div>`;

const primaryButton = (label: string, href?: string) => {
  if (!href) return '';

  return `
    <div style="text-align:center;margin:26px 0 6px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;border-radius:999px;background:${COLORS.brandGreen};color:#ffffff;text-decoration:none;padding:13px 24px;font-weight:700;font-size:14px;">
        ${escapeHtml(label)}
      </a>
    </div>`;
};

const infoBox = (content: string, background = COLORS.greenSoft) => `
  <div style="border:1px solid ${COLORS.border};border-radius:14px;background:${background};padding:16px;margin:20px 0;">
    ${content}
  </div>`;

const baseEmailLayout = ({
  preheader,
  title,
  children,
}: {
  preheader: string;
  title: string;
  children: string;
}) => `
  <!doctype html>
  <html>
    <body style="margin:0;background:${COLORS.background};font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};">
      <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
      <table role="presentation" width="100%" style="border-collapse:collapse;background:${COLORS.background};padding:24px 0;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" style="max-width:680px;border-collapse:collapse;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:18px;overflow:hidden;">
              <tr>
                <td style="padding:30px 28px 28px;">
                  ${emailHeader()}
                  <h2 style="margin:0 0 16px;color:${COLORS.text};font-size:24px;line-height:1.25;">${escapeHtml(title)}</h2>
                  ${children}
                  ${emailFooter()}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

const orderItemsTable = (items: OrderItemRow[], compact = false) => {
  const header = compact
    ? '<th style="padding:12px;text-align:left;">Producto</th><th style="padding:12px;text-align:center;">Cant.</th><th style="padding:12px;text-align:right;">Total</th>'
    : '<th style="padding:12px;text-align:left;">Producto</th><th style="padding:12px;text-align:center;">Cant.</th><th style="padding:12px;text-align:right;">Unitario</th><th style="padding:12px;text-align:right;">Total</th>';

  const rows = items
    .map((item) => {
      const commonCells = `
        <td style="padding:12px;border-bottom:1px solid ${COLORS.border};">${escapeHtml(item.product_name || 'Producto')}</td>
        <td style="padding:12px;border-bottom:1px solid ${COLORS.border};text-align:center;">${Number(item.quantity ?? 0)}</td>`;

      if (compact) {
        return `
          <tr>
            ${commonCells}
            <td style="padding:12px;border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:700;">${formatCurrency(itemTotal(item))}</td>
          </tr>`;
      }

      return `
        <tr>
          ${commonCells}
          <td style="padding:12px;border-bottom:1px solid ${COLORS.border};text-align:right;">${formatCurrency(item.unit_price)}</td>
          <td style="padding:12px;border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:700;">${formatCurrency(itemTotal(item))}</td>
        </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;margin-top:18px;">
      <thead style="background:${COLORS.background};color:${COLORS.mutedText};font-size:13px;">
        <tr>${header}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const orderContextMessage = (type: OrderEmailType, order: OrderRow) => {
  if (type === 'order_confirmed') {
    return order.delivery_method === 'pickup'
      ? 'Podés retirar por Av. De los Lagos 7000, Nordelta, coordinando previamente.'
      : 'Te vamos a contactar para coordinar la entrega.';
  }

  if (type === 'order_cancelled') {
    return 'Si fue un error o querés volver a comprar, podés contactarnos por WhatsApp.';
  }

  if (order.payment_method === 'cash') {
    return 'Tu pedido queda pendiente hasta coordinar el pago.';
  }

  if (order.payment_method === 'transfer') {
    return 'Tu pedido queda pendiente hasta que confirmemos la transferencia.';
  }

  if (order.payment_method === 'mercadopago') {
    return 'Tu pago se confirma automáticamente cuando Mercado Pago lo aprueba.';
  }

  return 'Te vamos a contactar por WhatsApp para coordinar los próximos pasos.';
};

const orderDetails = (order: OrderRow, type: OrderEmailType) => {
  const total = Number(order.total_amount ?? order.total ?? 0);
  const shipping = Number(order.shipping_total ?? order.shipping ?? 0);
  const paymentFee = Number(order.payment_fee ?? 0);

  const totals =
    type === 'order_cancelled'
      ? ''
      : `
        <table role="presentation" width="100%" style="margin-top:18px;border-collapse:collapse;">
          <tr>
            <td style="padding:7px 0;color:${COLORS.mutedText};">Subtotal</td>
            <td style="padding:7px 0;text-align:right;">${formatCurrency(order.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:${COLORS.mutedText};">Envío</td>
            <td style="padding:7px 0;text-align:right;">${shipping > 0 ? formatCurrency(shipping) : order.delivery_method === 'pickup' ? 'Gratis' : 'A coordinar'}</td>
          </tr>
          ${
            paymentFee > 0
              ? `<tr><td style="padding:7px 0;color:${COLORS.mutedText};">Recargo Mercado Pago (10%)</td><td style="padding:7px 0;text-align:right;">${formatCurrency(paymentFee)}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding:14px 0 0;border-top:1px solid ${COLORS.border};font-size:18px;font-weight:700;">Total final</td>
            <td style="padding:14px 0 0;border-top:1px solid ${COLORS.border};text-align:right;font-size:18px;font-weight:700;color:${COLORS.text};">${formatCurrency(total)}</td>
          </tr>
        </table>`;

  return `
    ${totals}
    <div style="margin-top:22px;border-top:1px solid ${COLORS.border};padding-top:18px;color:${COLORS.mutedText};font-size:14px;line-height:1.7;">
      <p style="margin:0;"><strong style="color:${COLORS.text};">Pago:</strong> ${escapeHtml(paymentLabel(order.payment_method))}</p>
      <p style="margin:4px 0 0;"><strong style="color:${COLORS.text};">Entrega:</strong> ${escapeHtml(deliveryLabel(order))}</p>
      <p style="margin:4px 0 0;"><strong style="color:${COLORS.text};">Dirección/Zona:</strong> ${escapeHtml(deliveryAddress(order) || order.shipping_zone_name || 'A coordinar')}</p>
    </div>`;
};

const renderOrderEmail = (type: OrderEmailType, order: OrderRow, items: OrderItemRow[], siteUrl?: string) => {
  const config = EMAIL_CONFIG[type];
  const customerName = order.customer_name?.trim() || 'Cliente';
  const total = Number(order.total_amount ?? order.total ?? 0);
  const orderHref = siteUrl ? `${siteUrl.replace(/\/$/, '')}/?profile=orders` : undefined;
  const buttonHref = type === 'order_cancelled' ? siteUrl : orderHref;

  const statusBadge =
    type === 'order_received'
      ? `<p style="display:inline-block;margin:10px 0 0;border-radius:999px;background:${COLORS.warning};color:#7a5a00;padding:7px 12px;font-size:13px;font-weight:700;">Pendiente de confirmación</p>`
      : '';

  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Hola ${escapeHtml(customerName)},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">${escapeHtml(config.mainText)}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${COLORS.mutedText};">${escapeHtml(orderContextMessage(type, order))}</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:${COLORS.mutedText};font-size:13px;">Número de pedido</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${COLORS.text};">#${escapeHtml(order.order_number || order.id)}</p>
      ${statusBadge}
    `)}
    ${orderItemsTable(items, type === 'order_confirmed')}
    ${orderDetails(order, type)}
    ${type === 'order_received' ? '<p style="margin:22px 0 0;font-size:15px;line-height:1.65;">Te vamos a contactar por WhatsApp para coordinar los próximos pasos.</p>' : ''}
    ${primaryButton(config.buttonLabel, buttonHref)}`;

  const html = baseEmailLayout({
    preheader: config.preheader,
    title: config.title,
    children: content,
  });

  const text = [
    BRAND_NAME,
    config.title,
    `Hola ${customerName},`,
    config.mainText,
    orderContextMessage(type, order),
    `Pedido: #${order.order_number || order.id}`,
    `Pago: ${paymentLabel(order.payment_method)}`,
    `Entrega: ${deliveryLabel(order)}`,
    `Total: ${formatCurrency(total)}`,
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
      from: formatSenderEmail(env.fromEmail),
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
  const subject = 'Tu contraseña fue actualizada';
  const html = baseEmailLayout({
    preheader: 'La contraseña de tu cuenta fue actualizada correctamente.',
    title: 'Contraseña actualizada',
    children: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Te confirmamos que la contraseña de tu cuenta fue actualizada correctamente.</p>
      ${infoBox('<p style="margin:0;font-size:14px;line-height:1.6;color:#7a5a00;">Si no realizaste este cambio, contactanos lo antes posible.</p>', COLORS.warning)}
    `,
  });
  const text = `Hola ${name},\nTe confirmamos que la contraseña de tu cuenta fue actualizada correctamente.\nSi no realizaste este cambio, contactanos lo antes posible.\n${BRAND_NAME}\nWhatsApp: ${WHATSAPP}`;

  const resend = await sendResendEmail({ to: email, subject, html, text, env });
  return { sent: true, resend };
};
