import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { cx } from '../lib/util';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success(msg: string): void;
  error(msg: string): void;
  info(msg: string): void;
}

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 4500 : 2800);
    },
    [dismiss],
  );
  const toastApi = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })),
    [],
  );
  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <Modal open={!!confirmState} onClose={() => close(false)} title={confirmState?.title ?? ''} size="sm">
          {confirmState && (
            <div className="space-y-5">
              <div className="flex gap-3">
                <div
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    confirmState.danger ? 'bg-maroon-50 text-maroon-600' : 'bg-mustard-100 text-mustard-600',
                  )}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="pt-1 text-[15px] leading-relaxed text-ink-700">{confirmState.message}</div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button className="btn btn-secondary" onClick={() => close(false)}>
                  {confirmState.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  className={cx('btn', confirmState.danger ? 'btn-danger' : 'btn-primary')}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {confirmState.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </Modal>

        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={cx(
                'toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift',
                t.kind === 'success' && 'bg-leaf-700 text-white',
                t.kind === 'error' && 'bg-maroon-700 text-white',
                t.kind === 'info' && 'bg-ink-900 text-cream-50',
              )}
            >
              {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mustard-300" />}
              {t.kind === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-mustard-300" />}
              {t.kind === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-mustard-300" />}
              <span className="flex-1 leading-snug">{t.message}</span>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-m-2 p-2 opacity-70">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside FeedbackProvider');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside FeedbackProvider');
  return ctx;
}
