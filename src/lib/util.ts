export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}-${rand}` : rand;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Local date as YYYY-MM-DD (not UTC, so evening entries don't shift a day). */
export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(iso: string, style: 'long' | 'short' = 'long'): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString(
    'en-IN',
    style === 'long'
      ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' },
  );
}

export function relativeDay(iso: string): string | null {
  const diff = Math.round(
    (parseISODate(todayISO()).getTime() - parseISODate(iso).getTime()) / 86400000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Read an image file and downscale it to a compact JPEG data URL suitable for LocalStorage. */
export function compressImage(file: File, maxSize = 480, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error('Could not process the image.'));
        return;
      }
      ctx.fillStyle = '#FBF4E4';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Try a JPEG or PNG.'));
    };
    img.src = url;
  });
}
