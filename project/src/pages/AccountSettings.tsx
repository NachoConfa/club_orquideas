import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  Home,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  Shield,
  Truck,
  User,
} from 'lucide-react';
import TurnstileWidget from '../components/TurnstileWidget';
import { getSupabaseOrdersForUser, type CustomerOrder } from '../services/orderSupabaseService';
import { isSupabaseReady, sendSupabasePasswordReset, updateSupabaseProfile } from '../services/supabaseService';
import {
  TURNSTILE_FAILED_MESSAGE,
  TURNSTILE_REQUIRED_MESSAGE,
  isTurnstileEnabled,
} from '../services/turnstileService';

type ProfileTab = 'profile' | 'security' | 'orders';

interface ProfileUser {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isAdmin?: boolean;
  createdAt?: string;
}

interface AccountSettingsProps {
  user: ProfileUser;
  onBack: () => void;
  onUpdateUser: (updatedUser: Partial<ProfileUser>) => void;
  onLogout: () => void | Promise<void>;
}

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

const formatDate = (value?: string) => {
  if (!value) return 'No disponible';
  return new Date(value).toLocaleDateString('es-AR');
};

const getStatusText = (status: CustomerOrder['status']) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmado';
    case 'paid':
      return 'Pagado';
    case 'processing':
      return 'En preparación';
    case 'shipped':
      return 'Enviado';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    case 'requires_review':
      return 'Requiere revisión';
    default:
      return 'Pendiente';
  }
};

const getStatusClass = (status: CustomerOrder['status']) => {
  switch (status) {
    case 'confirmed':
    case 'paid':
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'requires_review':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const getPaymentText = (method: CustomerOrder['paymentMethod']) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'mercadopago':
      return 'Mercado Pago';
    default:
      return 'Transferencia';
  }
};

const getShippingText = (order: CustomerOrder) => {
  if (order.deliveryMethod === 'pickup') {
    return 'Retiro en local';
  }

  if (order.shippingMethod === 'uber') {
    return `Envío por Uber${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`;
  }

  return order.shippingRequiresQuote
    ? `Encomienda a cotizar${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`
    : `Encomienda${order.shippingZoneName ? ` - ${order.shippingZoneName}` : ''}`;
};

