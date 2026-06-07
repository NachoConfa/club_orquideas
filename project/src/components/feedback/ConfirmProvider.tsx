import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, X } from '../../lib/icons';

type ConfirmTone = 'default' | 'danger';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type ActiveConfirm = Required<ConfirmOptions>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULT_CONFIRM: Pick<ActiveConfirm, 'confirmLabel' | 'cancelLabel' | 'tone'> = {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'default',
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [activeConfirm, setActiveConfirm] = useState<ActiveConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeConfirm = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setActiveConfirm(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setActiveConfirm({
          ...DEFAULT_CONFIRM,
          ...options,
        });
      }),
    []
  );

  useEffect(() => {
    if (!activeConfirm) {
      return undefined;
    }

    confirmButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConfirm, closeConfirm]);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {activeConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4" role="presentation">
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[#F1E3D4] bg-white p-5 text-[#1F2933] shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
          >
            <div className="mb-4 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  activeConfirm.tone === 'danger' ? 'bg-[#FDECEC] text-[#B42318]' : 'bg-[#E8F7EF] text-[#0F8F61]'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-lg font-semibold">
                  {activeConfirm.title}
                </h2>
                <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-[#6B7280]">
                  {activeConfirm.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#FFF8EF] hover:text-[#1F2933]"
                aria-label="Cerrar confirmación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-[#F1E3D4] bg-white px-4 py-2 text-sm font-semibold text-[#1F2933] transition-colors hover:bg-[#FFF8EF]"
              >
                {activeConfirm.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  activeConfirm.tone === 'danger'
                    ? 'bg-[#B42318] hover:bg-[#951F15]'
                    : 'bg-[#0F8F61] hover:bg-[#0C7A52]'
                }`}
              >
                {activeConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider.');
  }

  return context;
};
