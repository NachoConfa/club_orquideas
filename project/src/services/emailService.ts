import { getSupabaseConfigMessage, supabase } from '../lib/supabase';

type OrderEmailType = 'order_received' | 'order_confirmed' | 'order_cancelled';

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const invokeTransactionalEmail = async (body: Record<string, unknown>) => {
  const client = getClient();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error('No hay una sesion activa para enviar el email.');
  }

  const { data, error } = await client.functions.invoke('send-transactional-email', {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

const sendOrderEmailSafely = async (type: OrderEmailType, orderId: string) => {
  try {
    if (!orderId) {
      return { success: false, skipped: true };
    }

    const result = await invokeTransactionalEmail({ type, orderId });
    return { success: true, result };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('No se pudo enviar email transaccional:', { type, orderId, error });
    }
    return { success: false, error };
  }
};

export const sendOrderReceivedEmail = (orderId: string) => sendOrderEmailSafely('order_received', orderId);

export const sendOrderConfirmedEmail = (orderId: string) => sendOrderEmailSafely('order_confirmed', orderId);

export const sendOrderCancelledEmail = (orderId: string) => sendOrderEmailSafely('order_cancelled', orderId);

export const sendPasswordChangedEmail = async () => {
  try {
    const result = await invokeTransactionalEmail({ type: 'password_changed' });
    return { success: true, result };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('No se pudo enviar email de cambio de contrasena:', error);
    }
    return { success: false, error };
  }
};

export const sendOrderConfirmationEmail = async (orderData: { orderId?: string }) =>
  sendOrderReceivedEmail(orderData.orderId || '');

export const sendInternalNotification = async (_type?: string, _data?: unknown) => ({ success: true, skipped: true });

export const sendPasswordResetEmail = async (_email?: string, _resetLink?: string) => ({ success: true, skipped: true });

export const sendProductAvailabilityEmail = async (_email?: string, _productName?: string) => ({
  success: true,
  skipped: true,
});

export const sendSubscriptionConfirmationEmail = async (_customerData?: unknown) => ({ success: true, skipped: true });
