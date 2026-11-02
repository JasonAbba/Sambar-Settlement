import { useMemo, useState } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';
import { useStore } from '../data/store';
import { computeBadges, lunchShareText, whatsappUrl, type Badge } from '../lib/fun';
import { useToast } from './feedback';

export function useBadges(): Map<string, Badge[]> {
  const { data } = useStore();
  return useMemo(() => computeBadges(data), [data]);
}

/** Compact emoji badges next to a name. Tap/hover shows what they mean. */
export function BadgeIcons({ userId, max = 4 }: { userId: string; max?: number }) {
  const badges = useBadges().get(userId) ?? [];
  const toast = useToast();
  if (!badges.length) return null;
  const shown = badges.slice(0, max);
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 align-middle">
      {shown.map((b) => (
        <button
          key={b.id}
          type="button"
          title={`${b.label}: ${b.description}`}
          aria-label={`${b.label}: ${b.description}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.info(`${b.emoji} ${b.label}: ${b.description}`);
          }}
          className="text-[15px] leading-none"
        >
          {b.emoji}
        </button>
      ))}
      {badges.length > max && <span className="text-[11px] font-bold text-ink-400">+{badges.length - max}</span>}
    </span>
  );
}

/** Full badge chips (label visible), for the People page. */
export function BadgeChips({ userId }: { userId: string }) {
  const badges = useBadges().get(userId) ?? [];
  if (!badges.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.id} title={b.description} className="inline-flex items-center gap-1 rounded-full bg-mustard-100 px-2 py-0.5 text-[11px] font-bold text-ink-700">
          {b.emoji} {b.label}
        </span>
      ))}
    </div>
  );
}

/** "Share on WhatsApp" (no API needed: opens wa.me with the message prefilled) + native share sheet. */
export function ShareLunch({ lunchId, className }: { lunchId: string; className?: string }) {
  const { data } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}#/history/${lunchId}`;
  const text = lunchShareText(data, lunchId, link);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const nativeShare = async () => {
    setBusy(true);
    try {
      await navigator.share({ text });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          toast.success('Summary copied — paste it anywhere.');
        } catch {
          toast.error('Could not share. Try the WhatsApp button.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied.');
    } catch {
      toast.error('Copy failed on this browser.');
    }
  };

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="btn flex-1 bg-[#1F8F4E] text-white shadow-sm hover:bg-[#197A42] active:bg-[#146636]">
        <MessageCircle className="h-5 w-5" /> Share on WhatsApp
      </a>
      <button
        type="button"
        onClick={canNativeShare ? nativeShare : copy}
        disabled={busy}
        className="btn btn-secondary w-12 px-0"
        aria-label={canNativeShare ? 'More sharing options' : 'Copy summary'}
        title={canNativeShare ? 'More sharing options' : 'Copy summary'}
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
