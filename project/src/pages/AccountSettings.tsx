import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, Save, Eye, EyeOff, CheckCircle, Crown, Calendar, AlertTriangle, X, CreditCard } from 'lucide-react';
import { createSubscription } from '../config/mercadopago';

interface AccountSettingsProps {
  user: { name: string; email: string };
  onBack: () => void;
  onUpdateUser: (updatedUser: { name: string; email: string }) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onBack, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // Cargar información de la suscripción
  useEffect(() => {
    const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
    const userSubscription = subscriptions.find(
      (sub: any) => sub.email === user.email && (sub.status === 'active' || sub.status === 'cancelled')
    );
    setSubscription(userSubscription);
  }, [user.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    // Validaciones
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('❌ Las nuevas contraseñas no coinciden');
      setIsUpdating(false);
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      alert('❌ La nueva contraseña debe tener al menos 6 caracteres');
      setIsUpdating(false);
      return;
    }

    // Obtener usuarios del localStorage
    const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
    const currentUser = users.find((u: any) => u.email === user.email);

    // Verificar contraseña actual si se quiere cambiar
    if (formData.newPassword && formData.currentPassword !== currentUser?.password) {
      alert('❌ La contraseña actual es incorrecta');
      setIsUpdating(false);
      return;
    }

    // Verificar si el nuevo email ya existe (si cambió)
    if (formData.email !== user.email) {
      const emailExists = users.find((u: any) => u.email === formData.email && u.email !== user.email);
      if (emailExists) {
        alert('❌ Ya existe una cuenta con este email');
        setIsUpdating(false);
        return;
      }
    }

    // Simular delay de actualización
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Actualizar usuario en localStorage
    const updatedUsers = users.map((u: any) => {
      if (u.email === user.email) {
        return {
          ...u,
          name: formData.name,
          email: formData.email,
          password: formData.newPassword || u.password,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    localStorage.setItem('orchid-users', JSON.stringify(updatedUsers));

    // Actualizar usuario en sesión actual
    const updatedUser = { name: formData.name, email: formData.email };
    localStorage.setItem('orchid-user', JSON.stringify(updatedUser));
    onUpdateUser(updatedUser);

    setIsUpdating(false);
    setUpdateSuccess(true);

    // Limpiar campos de contraseña
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    // Ocultar mensaje de éxito después de 3 segundos
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);

    try {
      const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
      
      const updatedSubscriptions = subscriptions.map((sub: any) => 
        sub.email === user.email && sub.status === 'active'
          ? { 
              ...sub, 
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              activeUntil: sub.expiryDate
            }
          : sub
      );

      localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
      
      const cancelledSub = updatedSubscriptions.find(
        (sub: any) => sub.email === user.email && sub.status === 'cancelled'
      );
      setSubscription(cancelledSub);
      setShowCancelModal(false);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (cancelledSub && cancelledSub.expiryDate) {
        const expiryDate = new Date(cancelledSub.expiryDate).toLocaleDateString('es-ES');
        const message = `✅ Suscripción cancelada exitosamente.\n\n🎯 Mantienes acceso a todos los beneficios Premium hasta el ${expiryDate}.\n\n¿Te gustaría reactivar tu suscripción ahora?`;
        
        if (confirm(message)) {
          // Reactivar suscripción
          handleReactivateSubscription();
        }
      } else {
        alert('✅ Suscripción cancelada exitosamente.');
      }
    } catch (error) {
      alert('❌ Error al cancelar la suscripción.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;

    setIsCreatingPayment(true);

    try {
      // Crear suscripción de MercadoPago
      const subscription = await createSubscription(user.email, user.name);
      
      if (subscription.success) {
        // Crear suscripción pendiente
        const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
        const pendingSubscription = {
          email: user.email,
          name: user.name,
          planType: 'premium',
          price: 9999,
          paymentMethod: 'mercadopago',
          status: 'pending',
          subscribedAt: new Date().toISOString(),
          subscriptionId: subscription.subscriptionId
        };

        subscriptions.push(pendingSubscription);
        localStorage.setItem('orchid-subscriptions', JSON.stringify(subscriptions));

        // Redirigir a MercadoPago
        window.location.href = subscription.initPoint;
      } else {
        alert('Error al crear la suscripción. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error creating payment preference:', error);
      alert('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al perfil</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-full mr-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Configuración de Cuenta</h1>
              <p className="text-gray-600">Actualiza tu información personal y contraseña</p>
            </div>
          </div>

          {updateSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-green-700">¡Información actualizada exitosamente!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Personal */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Personal</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Cambiar Contraseña */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cambiar Contraseña</h3>
              <p className="text-sm text-gray-600 mb-4">Deja estos campos vacíos si no quieres cambiar tu contraseña</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    placeholder="Contraseña actual"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="Nueva contraseña"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirmar nueva contraseña"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón de Guardar */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </form>

          {/* Información Adicional */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Consejos de Seguridad</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Usa una contraseña fuerte con al menos 6 caracteres</li>
              <li>• No compartas tu contraseña con nadie</li>
              <li>• Cambia tu contraseña regularmente</li>
              <li>• Mantén tu información de contacto actualizada</li>
            </ul>
          </div>

          {/* Información de Suscripción */}
          {subscription && (
            <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Crown className="h-6 w-6 text-purple-500 mr-3" />
                  <h4 className="font-bold text-purple-800 text-lg">Mi Suscripción Premium</h4>
                </div>
                {subscription.status === 'active' && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    ✓ Activa
                  </span>
                )}
                {subscription.status === 'cancelled' && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                    ⚠ Cancelada
                  </span>
                )}
              </div>

              {/* Estado Activo */}
              {subscription.status === 'active' && (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <h5 className="font-semibold text-green-800">Suscripción Activa</h5>
                        <p className="text-sm text-green-700">
                          Disfruta de todos los beneficios Premium
                          {subscription.expiryDate && (
                            ` hasta el ${new Date(subscription.expiryDate).toLocaleDateString('es-ES')}`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="bg-red-100 text-red-700 py-2 px-4 rounded-lg font-semibold hover:bg-red-200 transition-colors flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancelar Suscripción</span>
                  </button>
                </div>
              )}

              {/* Estado Cancelado */}
              {subscription.status === 'cancelled' && (
                <div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-semibold text-orange-800 mb-2">Suscripción Cancelada</h5>
                        <p className="text-sm text-orange-700 mb-3">
                          Tu suscripción ha sido cancelada pero aún tienes acceso completo a todos los beneficios Premium 
                          {subscription.expiryDate && (
                            ` hasta el ${new Date(subscription.expiryDate).toLocaleDateString('es-ES')}`
                          )}.
                        </p>
                        <p className="text-sm text-orange-600 font-medium">
                          📅 Acceso Premium disponible hasta: {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Reactivar Suscripción</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="bg-orange-100 p-3 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">¿Cancelar Suscripción Premium?</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Lo que debes saber:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• ✅ Mantienes acceso completo hasta {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('es-ES') : 'tu próximo pago'}</li>
                  <li>• 🎯 Puedes reactivar en cualquier momento</li>
                  <li>• 💳 No se realizarán más cobros automáticos</li>
                  <li>• 🔄 Puedes cambiar de opinión después</li>
                </ul>
              </div>
              
              <p className="text-gray-600 text-sm">
                Tu suscripción se cancelará pero seguirás disfrutando todos los beneficios hasta la fecha indicada.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Mantener Suscripción
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {cancelling ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suscripción - Igual al de PremiumVideos */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Suscripción Premium</h2>
                <p className="text-gray-600">Accede a contenido exclusivo de expertos</p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">$9.999</div>
                  <div className="text-gray-600">por mes</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Acceso a todos los videos premium</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Contenido de expertos reconocidos</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Técnicas avanzadas y secretos profesionales</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Nuevos videos cada mes</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Cancela cuando quieras</span>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 mb-6">
                <h4 className="font-semibold text-green-800 mb-3">💳 Pago Seguro con MercadoPago</h4>
                <div className="text-sm text-green-700">
                  <p className="mb-2">✅ Transferencia bancaria segura</p>
                  <p className="mb-2">✅ Procesado por MercadoPago</p>
                  <p className="mb-2">✅ Activación tras confirmación de pago</p>
                  <p className="text-xs text-green-600 mt-3">
                    🔒 Pago 100% seguro. Serás redirigido a MercadoPago para completar la transferencia.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={isCreatingPayment}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Crown className="h-5 w-5" />
                <span>{isCreatingPayment ? 'Creando Suscripción...' : 'Suscribirse con MercadoPago'}</span>
              </button>

              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full mt-3 text-gray-600 py-2 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;