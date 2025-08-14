const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar MercadoPago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789'
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://localhost:5173', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());

// Endpoint para crear suscripción
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log('📝 Creando suscripción con datos:', req.body);

    const subscriptionData = {
      preapproval_plan_id: process.env.MERCADOPAGO_PLAN_ID || "2c938084726fca480172750000000000",
      reason: "Videos Premium - Club de Las Orquídeas",
      external_reference: `ORCHID-SUB-${Date.now()}`,
      payer_email: req.body.payer_email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
        transaction_amount: 9999,
        currency_id: "ARS"
      },
      back_url: `${req.body.back_url || 'http://localhost:5173'}/#/videos?payment=success`,
      status: "authorized"
    };

    console.log('📤 Enviando a MercadoPago:', subscriptionData);

    const subscription = new mercadopago.Preapproval(subscriptionData);
    const result = await subscription.save();

    console.log('✅ Suscripción creada:', result.body);

    res.json({
      success: true,
      subscription_id: result.body.id,
      init_point: result.body.init_point,
      sandbox_init_point: result.body.sandbox_init_point,
      external_reference: subscriptionData.external_reference
    });

  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    
    // Fallback: devolver URL de transferencia manual
    const reference = `ORCHID-SUB-${req.body.payer_email}-${Date.now()}`;
    const fallbackUrl = `${req.body.back_url || 'http://localhost:5173'}/#/mercadopago-transfer?` +
      `amount=9999&` +
      `reference=${reference}&` +
      `email=${encodeURIComponent(req.body.payer_email)}&` +
      `name=${encodeURIComponent(req.body.payer_name || 'Usuario')}&` +
      `type=subscription`;

    res.json({
      success: true,
      subscription_id: reference,
      init_point: fallbackUrl,
      sandbox_init_point: fallbackUrl,
      external_reference: reference,
      fallback: true
    });
  }
});

// Endpoint para verificar suscripción
app.get('/api/verify-subscription/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    console.log('🔍 Verificando suscripción:', subscriptionId);

    const subscription = await mercadopago.Preapproval.findById(subscriptionId);
    
    console.log('📊 Estado de suscripción:', subscription.body);

    res.json({
      success: true,
      status: subscription.body.status,
      status_detail: subscription.body.status_detail,
      payer_email: subscription.body.payer_email,
      external_reference: subscription.body.external_reference
    });

  } catch (error) {
    console.error('❌ Error verificando suscripción:', error);
    res.status(404).json({
      success: false,
      error: 'Subscription not found'
    });
  }
});

// Webhook para notificaciones de MercadoPago
app.post('/webhook/mercadopago', async (req, res) => {
  try {
    console.log('🔔 Webhook recibido:', req.body);

    const { type, data } = req.body;

    if (type === 'subscription_preapproval') {
      const subscriptionId = data.id;
      
      // Verificar estado de la suscripción
      const subscription = await mercadopago.Preapproval.findById(subscriptionId);
      
      console.log('📊 Estado actualizado:', subscription.body);

      // Aquí puedes actualizar tu base de datos
      // Por ejemplo, activar la suscripción del usuario
      
      if (subscription.body.status === 'authorized') {
        console.log('✅ Suscripción autorizada:', subscription.body.payer_email);
        // Activar suscripción en tu sistema
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).send('Error');
  }
});

// Endpoint para crear plan de suscripción (solo para setup inicial)
app.post('/api/create-plan', async (req, res) => {
  try {
    const planData = {
      reason: "Videos Premium - Club de Las Orquídeas",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 9999,
        currency_id: "ARS"
      }
    };

    const plan = new mercadopago.PreapprovalPlan(planData);
    const result = await plan.save();

    console.log('📋 Plan creado:', result.body);

    res.json({
      success: true,
      plan_id: result.body.id,
      plan: result.body
    });

  } catch (error) {
    console.error('❌ Error creando plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mercadopago_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 MercadoPago configurado: ${!!process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅' : '❌'}`);
});

module.exports = app;