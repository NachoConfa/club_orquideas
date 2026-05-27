import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastInput = {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
};

type Toast = Required<Pick<ToastInput, 'message' | 'type' | 'duration'>> & {
  id: string;
  title?: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { border: string; bg: string; icon: string; Icon: typeof Info }> = {
  success: {
    border: 'border-[#B9E8CF]',
    bg: 'bg-[#E8F7EF]',
    icon: 'text-[#0F8F61]',
    Icon: CheckCircle2,
  },
  error: {
    border: 'border-[#F6CACA]',
    bg: 'bg-[#FDECEC]',
    icon: 'text-[#B42318]',
    Icon: AlertCircle,
  },
  warning: {
    border: 'border-[#F6DFA8]',
    bg: 'bg-[#FFF3CD]',
    icon: 'text-[#A15C07]',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-[#D9E6F2]',
    bg: 'bg-white',
    icon: 'text-[#0F8F61]',
    Icon: Info,
  },
};

const createToastId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type = 'info', duration = 4500 }: ToastInput) => {
      const id = createToastId();
      const toast: Toast = { id, title, message, type, duration };

      setToasts((current) => [toast, ...current].slice(0, 4));

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast({ type: 'success', title, message }),
      error: (message, title) => showToast({ type: 'error', title, message, duration: 6500 }),
      warning: (message, title) => showToast({ type: 'warning', title, message, duration: 6000 }),
      info: (message, title) => showToast({ type: 'info', title, message }),
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:bottom-auto sm:right-6 sm:top-6"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];
          const Icon = style.Icon;

          return (
            <div
              key={toast.id}
              className={`rounded-xl border ${style.border} ${style.bg} p-4 text-[#1F2933] shadow-lg shadow-black/10`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <div className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.icon}`} />
                <div className="min-w-0 flex-1">
                  {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                  <p className="text-sm leading-5 text-[#1F2933]">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-white/70 hover:text-[#1F2933]"
                  aria-label="Cerrar mensaje"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider.');
  }

  return context;
};
