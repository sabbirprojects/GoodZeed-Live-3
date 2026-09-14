import { useEffect, useState } from 'react';
import { Category, Product } from '../types';

/**
 * Lightweight, dependency-free product search.
 *
 * Design goals: fast while typing, accurate ranking, scalable to thousands
 * of products, mobile-friendly (tiny memory footprint, no external index lib).
 *
 * How it stays fast:
 * - `buildProductSearchIndex()` precomputes lowercase blobs + token sets once
 *   (memoized per product/catalog change), so each keystroke is a single
 *   O(n) scan over compact strings — a few ms even for thousands of products.
 * - Results are capped via `limit` before sorting the full list.
 *
 * Matching (per query token, best-field-wins, summed across tokens):
 * - Exact substring in name / SKU / category / keywords (partial matches)
 * - Token prefix / substring matches
 * - Typo tolerance via bounded Levenshtein (dist 1 for 4-5 char tokens,
 *   dist 2 for 6+ char tokens; skipped for very short tokens to avoid noise)
 * - ALL query tokens must match (AND semantics) for precision.
 */

export interface ProductSearchEntry {
  product: Product;
  nameLower: string;
  categoryLower: string;
  skuBlob: string;
  keywordBlob: string;
  nameTokens: string[];
  skuTokens: string[];
  categoryTokens: string[];
  keywordTokens: string[];
  allTokens: string[];
}

