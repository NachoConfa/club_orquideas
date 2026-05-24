import { getSupabaseConfigMessage, supabase } from '../lib/supabase';

interface MercadoPagoPreferenceResponse {
  id: string;
  initPoint: string;
}

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

export const createMercadoPagoPreference = async (orderId: string) => {
  const client = getClient();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error('Inicia sesion para pagar con Mercado Pago.');
  }

  const { data, error } = await client.functions.invoke<MercadoPagoPreferenceResponse>(
    'create-mercadopago-preference',
    {
      body: { orderId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (error) {
    throw error;
  }

  if (!data?.initPoint) {
    throw new Error('Mercado Pago no devolvio un link de pago.');
  }

  return data;
};
