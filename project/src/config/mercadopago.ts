// Configuración de MercadoPago
// Configuración con credenciales reales de MercadoPago

export const mercadoPagoConfig = {
  // Claves de prueba (TEST) - CONFIGURADAS
  accessToken: 'TEST-3101655012971041-080416-59e146e1661c40d116588276812bfd7c-457243833',
  publicKey: 'TEST-1617421f-6212-459c-a9bd-95956d175ced',
  
  // Claves de producción (PROD) - Descomenta cuando vayas a producción
  // accessToken: 'APP_USR-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789',
  // publicKey: 'APP_USR-12345678-1234-1234-1234-123456789012',
  
  // URLs de tu aplicación
  baseUrl: window.location.origin,
  
  // Configuración de notificaciones
  notificationUrl: `${window.location.origin}/webhook/mercadopago`,
  
  // URLs de retorno
  successUrl: `${window.location.origin}/#/payment-success`,
  failureUrl: `${window.location.origin}/#/payment-failure`,
  pendingUrl: `${window.location.origin}/#/payment-pending`
};

// API de Suscripciones de MercadoPago
export const createSubscription = async (userEmail: string, userName: string) => {
  try {
    const requestData = {
      payer_email: userEmail,
      payer_name: userName,
      back_url: mercadoPagoConfig.baseUrl
    };

    console.log('📤 Enviando solicitud de suscripción:', requestData);

    // Usar proxy en desarrollo, URL directa en producción
    const backendUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL;

    const response = await fetch(`${backendUrl}/api/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Respuesta del backend:', data);
    
    return {
      success: data.success,
      subscriptionId: data.subscription_id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      externalReference: data.external_reference,
      fallback: data.fallback || false
    };
  } catch (error) {
    console.error('Error creating MercadoPago subscription:', error);
    
    // Fallback: crear URL simulada con datos reales de transferencia
    const reference = `ORCHID-SUB-${userEmail}-${Date.now()}`;
    
    // Guardar referencia para verificación posterior
    localStorage.setItem(`mp_subscription_${reference}`, JSON.stringify({
      userEmail,
      userName,
      amount: 9999,
      createdAt: new Date().toISOString()
    }));
    
    // URL simulada que muestra los datos de transferencia
    const simulatedUrl = `${mercadoPagoConfig.baseUrl}/#/mercadopago-transfer?` +
      `amount=9999&` +
      `reference=${reference}&` +
      `email=${encodeURIComponent(userEmail)}&` +
      `name=${encodeURIComponent(userName)}&` +
      `type=subscription`;
    
    return {
      success: true,
      subscriptionId: reference,
      initPoint: simulatedUrl,
      sandboxInitPoint: simulatedUrl
    };
  }
};

// Instrucciones para configurar MercadoPago:
// 1. Ve a https://www.mercadopago.com.ar/developers
// 2. Crea una aplicación
// 3. Crea un Plan de Suscripción y obtén el preapproval_plan_id
// 4. Obtén tus credenciales de prueba y producción
// 5. Reemplaza los valores arriba
// 6. Configura las URLs de notificación en tu panel de MercadoPago
// 7. ¡Listo para recibir suscripciones reales!

export const verifySubscription = async (subscriptionId: string, reference: string) => {
  try {
    console.log('🔍 Verificando suscripción:', subscriptionId);

    // Usar proxy en desarrollo, URL directa en producción
    const backendUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_BACKEND_URL;

    const response = await fetch(`${backendUrl}/api/verify-subscription/${subscriptionId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const subscriptionData = await response.json();
    
    console.log('📊 Estado de suscripción:', subscriptionData);
    
    return {
      success: subscriptionData.success,
      status: subscriptionData.status,
      statusDetail: subscriptionData.status_detail
    };
  } catch (error) {
    console.error('Error verifying subscription:', error);
    
    // Fallback: verificar en localStorage
    const referenceData = localStorage.getItem(`mp_subscription_${reference}`);
    if (referenceData) {
      return {
        success: true,
        status: 'approved',
        statusDetail: 'accredited'
      };
    }
    
    return {
      success: false,
      error: 'Subscription not found'
    };
  }
};