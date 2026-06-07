import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff } from '../lib/icons';
import TurnstileWidget from './TurnstileWidget';
import {
  TURNSTILE_FAILED_MESSAGE,
  TURNSTILE_REQUIRED_MESSAGE,
  isTurnstileEnabled,
} from '../services/turnstileService';
import {
  isSupabaseReady,
  sendSupabasePasswordReset,
  signInWithSupabase,
  signUpWithSupabase,
  type AuthenticatedUser,
} from '../services/supabaseService';
import { useToast } from './feedback/ToastProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthenticatedUser | { name: string; email: string }) => void;
  user: { name: string; email: string; isAdmin?: boolean } | null;
  onLogout: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAdmin?: () => void;
  initialMode?: 'login' | 'register';
  notice?: string;
}

const emptyForm = {
  name: '',
  email: '',
  resetEmail: '',
};

const AUTH_FLOW_TIMEOUT_MS = 20000;

const withAuthFlowTimeout = <T,>(operation: Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error('El inicio de sesión tardó demasiado. Verificá tu conexión e intentá nuevamente.')),
      AUTH_FLOW_TIMEOUT_MS
    );

    operation
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeoutId));
  });

const AuthModal = ({
  isOpen,
  onClose,
  onLogin,
  user,
  initialMode = 'login',
  notice = '',
}: AuthModalProps) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [formData, setFormData] = useState(emptyForm);
  const [password, setPassword] = useState('');
  const toast = useToast();
  const shouldShowCaptcha = isTurnstileEnabled();

  const resetTurnstile = useCallback(() => {
    setTurnstileToken('');
    setTurnstileResetKey((current) => current + 1);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(emptyForm);
    setPassword('');
    setShowPassword(false);
    resetTurnstile();
  }, [resetTurnstile]);

  useEffect(() => {
    if (isOpen && !user) {
      setAuthMode(initialMode);
      setShowForgotPassword(false);
      resetTurnstile();
    }
  }, [initialMode, isOpen, resetTurnstile, user]);

  const handleTurnstileVerify = useCallback((token: string) => {
    if (import.meta.env.DEV) {
      console.info('Turnstile completado:', {
        hasToken: Boolean(token),
        tokenLength: token?.length ?? 0,
      });
    }

    setTurnstileToken(token);
  }, []);

  const clearTurnstileToken = useCallback(() => {
    setTurnstileToken('');
  }, []);

  const getCaptchaTokenForAuth = (flow: 'login' | 'register' | 'password_reset') => {
    if (!shouldShowCaptcha) {
      return undefined;
    }

    const captchaToken = turnstileToken.trim();

    if (import.meta.env.DEV) {
      console.info('Captcha antes de enviar a Supabase Auth:', {
        flow,
        hasCaptchaToken: Boolean(captchaToken),
        tokenLength: captchaToken.length,
      });
    }

    if (!captchaToken) {
      toast.warning(TURNSTILE_REQUIRED_MESSAGE);
      return null;
    }

    return captchaToken;
  };

  const getAuthErrorMessage = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = rawMessage.toLowerCase();

    if (lowerMessage.includes('captcha') || lowerMessage.includes('turnstile')) {
      return TURNSTILE_FAILED_MESSAGE;
    }

    return error instanceof Error ? error.message : 'No se pudo completar la autenticación.';
  };

  const handleClose = () => {
    resetForm();
    setAuthMode('login');
    setShowForgotPassword(false);
    setIsResettingPassword(false);
    setIsSubmitting(false);
    onClose();
  };

  const toggleAuthMode = () => {
    setAuthMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'));
    setShowForgotPassword(false);
    resetForm();
  };

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsResettingPassword(true);

    try {
      const captchaToken = getCaptchaTokenForAuth('password_reset');
      if (captchaToken === null) {
        return;
      }

      if (!isSupabaseReady()) {
        throw new Error('El servicio de autenticación no está configurado.');
      }

      await sendSupabasePasswordReset(formData.resetEmail, captchaToken);
      toast.success(`Se envió un enlace de recuperación a ${formData.resetEmail}. Revisá tu email para cambiar la contraseña.`);
      setShowForgotPassword(false);
      setFormData((current) => ({ ...current, resetEmail: '' }));
      resetTurnstile();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error enviando recuperacion:', error);
      }
      toast.error(getAuthErrorMessage(error));
      resetTurnstile();
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (authMode === 'register' && password.length < 6) {
      toast.warning('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      await withAuthFlowTimeout((async () => {
        const captchaToken = getCaptchaTokenForAuth(authMode);
        if (captchaToken === null) {
          return;
        }

        if (!isSupabaseReady()) {
          throw new Error('El servicio de autenticación no está configurado.');
        }

        if (authMode === 'login') {
          const authenticatedUser = await signInWithSupabase(formData.email, password, captchaToken);
          onLogin(authenticatedUser);
          handleClose();
          return;
        }

        const result = await signUpWithSupabase(formData.name, formData.email, password, captchaToken);

        if (result.needsEmailConfirmation) {
          toast.success('Cuenta creada. Revisá tu email para confirmar la cuenta antes de iniciar sesión.');
          handleClose();
          return;
        }

        if (result.user) {
          onLogin(result.user);
          handleClose();
        }
      })());
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error de autenticación:', error);
      }
      toast.error(getAuthErrorMessage(error));
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  if (user) {
    return null;
  }

  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-4">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="absolute left-1/2 top-1/2 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="p-5 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Recuperar contraseña</h2>
              <button onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Ingresá tu email y te enviaremos un enlace para cambiar tu contraseña.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  name="resetEmail"
                  value={formData.resetEmail}
                  onChange={(event) => setFormData((current) => ({ ...current, resetEmail: event.target.value }))}
                  autoComplete="email"
                  className="relative z-10 w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {shouldShowCaptcha && (
                <TurnstileWidget
                  key={`reset-${turnstileResetKey}`}
                  action="password_reset"
                  onVerify={handleTurnstileVerify}
                  onExpire={clearTurnstileToken}
                  onError={clearTurnstileToken}
                />
              )}

              <button
                type="submit"
                disabled={isResettingPassword}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResettingPassword ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  resetTurnstile();
                }}
                className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <button onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {notice && (
            <div className="mb-5 rounded-lg border border-[#EADBC8] bg-[#FFF8EF] p-4">
              <p className="text-sm font-medium leading-6 text-[#2F3A35]">{notice}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  autoComplete="name"
                  className="relative z-10 w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Correo electrónico"
                name="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                autoComplete="email"
                className="relative z-10 w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                disabled={false}
                readOnly={false}
                className="relative w-full rounded-lg border border-gray-300 py-3 pl-10 pr-12 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {shouldShowCaptcha && (
              <TurnstileWidget
                key={`${authMode}-${turnstileResetKey}`}
                action={authMode}
                onVerify={handleTurnstileVerify}
                onExpire={clearTurnstileToken}
                onError={clearTurnstileToken}
              />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Procesando...' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {authMode === 'login' && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setShowForgotPassword(true);
                    resetTurnstile();
                  }}
                  className="text-sm text-gray-600 transition-colors hover:text-emerald-600"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <p className="text-gray-600">
              {authMode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
              <button
                onClick={toggleAuthMode}
                className="ml-2 font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                {authMode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
