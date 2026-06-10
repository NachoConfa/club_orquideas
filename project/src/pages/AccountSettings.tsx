import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  Home,
  LogOut,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  Shield,
  Star,
  Truck,
  User,
} from '../lib/icons';
import TurnstileWidget from '../components/TurnstileWidget';
import { getActiveLoyaltyBenefits } from '../services/loyaltyService';
import { getSupabaseOrdersForUser, type CustomerOrder } from '../services/orderSupabaseService';
import { isSupabaseReady, sendSupabasePasswordReset, updateSupabaseProfile } from '../services/supabaseService';
import type { LoyaltyBenefit } from '../types/loyalty';
import {
  TURNSTILE_FAILED_MESSAGE,
  TURNSTILE_REQUIRED_MESSAGE,
  isTurnstileEnabled,
} from '../services/turnstileService';

type ProfileTab = 'profile' | 'loyalty' | 'security' | 'orders';

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
  const [loyaltyBenefits, setLoyaltyBenefits] = useState<LoyaltyBenefit[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingLoyaltyBenefits, setIsLoadingLoyaltyBenefits] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [loyaltyError, setLoyaltyError] = useState('');
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
        if (import.meta.env.DEV) {
          console.error('Error cargando pedidos del perfil:', error);
        }
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

  useEffect(() => {
    let isMounted = true;

    const loadLoyaltyBenefits = async () => {
      setIsLoadingLoyaltyBenefits(true);
      setLoyaltyError('');

      try {
        const benefits = await getActiveLoyaltyBenefits();
        if (isMounted) {
          setLoyaltyBenefits(benefits);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error cargando beneficios del carnet:', error);
        }
        if (isMounted) {
          setLoyaltyError('No pudimos cargar los beneficios del carnet.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingLoyaltyBenefits(false);
        }
      }
    };

    void loadLoyaltyBenefits();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const spent = orders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter((order) => ['pending', 'confirmed', 'processing'].includes(order.status)).length;

    return {
      totalOrders: orders.length,
      pending,
      spent,
    };
  }, [orders]);

  const loyaltyProgress = useMemo(() => {
    const validPurchases = orders.filter(
      (order) => order.stockDeducted === true && order.status !== 'cancelled'
    ).length;
    const achievedBenefits = loyaltyBenefits.filter(
      (benefit) => benefit.required_purchases <= validPurchases
    );
    const currentBenefit = achievedBenefits[achievedBenefits.length - 1] ?? null;
    const nextBenefit =
      loyaltyBenefits.find((benefit) => benefit.required_purchases > validPurchases) ?? null;
    const progressPercent = nextBenefit
      ? Math.min(100, Math.round((validPurchases / Math.max(nextBenefit.required_purchases, 1)) * 100))
      : loyaltyBenefits.length > 0
        ? 100
        : 0;

    return {
      validPurchases,
      achievedBenefits,
      currentBenefit,
      nextBenefit,
      progressPercent,
      remainingPurchases: nextBenefit
        ? Math.max(nextBenefit.required_purchases - validPurchases, 0)
        : 0,
    };
  }, [loyaltyBenefits, orders]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    window.setTimeout(() => setSuccessMessage(''), 3500);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
  };

  const copyCouponCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showSuccess(`Cupón ${code} copiado. Usalo en el checkout.`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('No se pudo copiar el cupón:', error);
      }
      showError('No pudimos copiar el cupón. Seleccioná el código y copialo manualmente.');
    }
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
    { id: 'loyalty', label: 'Carnet', icon: <Star className="h-4 w-4" /> },
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

        {activeTab === 'loyalty' && (
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#B9E8CF] bg-white shadow-sm">
              <div className="bg-[#16352B] px-5 py-6 text-white sm:px-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B9E8CF]">
                      Mi carnet Modo Plantas
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                      {profileData.name || user.name}
                    </h2>
                    <p className="mt-2 text-sm text-white/75">
                      Tus compras confirmadas desbloquean beneficios especiales.
                    </p>
                  </div>
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <Star className="h-9 w-9 text-[#B9E8CF]" />
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                {isLoadingOrders || isLoadingLoyaltyBenefits ? (
                  <div className="py-8 text-center text-[#6B7280]">Cargando tu carnet...</div>
                ) : ordersError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    No pudimos calcular tus compras válidas. Intentá nuevamente más tarde.
                  </div>
                ) : loyaltyError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {loyaltyError}
                  </div>
                ) : loyaltyBenefits.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#CFE3D4] bg-[#FFF8EF] px-5 py-8 text-center">
                    <Star className="mx-auto h-9 w-9 text-[#0F8F61]" />
                    <h3 className="mt-3 font-semibold text-[#16352B]">Próximamente habrá nuevos beneficios</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Tus compras confirmadas quedarán registradas para el carnet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                          Compras válidas
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#0F8F61]">
                          {loyaltyProgress.validPurchases}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#F1E3D4] bg-[#FFF8EF] p-4 md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                          Beneficio actual
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#16352B]">
                          {loyaltyProgress.currentBenefit?.title ?? 'Todavía no desbloqueaste un beneficio'}
                        </p>
                        {loyaltyProgress.currentBenefit?.description && (
                          <p className="mt-1 text-sm text-[#6B7280]">
                            {loyaltyProgress.currentBenefit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-[#B9E8CF] bg-[#E8F7EF] p-5">
                      {loyaltyProgress.nextBenefit ? (
                        <>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[#0F8F61]">Próximo beneficio</p>
                              <h3 className="mt-1 text-lg font-semibold text-[#16352B]">
                                {loyaltyProgress.nextBenefit.title}
                              </h3>
                            </div>
                            <p className="text-sm font-semibold text-[#16352B]">
                              {loyaltyProgress.validPurchases} / {loyaltyProgress.nextBenefit.required_purchases} compras
                            </p>
                          </div>
                          <div
                            className="mt-4 h-3 overflow-hidden rounded-full bg-white"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={loyaltyProgress.nextBenefit.required_purchases}
                            aria-valuenow={loyaltyProgress.validPurchases}
                            aria-label="Progreso hacia el próximo beneficio"
                          >
                            <div
                              className="h-full rounded-full bg-[#0F8F61] transition-[width]"
                              style={{ width: `${loyaltyProgress.progressPercent}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm text-[#4B5A52]">
                            Te {loyaltyProgress.remainingPurchases === 1 ? 'falta' : 'faltan'}{' '}
                            <strong>
                              {loyaltyProgress.remainingPurchases}{' '}
                              {loyaltyProgress.remainingPurchases === 1 ? 'compra' : 'compras'}
                            </strong>{' '}
                            para desbloquear este beneficio.
                          </p>
                        </>
                      ) : (
                        <div className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0F8F61]" />
                          <div>
                            <h3 className="font-semibold text-[#16352B]">
                              Alcanzaste todos los beneficios disponibles
                            </h3>
                            <p className="mt-1 text-sm text-[#4B5A52]">
                              Seguiremos sumando novedades para miembros de Modo Plantas.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isLoadingLoyaltyBenefits && loyaltyBenefits.length > 0 && (
              <div className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-[#16352B]">Beneficios del carnet</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Los beneficios alcanzados quedan desbloqueados en tu perfil. Los cupones se usan en el checkout.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {loyaltyBenefits.map((benefit) => {
                    const isAchieved =
                      benefit.is_unlocked ??
                      benefit.required_purchases <= loyaltyProgress.validPurchases;
                    const remainingPurchases = Math.max(
                      benefit.required_purchases - loyaltyProgress.validPurchases,
                      0
                    );

                    return (
                      <article
                        key={benefit.id}
                        className={`rounded-xl border p-4 ${
                          isAchieved
                            ? 'border-[#B9E8CF] bg-[#E8F7EF]'
                            : 'border-[#F1E3D4] bg-[#FFF8EF]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                              isAchieved ? 'bg-[#0F8F61] text-white' : 'bg-white text-[#6B7280]'
                            }`}
                          >
                            {isAchieved ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F8F61]">
                              {benefit.required_purchases}{' '}
                              {benefit.required_purchases === 1 ? 'compra' : 'compras'}
                            </p>
                            <h3 className="mt-1 font-semibold text-[#16352B]">{benefit.title}</h3>
                            {benefit.description && (
                              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#6B7280]">
                                {benefit.description}
                              </p>
                            )}
                            {benefit.gift_description && (
                              <p className="mt-2 text-sm font-medium text-[#4B5A52]">
                                {benefit.gift_description}
                              </p>
                            )}
                            {isAchieved &&
                              benefit.benefit_type === 'coupon' &&
                              benefit.coupon_code && (
                                <div className="mt-3 rounded-lg border border-[#B9E8CF] bg-white p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                                    Tu cupón
                                  </p>
                                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <code className="break-all text-base font-bold text-[#16352B]">
                                      {benefit.coupon_code}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => void copyCouponCode(benefit.coupon_code as string)}
                                      disabled={benefit.coupon_is_active === false}
                                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8F61] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Copy className="h-4 w-4" />
                                      Copiar cupón
                                    </button>
                                  </div>
                                  <p className="mt-2 text-xs text-[#6B7280]">
                                    {benefit.coupon_is_active === false
                                      ? 'Este cupón está temporalmente inactivo.'
                                      : 'Usalo en el checkout.'}
                                  </p>
                                </div>
                              )}
                            {isAchieved &&
                              benefit.benefit_type === 'coupon' &&
                              !benefit.coupon_code && (
                                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                  El cupón asociado no está disponible. Contactanos para revisar el beneficio.
                                </p>
                              )}
                            <p
                              className={`mt-3 text-xs font-semibold ${
                                isAchieved ? 'text-[#0F8F61]' : 'text-[#6B7280]'
                              }`}
                            >
                              {isAchieved
                                ? 'Beneficio desbloqueado'
                                : `Te faltan ${remainingPurchases} ${
                                    remainingPurchases === 1 ? 'compra' : 'compras'
                                  }`}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
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
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="h-14 w-14 rounded-lg object-cover"
                              />
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
