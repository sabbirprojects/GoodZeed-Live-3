'use client';
import { Search } from 'lucide-react';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import { get } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useBilingual } from '@/hooks/useBilingual';
import type { ProductCardData } from '@/lib/types';

/** Debounced (300ms) live search — fires after 2 characters, max 8 results. */
export function SearchAutocomplete({ className }: { className?: string }) {
  const { t, localize } = useBilingual();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); setOpen(false); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const d = await get<{ items: ProductCardData[] }>('/search', { q: q.trim() });
        setItems(d.items);
        setOpen(true);
      } catch { setItems([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div ref={boxRef} className={className ?? 'relative w-full max-w-xl'}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setOpen(false); } }}
          placeholder={t('common.search')}
          className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {open && (
        <div className="absolute inset-x-0 top-11 z-40 overflow-hidden rounded-lg border bg-card shadow-lg animate-slide-up">
          {items.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">0 {t('common.searchResults')}</p>
          ) : (
            items.map((p) => (
              <a key={p.id} href={`/products/${p.slug}`} onClick={() => setOpen(false)}
                className="flex items-center gap-3 border-b p-2.5 last:border-0 hover:bg-muted">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-sand-100">
                  {p.image ? <img src={p.image} alt="" fill sizes="40px" className="object-cover" /> : <span className="flex h-full items-center justify-center">🌿</span>}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{localize(p, 'name')}</span>
                <span className="text-sm font-semibold text-brand-700">{formatMoney(p.price)}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}