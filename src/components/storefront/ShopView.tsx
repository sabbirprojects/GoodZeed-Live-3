import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import {
  POPULAR_SEARCHES,
  buildProductSearchIndex,
  normalizeSearchText,
  searchIndex
} from '../../utils/productSearch';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';

interface ShopViewProps {
  initialCategoryId?: string;
}

export const ShopView: React.FC<ShopViewProps> = ({ initialCategoryId }) => {
  const {
    products,
    categories,
    selectedCategorySlug,
    setSelectedCategorySlug,
    searchQuery,
    setSearchQuery
  } = useStore();

  const initialCat = selectedCategorySlug
    ? categories.find(c => c.slug === selectedCategorySlug)?.id
    : null;

  const [selectedCatId, setSelectedCatId] = useState<string>(
    initialCategoryId || initialCat || 'ALL'
  );
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'best-selling'>('featured');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Sync category when selectedCategorySlug changes from header or category grid
  React.useEffect(() => {
    if (selectedCategorySlug) {
      const match = categories.find(c => c.slug === selectedCategorySlug);
      if (match) setSelectedCatId(match.id);
    } else if (!initialCategoryId) {
      setSelectedCatId('ALL');
    }
  }, [selectedCategorySlug, categories, initialCategoryId]);

  // Sync search term with global searchQuery
  React.useEffect(() => {
    setSearchTerm(searchQuery || '');
  }, [searchQuery]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCatId(catId);
    if (catId === 'ALL') {
      setSelectedCategorySlug(null);
    } else {
      const cat = categories.find(c => c.id === catId);
      if (cat) setSelectedCategorySlug(cat.slug);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setSearchQuery(val);
  };

  // Filter products — fast fuzzy search across name, SKU, category,
  // and keywords/tags with partial + typo-tolerant matching.
  const searchEntries = useMemo(
    () => buildProductSearchIndex(products, categories),
    [products, categories]
  );
  const activeQuery = normalizeSearchText(searchTerm);
  const searchHits = useMemo(() => {
    if (activeQuery.length < 2) return null; // too short: show category listing
    const ids = new Set(searchIndex(searchEntries, searchTerm, { limit: 500 }).map(p => p.id));
    return ids;
  }, [searchEntries, searchTerm, activeQuery]);

  const filtered = products.filter(p => {
    const isProductActive = p.isEnabled !== false && (p.isPublished === undefined || p.isPublished === true);
    if (!isProductActive) return false;
    const matchesCat = selectedCatId === 'ALL' || p.categoryId === selectedCatId;
    if (!matchesCat) return false;
    if (searchHits === null) return true; // no query (or < 2 chars): category listing
    return searchHits.has(p.id);
  });

  // Sort products
  const sorted = [...filtered].sort((a, b) => {
    const aPrice = a.variants[0]?.salePrice || a.variants[0]?.price || 0;
    const bPrice = b.variants[0]?.salePrice || b.variants[0]?.price || 0;

    if (sortBy === 'price-asc') return aPrice - bPrice;
    if (sortBy === 'price-desc') return bPrice - aPrice;
    if (sortBy === 'best-selling') return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Title */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
            100% Pure & Unadulterated
          </span>
          <h1 className="font-serif-brand font-extrabold text-3xl sm:text-4xl text-[#2F5233]">
            Natural Everyday Staples
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Raw Sundarban honey, mustard & black seed cold-pressed oils, organic chia seeds, and artisan ghee.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="shop-search-input"
                type="text"
                placeholder="Search raw honey, ghee, cold-pressed oil..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') handleSearchChange('');
                }}
                autoComplete="off"
                className="w-full text-xs sm:text-sm pl-9 pr-9 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233] bg-[#FAF7F2]/30"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-[#2F5233] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <ArrowUpDown className="w-4 h-4 text-neutral-400 shrink-0" />
              <select
                id="shop-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#2F5233]"
              >
                <option value="featured">Featured First</option>
                <option value="best-selling">Best Sellers</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              id="cat-chip-all"
              onClick={() => handleCategorySelect('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap ${
                selectedCatId === 'ALL'
                  ? 'bg-[#2F5233] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              All Staples ({products.filter(p => p.isEnabled !== false).length})
            </button>
            {categories
              .filter(c => c.isEnabled !== false)
              .map(cat => {
                const count = products.filter(p => p.categoryId === cat.id && p.isEnabled !== false).length;
                return (
                  <button
                    key={cat.id}
                    id={`cat-chip-${cat.slug}`}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap ${
                      selectedCatId === cat.id
                        ? 'bg-[#2F5233] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
          </div>
        </div>

        {/* Product Grid */}
        {sorted.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border space-y-4">
            <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
              No products found
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchTerm.trim()
                ? `We couldn't find anything for "${searchTerm.trim()}". Check the spelling or try one of these popular searches.`
                : 'No items in this category yet. Try a different category or search.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {POPULAR_SEARCHES.map(term => (
                <button
                  key={term}
                  onClick={() => {
                    handleSearchChange(term);
                    handleCategorySelect('ALL');
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-neutral-200 text-xs font-bold text-[#2F5233] hover:bg-[#2F5233] hover:text-white transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                handleSearchChange('');
                handleCategorySelect('ALL');
              }}
              className="px-4 py-2 bg-[#2F5233] text-white text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {searchTerm.trim() && (
              <p className="text-xs text-neutral-500 text-center">
                {sorted.length} result{sorted.length === 1 ? '' : 's'} for{' '}
                <span className="font-bold text-[#2F5233]">“{searchTerm.trim()}”</span>
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5 items-stretch">
              <AnimatePresence mode="popLayout">
                {sorted.map(prod => (
                  <motion.div
                    key={prod.id}
                    layout
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <ProductCard
                      product={prod}
                      onOpenDetail={p => setModalProduct(p)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {modalProduct && (
          <ProductDetailModal
            key={modalProduct.id}
            product={modalProduct}
            onClose={() => setModalProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
