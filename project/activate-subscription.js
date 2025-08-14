// Script para activar suscripción manualmente
console.log('🚀 Activando suscripción para NachoGemerXD@hotmail.com...');

// Crear suscripción activa
const subscription = {
  email: 'NachoGemerXD@hotmail.com',
  name: 'Admin User',
  planType: 'premium',
  price: 9999,
  paymentMethod: 'manual',
  status: 'active',
  subscribedAt: new Date().toISOString(),
  startDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días desde ahora
  subscriptionId: 'manual-' + Date.now()
};

// Verificar si hay suscripciones existentes
let existingSubscriptions = [];
try {
  const saved = localStorage.getItem('orchid-subscriptions');
  existingSubscriptions = saved ? JSON.parse(saved) : [];
} catch (error) {
  console.log('No hay suscripciones previas, creando nueva lista');
}

// Remover cualquier suscripción existente para este email
existingSubscriptions = existingSubscriptions.filter(sub => sub.email !== 'NachoGemerXD@hotmail.com');

// Agregar la nueva suscripción
existingSubscriptions.push(subscription);

// Guardar en localStorage
localStorage.setItem('orchid-subscriptions', JSON.stringify(existingSubscriptions));

console.log('✅ Suscripción activada exitosamente!');
console.log('📋 Detalles de la suscripción:', subscription);
console.log('📅 Válida hasta:', new Date(subscription.expiryDate).toLocaleDateString('es-ES'));

// También crear el usuario si no existe
let users = [];
try {
  const savedUsers = localStorage.getItem('orchid-users');
  users = savedUsers ? JSON.parse(savedUsers) : [];
} catch (error) {
  console.log('No hay usuarios previos');
}

// Verificar si el usuario admin ya existe
const adminExists = users.find(u => u.email === 'NachoGemerXD@hotmail.com');
if (!adminExists) {
  const adminUser = {
    name: 'Admin User',
    email: 'NachoGemerXD@hotmail.com',
    password: 'admin123', // Puedes cambiar esto
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  users.push(adminUser);
  localStorage.setItem('orchid-users', JSON.stringify(users));
  console.log('👤 Usuario admin creado también');
}

console.log('🎉 ¡Listo! Ahora puedes probar la funcionalidad de cancelación');