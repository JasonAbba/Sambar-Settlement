import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../lib/util';

let openCount = 0;

/**
 * Bottom sheet on phones (thumb-reachable, respects the iOS home indicator),
 * centred dialog on larger screens.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Lock background scroll (incl. iOS Safari rubber-banding).
    openCount++;
    document.documentElement.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount === 0) document.documentElement.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="fade-in absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'sheet-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-lift sm:rounded-3xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-cream-300 sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-5 pb-3 pt-3 sm:pt-5">
          <h2 id={titleId} className="font-display text-xl text-maroon-800">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="icon-btn -mr-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-cream-200 bg-cream-50 px-5 pt-3 pb-safe-3">{footer}</div>
        )}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>,
    document.body,
  );
}