const AccountSettings = ({ user, onBack, onUpdateUser, onLogout }: AccountSettingsProps) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
  });
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingPasswordEmail, setIsSendingPasswordEmail] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordResetCaptchaToken, setPasswordResetCaptchaToken] = useState('');
  const [passwordResetCaptchaKey, setPasswordResetCaptchaKey] = useState(0);
  const shouldShowPasswordCaptcha = isTurnstileEnabled();
  const isPasswordResetButtonDisabled =
    isSendingPasswordEmail || (shouldShowPasswordCaptcha && !passwordResetCaptchaToken);

  useEffect(() => {
    setProfileData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
    });
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!user.id) {
        return;
      }

      setIsLoadingOrders(true);
      setOrdersError('');

      try {
        const userOrders = await getSupabaseOrdersForUser(user.id);
        if (isMounted) {
          setOrders(userOrders);
        }
      } catch (error) {
        console.error('Error cargando pedidos del perfil:', error);
        if (isMounted) {
          setOrdersError(error instanceof Error ? error.message : 'No se pudieron cargar tus pedidos.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrders(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const stats = useMemo(() => {
    const spent = orders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter((order) => ['pending', 'confirmed', 'processing'].includes(order.status)).length;

    return {
      totalOrders: orders.length,
      pending,
      spent,
    };
  }, [orders]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    window.setTimeout(() => setSuccessMessage(''), 3500);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
  };

  const resetPasswordCaptcha = useCallback(() => {
    setPasswordResetCaptchaToken('');
    setPasswordResetCaptchaKey((current) => current + 1);
  }, []);

  const handlePasswordCaptchaVerify = useCallback((token: string) => {
    if (import.meta.env.DEV) {
      console.info('Captcha de cambio de contraseña completado:', {
        hasCaptchaToken: Boolean(token),
        tokenLength: token?.length ?? 0,
      });
    }

    setPasswordResetCaptchaToken(token);
  }, []);

  const clearPasswordCaptchaToken = useCallback(() => {
    setPasswordResetCaptchaToken('');
  }, []);

  const getPasswordResetErrorMessage = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = rawMessage.toLowerCase();

    if (lowerMessage.includes('captcha') || lowerMessage.includes('turnstile')) {
      return TURNSTILE_FAILED_MESSAGE;
    }

    return error instanceof Error ? error.message : 'No se pudo enviar el email de cambio de contraseña.';
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!profileData.name.trim() || !profileData.email.trim()) {
      showError('El nombre y el email son obligatorios.');
      return;
    }

    setIsSavingProfile(true);

    try {
      if (!isSupabaseReady()) {
        throw new Error('El servicio de cuenta no está configurado.');
      }

      const updatedUser = await updateSupabaseProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim(),
        currentEmail: user.email,
      });

      onUpdateUser({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
      });
      showSuccess('Tus datos fueron actualizados.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordResetEmail = async () => {
    if (!user.email) {
      showError('No encontramos un email válido para enviar el cambio de contraseña.');
      return;
    }

    const captchaToken = passwordResetCaptchaToken.trim();

    if (shouldShowPasswordCaptcha) {
      if (import.meta.env.DEV) {
        console.info('Captcha antes de enviar cambio de contraseña:', {
          hasCaptchaToken: Boolean(captchaToken),
          tokenLength: captchaToken.length,
        });
      }

      if (!captchaToken) {
        showError(TURNSTILE_REQUIRED_MESSAGE);
        return;
      }
    }

    setIsSendingPasswordEmail(true);

    try {
      if (!isSupabaseReady()) {
        throw new Error('El servicio de cuenta no está configurado.');
      }

      await sendSupabasePasswordReset(user.email, shouldShowPasswordCaptcha ? captchaToken : undefined);
      showSuccess('Te enviamos un email para cambiar tu contraseña.');
      resetPasswordCaptcha();
    } catch (error) {
      showError(getPasswordResetErrorMessage(error));
      resetPasswordCaptcha();
    } finally {
      setIsSendingPasswordEmail(false);
    }
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);

    try {
      await onLogout();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo cerrar sesión.');
      setIsLoggingOut(false);
    }
  };

  const tabs: Array<{ id: ProfileTab; label: string; icon: ReactNode }> = [
    { id: 'profile', label: 'Datos', icon: <User className="h-4 w-4" /> },
    { id: 'security', label: 'Seguridad', icon: <Shield className="h-4 w-4" /> },
    { id: 'orders', label: 'Pedidos', icon: <Package className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="mb-8 rounded-2xl border border-[#F1E3D4] bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#CFE3D4]">
                <User className="h-8 w-8 text-[#2F3A35]" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-[#2F3A35]">Mi perfil</h1>
                <p className="mt-1 break-all text-[#6B7280]">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-2 self-stretch rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#F1E3D4] bg-[#FFF8EF] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-[#6B7280]">Pedidos</p>
                <p className="mt-1 text-2xl font-semibold text-[#0F8F61]">{stats.totalOrders}</p>
              </div>
              <div className="rounded-lg border border-[#F1E3D4] bg-[#FFF8EF] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-[#6B7280]">En curso</p>
                <p className="mt-1 text-2xl font-semibold text-[#D96C9F]">{stats.pending}</p>
              </div>
              <div className="rounded-lg border border-[#F1E3D4] bg-[#FFF8EF] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-[#6B7280]">Total comprado</p>
                <p className="mt-1 text-2xl font-semibold text-[#2F3A35]">{formatMoney(stats.spent)}</p>
              </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedOrder(null);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0F8F61] text-white'
                    : 'bg-[#F8DDEB]/45 text-[#2F3A35] hover:bg-[#F8DDEB]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {errorMessage}
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-[#F1E3D4] bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Datos personales</h2>
              <p className="mt-1 text-sm text-gray-600">
                Estos datos se usan para contactarte y completar tus pedidos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Nombre completo</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(event) => setProfileData((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-[#F1E3D4] py-3 pl-10 pr-4 focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(event) => setProfileData((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-lg border border-[#F1E3D4] py-3 pl-10 pr-4 focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Teléfono</span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(event) => setProfileData((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-lg border border-[#F1E3D4] py-3 pl-10 pr-4 focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                    placeholder="+54 9 11..."
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Dirección principal</span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(event) => setProfileData((current) => ({ ...current, address: event.target.value }))}
                    className="w-full rounded-lg border border-[#F1E3D4] py-3 pl-10 pr-4 focus:border-[#0F8F61] focus:ring-2 focus:ring-[#E8F7EF]"
                    placeholder="Calle, numero, piso/depto"
                  />
                </div>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-6 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <span>Miembro desde: {formatDate(user.createdAt)}</span>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8F61] px-5 py-3 font-semibold text-white hover:bg-[#0C7A52] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {isSavingProfile ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <section className="rounded-2xl border border-[#F1E3D4] bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Seguridad</h2>
              <p className="mt-1 text-sm text-gray-600">
                Cambiá tu contraseña mediante un enlace seguro enviado a tu email.
              </p>
            </div>

            <div className="rounded-lg border border-[#CFE3D4] bg-[#CFE3D4]/45 px-4 py-4 text-sm text-[#2F3A35]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Mail className="h-5 w-5 flex-shrink-0 text-[#0F8F61]" />
                <div>
                  <p className="font-semibold">El enlace se enviará a {user.email}.</p>
                  <p className="mt-1 text-[#6B7280]">
                    No pedimos tu contraseña actual en esta pantalla. El cambio se completa desde el email de recuperación.
                  </p>
                </div>
              </div>
            </div>

            {shouldShowPasswordCaptcha && (
              <div className="mt-6">
                <TurnstileWidget
                  key={`profile-password-reset-${passwordResetCaptchaKey}`}
                  action="password_reset"
                  onVerify={handlePasswordCaptchaVerify}
                  onExpire={clearPasswordCaptchaToken}
                  onError={clearPasswordCaptchaToken}
                />
                {!passwordResetCaptchaToken && (
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Completá la verificación de seguridad para continuar.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handlePasswordResetEmail}
              disabled={isPasswordResetButtonDisabled}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8F61] px-5 py-3 font-semibold text-white hover:bg-[#0C7A52] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Mail className="h-5 w-5" />
              {isSendingPasswordEmail ? 'Enviando...' : 'Enviar email de cambio de contraseña'}
            </button>
          </section>
        )}

        {activeTab === 'orders' && (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Historial de pedidos</h2>
                <p className="mt-1 text-sm text-gray-600">Consulta el estado, envio, pago y productos de cada pedido.</p>
              </div>
            </div>

            {!user.id ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                No se pudo identificar tu usuario para cargar pedidos.
              </div>
            ) : isLoadingOrders ? (
              <div className="py-12 text-center text-gray-500">Cargando pedidos...</div>
            ) : ordersError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{ordersError}</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-14 w-14 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700">Todavia no tenes pedidos</h3>
                <p className="mt-1 text-gray-500">Cuando compres, vas a ver el detalle aca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                <div className="space-y-4">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selectedOrder?.id === order.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-gray-900">Pedido #{order.orderNumber}</h3>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{order.items.length} producto{order.items.length !== 1 ? 's' : ''}</p>
                          <p className="mt-1 text-sm text-gray-500">{getShippingText(order)}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                          <p className="text-lg font-bold text-emerald-700">{formatMoney(order.total)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-gray-200 p-5">
                  {selectedOrder ? (
                    <div>
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Pedido #{selectedOrder.orderNumber}</h3>
                          <p className="mt-1 text-sm text-gray-500">{formatDate(selectedOrder.date)}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(selectedOrder.status)}`}>
                          {getStatusText(selectedOrder.status)}
                        </span>
                      </div>

                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span>Pago: {getPaymentText(selectedOrder.paymentMethod)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedOrder.deliveryMethod === 'pickup' ? (
                            <Home className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Truck className="h-4 w-4 text-gray-400" />
                          )}
                          <span>{getShippingText(selectedOrder)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(selectedOrder.date)}</span>
                        </div>
                      </div>

                      {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.customerInfo.address && (
                        <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                          <p className="font-semibold text-gray-900">Dirección de entrega</p>
                          <p className="mt-1">{selectedOrder.customerInfo.address}</p>
                          <p>{selectedOrder.customerInfo.city}, {selectedOrder.customerInfo.province}</p>
                          <p>CP: {selectedOrder.customerInfo.postalCode}</p>
                        </div>
                      )}

                      <div className="mt-5">
                        <p className="mb-3 font-semibold text-gray-900">Productos</p>
                        <div className="space-y-3">
                          {selectedOrder.items.map((item) => (
                            <div key={`${selectedOrder.id}-${item.id}`} className="flex items-center gap-3">
                              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                              </div>
                              <p className="font-semibold text-gray-900">{formatMoney(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatMoney(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{selectedOrder.deliveryMethod === 'pickup' ? 'Retiro' : 'Envío'}</span>
                          <span>
                            {selectedOrder.deliveryMethod === 'pickup'
                              ? 'Gratis'
                              : selectedOrder.shippingRequiresQuote
                                ? 'A cotizar'
                                : formatMoney(selectedOrder.shipping)}
                          </span>
                        </div>
                        {selectedOrder.paymentFee > 0 && (
                          <div className="flex justify-between">
                            <span>Recargo Mercado Pago (10%)</span>
                            <span>{formatMoney(selectedOrder.paymentFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900">
                          <span>{selectedOrder.shippingRequiresQuote ? 'Total parcial' : 'Total'}</span>
                          <span>{formatMoney(selectedOrder.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-gray-500">
                      <Package className="mb-3 h-12 w-12 text-gray-300" />
                      <p>Selecciona un pedido para ver el detalle.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
