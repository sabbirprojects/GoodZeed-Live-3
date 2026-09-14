import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import {
  buildProductSearchIndex,
  getSearchSuggestions,
  normalizeSearchText,
  useDebouncedValue
} from '../../utils/productSearch';
import { getProductThumbnail } from '../../utils/mediaUtils';
import {
  ShoppingBag,
  Search,
  Truck,
  ShieldCheck,
  Phone,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Store,
  Home,
  MessageCircle
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { formatCurrency } from '../../utils/formatters';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const {
    settings,
    categories,
    products,
    cartItemCount,
    cartSubtotal,
    setIsCartOpen,
    currentView,
    setCurrentView,
    setSelectedCategorySlug,
    selectedCategorySlug,
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery
  } = useStore();

  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Smart scroll: hide on scroll down, reveal on scroll up
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  const handleScroll = useCallback(() => {
    if (scrollTicking.current) return;
    scrollTicking.current = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      // Only trigger after scrolling past the announcement bar (~40px)
      if (currentY > 40) {
        if (delta > 4) {
          // Scrolling DOWN — hide header
          setIsHeaderVisible(false);
        } else if (delta < -4) {
          // Scrolling UP — reveal header
          setIsHeaderVisible(true);
        }
      } else {
        // At top of page — always show
        setIsHeaderVisible(true);
      }

      setIsScrolled(currentY > 10);
      lastScrollY.current = currentY;
      scrollTicking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Sync search input with global search state
  useEffect(() => {
    setSearchQuery(globalSearchQuery || '');
  }, [globalSearchQuery]);

  // ── Live typeahead search ──────────────────────────────────────────────
  // Prebuilt index (memoized) keeps each keystroke to a single fast O(n)
  // scan; the debounced value limits re-renders while typing quickly.
  const searchIndex = useMemo(
    () => buildProductSearchIndex(products, categories),
    [products, categories]
  );
  const debouncedQuery = useDebouncedValue(searchQuery, 150);
  const suggestions: Product[] = useMemo(() => {
    if (normalizeSearchText(debouncedQuery).length < 2) return [];
    return getSearchSuggestions(searchIndex, debouncedQuery, 6).filter(
      p => p.isEnabled !== false && (p.isPublished === undefined || p.isPublished === true)
    );
  }, [searchIndex, debouncedQuery]);
  const showSuggestions =
    isSearchFocused &&
    normalizeSearchText(searchQuery).length >= 2 &&
    normalizeSearchText(debouncedQuery).length >= 2;

  const categoryNameOf = useCallback(
    (product: Product) => categories.find(c => c.id === product.categoryId)?.name || '',
    [categories]
  );

  const suggestionPriceOf = useCallback((product: Product) => {
    const prices = (product.variants || [])
      .map(v => v.salePrice || v.price || 0)
      .filter(n => n > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle ESC key and click-outside for desktop category dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsCategoryMenuOpen(false);
        setIsSearchFocused(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(e.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
      if (
        (desktopSearchRef.current &&
          !desktopSearchRef.current.contains(e.target as Node)) &&
        (mobileSearchRef.current &&
          !mobileSearchRef.current.contains(e.target as Node))
      ) {
        setIsSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    // Re-open suggestions on every keystroke: after a submit the input
    // keeps DOM focus, so onFocus won't refire for the next query.
    setIsSearchFocused(true);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setGlobalSearchQuery('');
    setIsSearchFocused(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalSearchQuery(searchQuery.trim());
    setSelectedCategorySlug(null);
    setCurrentView('shop');
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
    // Dismiss the mobile keyboard and release focus so the next
    // focus/typing cycle starts clean.
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuggestionSelect = (product: Product) => {
    setSearchQuery(product.name);
    setGlobalSearchQuery(product.name);
    setSelectedCategorySlug(null);
    setCurrentView('shop');
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSuggestions = (list: Product[]) => {
    if (!showSuggestions) return null;
    return (
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50"
      >
        {list.length === 0 ? (
          <div className="px-4 py-3 text-xs text-neutral-500">
            No products found — press Enter to search anyway.
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {list.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSuggestionSelect(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#FAF7F2] transition-colors"
                >
                  <img
                    src={getProductThumbnail(p)}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#FAF7F2]"
                    loading="lazy"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-[#2A2A28] truncate">
                      {p.name}
                    </span>
                    <span className="block text-[10px] text-neutral-400 truncate">
                      {categoryNameOf(p)}
                    </span>
                  </span>
                  {suggestionPriceOf(p) > 0 && (
                    <span className="text-xs font-bold text-[#2F5233] shrink-0">
                      {formatCurrency(suggestionPriceOf(p))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    );
  };

  const navigateToCategory = (slug: string) => {
    setSelectedCategorySlug(slug);
    setCurrentView('category');
    setIsCategoryMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-[100] will-change-transform',
        'transition-[transform,background-color,box-shadow,border-color] duration-300 ease-in-out',
        // Slide up/down based on scroll direction
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full',
        // Glassmorphism when scrolled, solid when at top
        isScrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-[#2F5233]/15 shadow-sm'
          : 'bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#2F5233]/10 shadow-xs',
      ].join(' ')}
    >
      {/* Top Announcement Bar - Optimized for mobile & desktop */}
      <div className="bg-[#2F5233] text-[#FAF7F2] text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="inline-flex items-center gap-1 bg-[#D9A441] text-[#2A2A28] px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0">
              <Sparkles className="w-2.5 h-2.5" /> 100% PURE
            </span>
            <span className="truncate text-white/95 font-medium">
              Sundarban Raw Honey • Cold-Pressed Mustard Oil • Chia Seeds
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-white/90">
            <span className="hidden md:flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#D9A441]" /> Dhaka & 64 Districts COD
            </span>
            <a
              href={`tel:${settings.storeContactPhone}`}
              className="flex items-center gap-1 font-bold text-[#D9A441] hover:underline"
              title="Call Helpline"
            >
              <Phone className="w-3 h-3" />
              <span className="text-[11px]">{settings.storeContactPhone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => {
                setCurrentView('home');
                setSelectedCategorySlug(null);
              }}
              className="flex items-center text-left group transition-transform hover:opacity-95"
            >
              <BrandLogo size="md" theme="light-bg" showSubtitle={true} />
            </button>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4" ref={desktopSearchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                id="header-search-input"
                type="text"
                placeholder="Search raw honey, chia seeds, mustard oil..."
                value={searchQuery}
                onChange={e => handleSearchInputChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setIsSearchFocused(false);
                }}
                autoComplete="off"
                className="w-full bg-white border border-[#2F5233]/20 rounded-full py-2 pl-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B45] focus:border-transparent transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  aria-label="Clear search"
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-[#2F5233] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                id="header-search-submit-btn"
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#2F5233] text-white rounded-full hover:bg-[#3D6B45] transition-colors"
                aria-label="Submit search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>{renderSuggestions(suggestions)}</AnimatePresence>
            </form>
          </div>

          {/* Nav Links & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#2A2A28]">
              <button
                id="nav-home-btn"
                onClick={() => {
                  setCurrentView('home');
                  setSelectedCategorySlug(null);
                }}
                className={`transition-colors hover:text-[#2F5233] ${currentView === 'home' ? 'text-[#2F5233] font-semibold' : ''
                  }`}
              >
                Home
              </button>

              {/* Desktop Category Dropdown with Outside Click Ref */}
              <div className="relative" ref={categoryMenuRef}>
                <button
                  id="nav-categories-dropdown-btn"
                  onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                  className="flex items-center gap-1 hover:text-[#2F5233] transition-colors"
                >
                  Categories <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                {isCategoryMenuOpen && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50"
                  >
                    {categories
                      .filter(c => c.isEnabled)
                      .map(cat => (
                        <button
                          key={cat.id}
                          id={`nav-cat-${cat.slug}`}
                          onClick={() => navigateToCategory(cat.slug)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF7F2] flex items-center justify-between transition-colors ${selectedCategorySlug === cat.slug
                              ? 'bg-[#FAF7F2] text-[#2F5233] font-bold'
                              : 'text-[#2A2A28]'
                            }`}
                        >
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    <div className="border-t border-neutral-100 my-1 pt-1">
                      <button
                        onClick={() => {
                          setCurrentView('shop');
                          setSelectedCategorySlug(null);
                          setIsCategoryMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-[#2F5233] hover:bg-[#FAF7F2]"
                      >
                        Browse All Catalog →
                      </button>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              <button
                id="nav-shop-btn"
                onClick={() => {
                  setSelectedCategorySlug(null);
                  setCurrentView('shop');
                }}
                className={`transition-colors hover:text-[#2F5233] ${currentView === 'shop' ? 'text-[#2F5233] font-semibold' : ''
                  }`}
              >
                All Products
              </button>

              <button
                id="nav-track-btn"
                onClick={() => setCurrentView('track-order')}
                className={`flex items-center gap-1.5 transition-colors hover:text-[#2F5233] ${currentView === 'track-order' ? 'text-[#2F5233] font-semibold' : ''
                  }`}
              >
                <Truck className="w-4 h-4 text-[#D9A441]" />
                Track Order
              </button>
            </nav>

            {/* Cart Button */}
            <motion.button
              id="header-cart-btn"
              onClick={() => setIsCartOpen(true)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
              className="relative flex items-center gap-1.5 bg-[#2F5233] text-white px-3 py-1.5 sm:py-2 rounded-xl hover:bg-[#3D6B45] transition-colors shadow-xs"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <motion.span
                  key={cartItemCount}
                  initial={shouldReduceMotion ? false : { scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="bg-[#D9A441] text-[#2A2A28] text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[18px] text-center"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </motion.button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-2 text-[#2F5233] hover:bg-[#2F5233]/10 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Sleek & compact */}
        <div className="mt-2.5 md:hidden" ref={mobileSearchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              id="mobile-search-input"
              type="text"
              placeholder="Search raw honey, chia seeds, mustard oil..."
              value={searchQuery}
              onChange={e => handleSearchInputChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={e => {
                if (e.key === 'Escape') setIsSearchFocused(false);
              }}
              autoComplete="off"
              className="w-full bg-white border border-[#2F5233]/20 rounded-full py-2 pl-3.5 pr-16 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D6B45] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleSearchClear}
                aria-label="Clear search"
                className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-[#2F5233] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-[#2F5233] text-white rounded-full hover:bg-[#3D6B45]"
              aria-label="Search"
            >
              <Search className="w-3 h-3" />
            </button>
            <AnimatePresence>{renderSuggestions(suggestions)}</AnimatePresence>
          </form>
        </div>
      </div>

      {/* MOBILE MENU DRAWER WITH FULL-SCREEN BACKDROP (Dismisses on tap anywhere outside) */}
      {createPortal(
        <AnimatePresence>
        {isMobileMenuOpen && (
        <motion.div
          id="mobile-menu-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex justify-end lg:hidden"
        >
          {/* Drawer Container (Clicking inside stops propagation so it doesn't dismiss) */}
          <motion.div
            id="mobile-menu-drawer"
            onClick={e => e.stopPropagation()}
            initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="w-full max-w-[320px] sm:max-w-[350px] bg-white h-full flex flex-col shadow-2xl border-l border-neutral-200 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" variant="icon" theme="light-bg" />
                <div>
                  <span className="font-serif-brand font-bold text-base text-[#2F5233] block">
                    GoodZeed Menu
                  </span>
                  <span className="text-[10px] text-neutral-500 block -mt-0.5">
                    100% Pure Staples &amp; Honey
                  </span>
                </div>
              </div>
              <button
                id="close-mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-neutral-400 hover:text-[#2F5233] hover:bg-[#2F5233]/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content - Scrollable, min-h-0 ensures flex shrink works on short viewports */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 text-sm">
              {/* Primary Navigation Cards */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block px-1">
                  Navigation
                </span>

                <button
                  onClick={() => {
                    setCurrentView('home');
                    setSelectedCategorySlug(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${currentView === 'home'
                      ? 'bg-[#2F5233] text-white font-bold'
                      : 'text-[#2A2A28] hover:bg-[#FAF7F2]'
                    }`}
                >
                  <Home className="w-4 h-4 text-[#D9A441]" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('shop');
                    setSelectedCategorySlug(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${currentView === 'shop' && !selectedCategorySlug
                      ? 'bg-[#2F5233] text-white font-bold'
                      : 'text-[#2A2A28] hover:bg-[#FAF7F2]'
                    }`}
                >
                  <Store className="w-4 h-4 text-[#D9A441]" />
                  <span>All Products & Staples</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('track-order');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${currentView === 'track-order'
                      ? 'bg-[#2F5233] text-white font-bold'
                      : 'text-[#2A2A28] hover:bg-[#FAF7F2]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-[#D9A441]" />
                    <span>Track Your Order</span>
                  </div>
                  <span className="text-[10px] bg-[#D9A441]/20 text-[#2F5233] font-bold px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </button>
              </div>

              {/* Categories Section with Tiles */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
                    Categories
                  </span>
                  <button
                    onClick={() => {
                      setCurrentView('shop');
                      setSelectedCategorySlug(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-[11px] text-[#2F5233] font-bold hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {categories
                    .filter(c => c.isEnabled)
                    .map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => navigateToCategory(cat.slug)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${selectedCategorySlug === cat.slug
                            ? 'bg-[#2F5233] text-white font-bold'
                            : 'text-[#2A2A28] bg-[#FAF7F2]/70 hover:bg-[#FAF7F2]'
                          }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Customer Support & COD Reassurance */}
              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block px-1">
                  Customer Care & Delivery
                </span>

                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-neutral-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#2F5233] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#D9A441] shrink-0" />
                    <span>Cash on Delivery (All 64 Districts)</span>
                  </div>

                  <a
                    href={`tel:${settings.storeContactPhone}`}
                    className="flex items-center gap-2 text-neutral-700 hover:text-[#2F5233] font-bold"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#2F5233]" />
                    <span>Helpline: {settings.storeContactPhone}</span>
                  </a>

                  {settings.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-emerald-700 font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Order Support</span>
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer with Cart Button — shrink-0 ensures it's always visible */}
            <div className="shrink-0 p-4 border-t border-neutral-200 bg-[#FAF7F2] space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCartOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-xs flex items-center justify-between shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Your Shopping Cart</span>
                </div>
                <span>{cartItemCount > 0 ? `${cartItemCount} items` : 'Empty'}</span>
              </button>
              <p className="text-[10px] text-center text-neutral-400">
                Tap anywhere outside or the X button to close
              </p>
            </div>
          </motion.div>
        </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
};