export function normalizeSearchText(value: string): string {
  return (value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function tokenizeSearchText(value: string): string[] {
  const norm = normalizeSearchText(value);
  if (!norm) return [];
  // Split on whitespace and common separators; keep unicode letters/numbers
  // (Bengali product names) intact within tokens.
  return norm.split(/[\s,;|/()[\]{}"']+/).map(t => t.trim()).filter(t => t.length > 0);
}

/** Bounded Levenshtein: returns dist if <= max, otherwise max+1 (early exit). */
function levenshteinWithin(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > max) return max + 1;
  // Ensure `a` is the shorter string to keep the row small.
  let s = a;
  let t = b;
  let m = lenA;
  let n = lenB;
  if (m > n) {
    s = b;
    t = a;
    m = lenB;
    n = lenA;
  }
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;
  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    let rowMin = curr[0];
    const tj = t.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = s.charCodeAt(i - 1) === tj ? 0 : 1;
      const del = prev[i] + 1;
      const ins = curr[i - 1] + 1;
      const sub = prev[i - 1] + cost;
      let v = del < ins ? del : ins;
      if (sub < v) v = sub;
      curr[i] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[m];
}

function maxTypoDistance(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  return 2;
}

function splitSlug(slug: string): string[] {
  return (slug || '').toLowerCase().split(/[-_]+/).filter(Boolean);
}

export function buildProductSearchIndex(
  products: Product[],
  categories: Category[]
): ProductSearchEntry[] {
  const categoryNameById = new Map<string, string>();
  categories.forEach(c => categoryNameById.set(c.id, c.name || ''));

  return products.map(product => {
    const nameLower = (product.name || '').toLowerCase();
    const categoryLower = (categoryNameById.get(product.categoryId) || '').toLowerCase();

    const skuTokens: string[] = [];
    (product.variants || []).forEach(v => {
      if (v.sku) skuTokens.push(v.sku.toLowerCase());
      if (v.barcode) skuTokens.push(v.barcode.toLowerCase());
      if (v.label) tokenizeSearchText(v.label).forEach(t => skuTokens.push(t));
    });
    const skuBlob = skuTokens.join(' ');

    const keywordParts: string[] = [
      product.slug || '',
      product.shortDescription || '',
      product.ingredients || '',
      product.purityInfo || '',
      product.originInfo || '',
      Array.isArray((product as { tags?: string[] }).tags)
        ? (product as { tags?: string[] }).tags!.join(' ')
        : '',
      Array.isArray((product as { keywords?: string[] }).keywords)
        ? (product as { keywords?: string[] }).keywords!.join(' ')
        : ''
    ];
    const keywordBlob = keywordParts.join(' ').toLowerCase();
    const keywordTokens = tokenizeSearchText(keywordParts.join(' '));

    const nameTokens = [...tokenizeSearchText(product.name || ''), ...splitSlug(product.slug || '')];
    const categoryTokens = tokenizeSearchText(categoryNameById.get(product.categoryId) || '');

    return {
      product,
      nameLower,
      categoryLower,
      skuBlob,
      keywordBlob,
      nameTokens,
      skuTokens,
      categoryTokens,
      keywordTokens,
      allTokens: [...nameTokens, ...skuTokens, ...categoryTokens, ...keywordTokens]
    };
  });
}

function scoreTokenAgainstField(
  q: string,
  fieldTokens: string[],
  fieldBlob: string,
  exactWeight: number,
  prefixWeight: number,
  substringWeight: number
): number {
  if (!q) return 0;
  let best = 0;
  if (fieldBlob.includes(q)) best = Math.max(best, exactWeight);
  for (const tok of fieldTokens) {
    if (tok === q) {
      best = Math.max(best, exactWeight);
      break;
    }
    if (tok.startsWith(q) || q.startsWith(tok)) {
      best = Math.max(best, prefixWeight);
    } else if (tok.includes(q) || q.includes(tok)) {
      best = Math.max(best, substringWeight);
    }
  }
  return best;
}

function scoreTokenFuzzy(q: string, allTokens: string[]): number {
  const maxDist = maxTypoDistance(q);
  if (maxDist === 0) return 0;
  let best = 0;
  for (const tok of allTokens) {
    if (Math.abs(tok.length - q.length) > maxDist) continue;
    // Skip if already a direct substring hit — handled by field scoring.
    if (tok.includes(q) || q.includes(tok)) continue;
    const dist = levenshteinWithin(q, tok, maxDist);
    if (dist <= maxDist) {
      best = Math.max(best, 12 - dist * 4);
      if (best >= 12) break;
    }
  }
  return best;
}

function scoreEntry(entry: ProductSearchEntry, queryTokens: string[]): number {
  let total = 0;
  for (const q of queryTokens) {
    const nameScore = scoreTokenAgainstField(q, entry.nameTokens, entry.nameLower, 100, 60, 35);
    const skuScore = scoreTokenAgainstField(q, entry.skuTokens, entry.skuBlob, 90, 55, 30);
    const categoryScore = scoreTokenAgainstField(
      q,
      entry.categoryTokens,
      entry.categoryLower,
      45,
      30,
      18
    );
    const keywordScore = scoreTokenAgainstField(
      q,
      entry.keywordTokens,
      entry.keywordBlob,
      40,
      25,
      15
    );
    const fuzzyScore = scoreTokenFuzzy(q, entry.allTokens);
    const best = Math.max(nameScore, skuScore, categoryScore, keywordScore, fuzzyScore);
    if (best <= 0) return 0; // AND semantics: every token must match something
    total += best;
  }
  // Boost featured / best sellers slightly so relevant staples surface first.
  if (entry.product.isBestSeller) total += 3;
  if (entry.product.isFeatured) total += 2;
  return total;
}

export interface SearchOptions {
  limit?: number;
}

/** Search a prebuilt index (preferred in render paths — index is memoized). */
export function searchIndex(
  index: ProductSearchEntry[],
  query: string,
  options: SearchOptions = {}
): Product[] {
  const norm = normalizeSearchText(query);
  if (norm.length < 2) return [];
  const tokens = tokenizeSearchText(norm);
  if (tokens.length === 0) return [];
  const limit = options.limit ?? 50;

  const scored: Array<{ product: Product; score: number }> = [];
  for (const entry of index) {
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ product: entry.product, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.product);
}

/** One-shot search (builds the index inline — fine for small lists/tests). */
export function searchProducts(
  products: Product[],
  categories: Category[],
  query: string,
  options: SearchOptions = {}
): Product[] {
  return searchIndex(buildProductSearchIndex(products, categories), query, options);
}

/** Top-N suggestions for typeahead dropdowns. */
export function getSearchSuggestions(
  index: ProductSearchEntry[],
  query: string,
  limit = 6
): Product[] {
  return searchIndex(index, query, { limit });
}

/** Popular fallback searches shown when there are no results. */
export const POPULAR_SEARCHES = [
  'honey',
  'chia seeds',
  'mustard oil',
  'ghee',
  'dates',
  'almonds'
];

/** Debounce any fast-changing value (e.g. keystrokes) to keep UI work cheap. */
export function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
