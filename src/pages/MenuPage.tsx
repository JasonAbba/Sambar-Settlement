import { useRef, useState } from 'react';
import { Camera, EyeOff, ImageIcon, Link2, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { useStore } from '../data/store';
import { CATEGORIES, type MenuItem } from '../types';
import { formatINR, paiseToInput, parseRupees } from '../lib/money';
import { compressImage, cx } from '../lib/util';
import { Badge, EmptyState, PageHeader, RupeeInput } from '../components/ui';
import { Modal } from '../components/Modal';
import { ART_KINDS, ART_LABELS, DishArt, DishImage, artForCategory } from '../components/DishArt';
import { useConfirm, useToast } from '../components/feedback';

export default function MenuPage() {
  const store = useStore();
  const items = store.data.menuItems;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const categories = ['All', ...Array.from(new Set([...CATEGORIES.filter((c) => items.some((i) => i.category === c)), ...items.map((i) => i.category)]))];
  const shown = items.filter(
    (m) => (cat === 'All' || m.category === cat) && m.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const remove = async (m: MenuItem) => {
    if (
      await confirm({
        title: `Delete ${m.name}?`,
        message: 'It will be removed from the menu. Past lunches keep their recorded dish names and prices.',
        confirmLabel: 'Delete',
        danger: true,
      })
    ) {
      store.deleteMenuItem(m.id);
      toast.success(`${m.name} deleted.`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Menu"
        subtitle={<>Placeholder dishes &amp; prices — edit them to match the mess.</>}
        action={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Add dish</span><span className="sm:hidden">Add</span>
          </button>
        }
      />

      <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 -mx-4 mb-4 space-y-2 bg-cream-100/95 px-4 pb-2 pt-1 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input className="input pl-11" type="search" placeholder="Search the menu" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {categories.map((c) => (
            <button key={c} className={cx('chip', c === cat ? 'chip-on' : 'chip-off')} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="The menu is empty"
          message="Add the dishes you usually order."
          action={<button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-5 w-5" /> Add dish</button>}
        />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-500">No dishes match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((m) => (
            <article key={m.id} className={cx('card overflow-hidden', !m.isAvailable && 'opacity-60')}>
              <button className="block w-full text-left" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
                  <DishImage image={m.image} category={m.category} alt={m.name} />
                  <span className="absolute left-2 top-2 rounded-full bg-cream-50/90 px-2 py-0.5 text-[11px] font-bold text-leaf-700">{m.category}</span>
                  {!m.isAvailable && (
                    <span className="absolute right-2 top-2"><Badge tone="warn"><EyeOff className="h-3 w-3" /> Hidden</Badge></span>
                  )}
                </div>
                <div className="px-3 pt-2.5">
                  <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-tight">{m.name}</h3>
                  <div className="mt-1 text-lg font-extrabold tabular-nums text-maroon-700">{formatINR(m.price)}</div>
                </div>
              </button>
              <div className="flex justify-end gap-1 px-1.5 pb-1.5">
                <button className="icon-btn h-10 w-10" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="icon-btn h-10 w-10 text-maroon-600" onClick={() => remove(m)} aria-label={`Delete ${m.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <MenuItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MenuItemForm({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? 'Meals');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState(item ? paiseToInput(item.price) : '');
  const [image, setImage] = useState(item?.image ?? '');
  const [urlInput, setUrlInput] = useState(item && !item.image.startsWith('art:') && !item.image.startsWith('data:') ? item.image : '');
  const [isAvailable, setAvailable] = useState(item?.isAvailable ?? true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const knownCats = Array.from(new Set([...CATEGORIES, ...store.data.menuItems.map((m) => m.category)]));
  const finalCategory = category === '__new' ? customCategory.trim() : category;
  const previewImage = image || `art:${artForCategory(finalCategory || 'Meals')}`;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      setImage(await compressImage(file));
      setUrlInput('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseRupees(price);
    if (p == null) return toast.error('Enter a valid price, e.g. 180 or 180.50.');
    if (!finalCategory) return toast.error('Enter a category name.');
    let img = image;
    if (urlInput.trim()) {
      if (!/^https?:\/\//i.test(urlInput.trim())) return toast.error('Image URL should start with http:// or https://');
      img = urlInput.trim();
    }
    const res = store.saveMenuItem({
      id: item?.id,
      name,
      category: finalCategory,
      price: p,
      image: img || `art:${artForCategory(finalCategory)}`,
      isAvailable,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success(item ? `${res.value.name} updated.` : `${res.value.name} added to the menu.`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit dish' : 'Add a dish'}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" form="menu-form" className="btn btn-primary flex-[2]" disabled={busy}>
            {item ? 'Save changes' : 'Add to menu'}
          </button>
        </div>
      }
    >
      <form id="menu-form" onSubmit={submit} className="space-y-4">
        <div className="flex gap-3">
          <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-cream-200 shadow-inner">
            <DishImage key={urlInput || previewImage} image={urlInput.trim() || previewImage} category={finalCategory} alt="Preview" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Camera className="h-4 w-4" /> {busy ? 'Processing…' : 'Photo / upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {(image.startsWith('data:') || urlInput) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(''); setUrlInput(''); }}>
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="img-url"><Link2 className="mr-1 inline h-4 w-4" />Or paste an image URL</label>
          <input id="img-url" className="input" type="url" inputMode="url" placeholder="https://…" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
        </div>

        <details className="rounded-xl border border-cream-300 bg-white">
          <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 px-3 text-sm font-bold text-ink-700">
            <ImageIcon className="h-4 w-4" /> Or pick an illustration
          </summary>
          <div className="grid grid-cols-4 gap-2 p-3 pt-0">
            {ART_KINDS.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => { setImage(`art:${k}`); setUrlInput(''); }}
                className={cx('overflow-hidden rounded-lg border-2', image === `art:${k}` ? 'border-maroon-700' : 'border-transparent')}
                title={ART_LABELS[k]}
                aria-label={ART_LABELS[k]}
              >
                <DishArt kind={k} className="aspect-[4/3] w-full" />
              </button>
            ))}
          </div>
        </details>

        <div>
          <label className="label" htmlFor="dish-name">Dish name</label>
          <input id="dish-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nattu Kozhi Kuzhambu" autoCapitalize="words" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="dish-price">Price</label>
            <RupeeInput id="dish-price" value={price} onChange={setPrice} placeholder="180" />
          </div>
          <div>
            <label className="label" htmlFor="dish-cat">Category</label>
            <select id="dish-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {knownCats.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new">+ New category…</option>
            </select>
          </div>
        </div>
        {category === '__new' && (
          <input className="input" placeholder="New category name" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} autoCapitalize="words" />
        )}

        <label className="flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border border-cream-300 bg-white px-3.5">
          <span className="text-[15px] font-semibold">Available to order</span>
          <input type="checkbox" className="h-5 w-5 accent-leaf-600" checked={isAvailable} onChange={(e) => setAvailable(e.target.checked)} />
        </label>
      </form>
    </Modal>
  );
}
