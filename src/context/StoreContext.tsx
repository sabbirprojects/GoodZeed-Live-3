import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Category,
  CartItem,
  Order,
  Customer,
  DeliveryZone,
  InventoryAdjustment,
  HomepageSection,
  LandingPage,
  LandingPageBlock,
  Review,
  StoreSettings,
  AdminUser,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  PaymentMethod,
  SupportTicket,
  SupportStatus
} from '../types';
import {
  STORE_DATA,
  INITIAL_LAST_UPDATED,
  INITIAL_SETTINGS,
  INITIAL_ADMIN,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_LANDING_PAGES,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_INVOICE_SEQUENCE
} from '../data/seedData';
import { getAssetUrl } from '../utils/assetHelper';
import {
  normalizePhoneNumber,
  generateOrderNumber,
  generateInvoiceNumber
} from '../utils/formatters';
import { sanitizeHtml } from '../utils/sanitizer';
import { isSupabaseConfigured } from '../lib/supabase/client';
import {
  loginAdmin as authLoginAdmin,
  logoutAdmin as authLogoutAdmin,
  getAdminSession,
  saveAdminSession,
  ensureAdminSupabaseAuth,
  ADMIN_CREDENTIALS as AUTH_ADMIN_CREDENTIALS
} from '../services/authService';
import * as catalogService from '../services/catalogService';
import * as orderService from '../services/orderService';
import * as cmsService from '../services/cmsService';
import * as settingsService from '../services/settingsService';
import * as supportService from '../services/supportService';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Obscured admin portal base path (single source of truth for App + Footer). */
export const ADMIN_PORTAL_PATH = '/gz-panel-7392';

/** Admin operator credentials (client-side gate only — not production-grade auth). */
export const ADMIN_CREDENTIALS = {
  username: 'goodzeed-admin',
  password: 'cAK9-Sxo3LfyKLhoe'
};

export interface CheckoutPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryDistrict: string;
  deliveryZoneId: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  items: CartItem[];
  isBuyNow?: boolean;
}

interface StoreContextType {
  // Settings & Admin
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  adminUser: AdminUser | null;
  isAdminLoggedIn: boolean;
  loginAdmin: (email: string, pass: string) => Promise<boolean> | boolean;
  logoutAdmin: () => Promise<void> | void;

  // Catalog
  categories: Category[];
  products: Product[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  toggleCategoryEnabled: (id: string) => void;
  reorderCategories: (ordered: Category[]) => void;
  deleteCategory: (id: string) => { success: boolean; message?: string };
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, prod: Partial<Product>) => void;
  toggleProductEnabled: (id: string) => void;
  deleteProduct: (id: string) => { success: boolean; message?: string };

  // Inventory
  inventoryAdjustments: InventoryAdjustment[];
  adjustStock: (variantId: string, changeAmount: number, reason: string) => boolean;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variantId: string, quantity?: number) => boolean;
  updateCartQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartItemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Mobile Menu
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Buy Now (independent of Cart)
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;

  // Campaign quick-order prefill (name/phone/address typed on a landing
  // page Quick Order Form, carried into Checkout so it isn't empty)
  checkoutPrefill: { name: string; phone: string; address: string } | null;
  setCheckoutPrefill: (prefill: { name: string; phone: string; address: string } | null) => void;

  // Checkout & Orders
  orders: Order[];
  submitCheckout: (payload: CheckoutPayload) => { success: boolean; order?: Order; error?: string };
  transitionOrderStatus: (orderId: string, newStatus: OrderStatus) => boolean;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => { success: boolean; error?: string };
  verifyPayment: (orderId: string, decision: 'PAID' | 'FAILED' | boolean, notes?: string) => boolean;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => boolean;
  updateDeliveryStatus: (orderId: string, status: DeliveryStatus, tracking?: string) => boolean;
  updateAdminNotes: (orderId: string, notes: string) => void;
  addOrderInternalNote: (orderId: string, note: string) => void;
  getOrGenerateInvoice: (orderId: string) => Order | null;
  incrementInvoiceReprint: (orderId: string) => void;
  trackOrder: (phone: string, orderNumber: string) => Order | null;

  // Customers
  customers: Customer[];
  updateCustomerAdminNote: (customerId: string, note: string) => void;

  // Delivery Zones
  deliveryZones: DeliveryZone[];
  addZone: (zone: Omit<DeliveryZone, 'id'>) => void;
  updateZone: (id: string, partial: Partial<DeliveryZone>) => void;
  toggleZoneEnabled: (id: string) => void;

  // Homepage CMS
  homepageSections: HomepageSection[];
  addHomepageSection: (section: Omit<HomepageSection, 'id'>) => void;
  updateHomepageSection: (id: string, partial: Partial<HomepageSection>) => Promise<boolean>;
  toggleHomepageSection: (id: string) => void;
  deleteHomepageSection: (id: string) => void;
  reorderHomepageSections: (reordered: HomepageSection[]) => void;

  // Landing Pages
  landingPages: LandingPage[];
  addLandingPage: (lp: Omit<LandingPage, 'id' | 'createdAt'>) => void;
  updateLandingPage: (id: string, partial: Partial<LandingPage>) => void;
  togglePublishLandingPage: (id: string) => void;
  deleteLandingPage: (id: string) => void;
  addLandingPageBlock: (landingPageId: string, block: Omit<LandingPageBlock, 'id' | 'landingPageId'>) => void;
  updateLandingPageBlock: (landingPageId: string, blockId: string, partial: Partial<LandingPageBlock>) => void;
  deleteLandingPageBlock: (landingPageId: string, blockId: string) => void;
  reorderLandingPageBlocks: (landingPageId: string, blocks: LandingPageBlock[]) => void;

  // Reviews
  reviews: Review[];
  submitReview: (productId: string, name: string, phone: string, rating: number, text: string) => boolean;
  moderateReview: (reviewId: string, decision: 'APPROVED' | 'REJECTED') => void;

  // Support Tickets
  supportTickets: SupportTicket[];
  submitSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => SupportTicket;
  updateSupportTicketStatus: (id: string, status: SupportStatus) => void;
  updateSupportTicketNotes: (id: string, notes: string) => void;

  // Views & Routing State
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedCategorySlug: string | null;
  setSelectedCategorySlug: (slug: string | null) => void;
  selectedProductSlug: string | null;
  setSelectedProductSlug: (slug: string | null) => void;
  selectedLandingSlug: string | null;
  setSelectedLandingSlug: (slug: string | null) => void;
  activeConfirmedOrder: Order | null;
  setActiveConfirmedOrder: (order: Order | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Notification Toast
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'goodzeed_store_';

function getInitialStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn(`Error reading localStorage for key ${key}:`, err);
  }
  return fallback;
}

// ── Admin session helpers (sessionStorage = tab-local, never persisted) ───────

function normalizeOrderRecord(ord: Order): Order {
  return {
    ...ord,
    internalNotes: ord.internalNotes || (ord.internalAdminNotes ? [{
      id: `note-init-${ord.id}`,
      note: ord.internalAdminNotes,
      createdBy: 'Admin / System',
      createdAt: ord.createdAt
    }] : []),
    internalAdminNotes: ord.internalAdminNotes || '',
    payment: ord.payment || ({ id: `pay-${ord.id}`, orderId: ord.id, method: 'COD', status: 'PENDING' } as Order['payment']),
    delivery: ord.delivery || ({ id: `del-${ord.id}`, orderId: ord.id, deliveryZoneId: '', zoneNameSnapshot: ord.deliveryDistrict || '', chargeSnapshot: ord.deliveryCharge || 0, method: 'COURIER', status: 'NOT_DISPATCHED' } as Order['delivery']),
    items: Array.isArray(ord.items) ? ord.items : [],
  };
}

function mergeById<T extends { id: string }>(backend: T[], local: T[]): T[] {
  const byId = new Map<string, T>();
  backend.forEach(item => { if (item && item.id) byId.set(item.id, item); });
  local.forEach(item => { if (item && item.id && !byId.has(item.id)) byId.set(item.id, item); });
  return Array.from(byId.values());
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error saving to localStorage for key ${key}:`, err);
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast state defined first so persistence helper can report failures.
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Math.random().toString(), message, type });
  };

  const hideToast = () => setToast(null);

  // Robust backend persistence — MUST stay outside setState updaters
  // (updaters must be pure; StrictMode double-invokes them).
  // Returns true on success, false on failure so callers can warn.
  const saveToBackend = async (partialData: any): Promise<boolean> => {
    try {
      const payload = { ...partialData, lastUpdated: new Date().toISOString() };
      const json = JSON.stringify(payload);
      // Guard: localStorage quota is ~5MB; huge base64 payloads break both
      // localStorage and backend saves. Warn loudly instead of silently losing data.
      if (json.length > 4_500_000) {
        console.warn(
          `[StoreContext] Payload ${(json.length / 1024 / 1024).toFixed(2)}MB is too large — ` +
          `likely base64 data URLs. Upload files via Supabase Storage so only permanent storage URLs are stored.`
        );
      }
      const resp = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json
      });
      if (!resp.ok) {
        if (!isSupabaseConfigured() && resp.status !== 404) {
          const text = await resp.text().catch(() => '');
          console.error('[StoreContext] Backend save failed:', resp.status, text.slice(0, 500));
          showToast(`Save failed (server ${resp.status}). Changes kept locally only.`, 'error');
        }
        // When Supabase is configured and handling primary persistence, 404 on legacy /api/store is expected and non-fatal
        return isSupabaseConfigured() ? true : false;
      }
      return true;
    } catch (err) {
      console.warn('[StoreContext] Backend unreachable (static hosting mode). Changes stored in browser storage.');
      return true;
    }
  };

  // 1. Settings & Admin
  const [settings, setSettings] = useState<StoreSettings>(() =>
    getInitialStorage('settings', INITIAL_SETTINGS)
  );
  // Admin session is tab-local (sessionStorage) — never from localStorage or backend.
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getAdminSession());

  // 2. Catalog (merge new seed product media into existing stored products)
  const [categories, setCategories] = useState<Category[]>(() =>
    getInitialStorage('categories', INITIAL_CATEGORIES)
  );
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = getInitialStorage('products', INITIAL_PRODUCTS);
    return stored || [];
  });

  // 3. Inventory
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>(() =>
    getInitialStorage('adjustments', [])
  );

  // 4. Cart & Buy Now
  const [cart, setCart] = useState<CartItem[]>(() => getInitialStorage('cart', []));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);

  // Prefill carried from campaign Quick Order Form into Checkout
  const [checkoutPrefill, setCheckoutPrefill] = useState<{
    name: string;
    phone: string;
    address: string;
  } | null>(null);

  // 5. Orders & Customers
  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = getInitialStorage('orders', INITIAL_ORDERS);
    return (raw || []).map((ord: Order) => ({
      ...ord,
      internalNotes: ord.internalNotes || (ord.internalAdminNotes ? [{
        id: `note-init-${ord.id}`,
        note: ord.internalAdminNotes,
        createdBy: 'Admin / System',
        createdAt: ord.createdAt
      }] : [])
    }));
  });
  const [customers, setCustomers] = useState<Customer[]>(() =>
    getInitialStorage('customers', INITIAL_CUSTOMERS)
  );
  const [nextInvoiceSequence, setNextInvoiceSequence] = useState<number>(() =>
    getInitialStorage('inv_seq', INITIAL_INVOICE_SEQUENCE)
  );

  // 6. Delivery Zones
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(() =>
    getInitialStorage('zones', INITIAL_DELIVERY_ZONES)
  );

  // 7. Homepage Sections (merge new seed sections; migrate stale honey
  // promo banner to the Energy Nut Mix campaign so home shows the campaign)
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(() => {
    const stored = getInitialStorage('homepage_sections', INITIAL_HOMEPAGE_SECTIONS);
    try {
      const storedIds = new Set((stored || []).map((s: HomepageSection) => s.id));
      let merged: HomepageSection[] = [...(stored || [])];
      INITIAL_HOMEPAGE_SECTIONS.filter(s => !storedIds.has(s.id)).forEach(s => merged.push(s));
      merged = merged.map(s => {
        if (
          s.id === 'sec-promo-banner' &&
          (s.ctaLink || '').includes('pure-sundarban-honey')
        ) {
          const seed = INITIAL_HOMEPAGE_SECTIONS.find(x => x.id === 'sec-promo-banner');
          if (seed) return { ...s, heading: seed.heading, bodyText: seed.bodyText, ctaLabel: seed.ctaLabel, ctaLink: seed.ctaLink, mediaUrl: seed.mediaUrl };
        }
        return s;
      });
      return merged;
    } catch {
      return stored;
    }
  });

  // 8. Landing Pages (merge new seed campaigns into existing stored data)
  const [landingPages, setLandingPages] = useState<LandingPage[]>(() => {
    const stored = getInitialStorage('landing_pages', INITIAL_LANDING_PAGES);
    try {
      const storedSlugs = new Set((stored || []).map((p: LandingPage) => p.slug));
      const missing = INITIAL_LANDING_PAGES.filter(p => !storedSlugs.has(p.slug));
      if (missing.length > 0) return [...(stored || []), ...missing];
      return stored;
    } catch {
      return stored;
    }
  });

  // 9. Reviews
  const [reviews, setReviews] = useState<Review[]>(() =>
    getInitialStorage('reviews', INITIAL_REVIEWS)
  );

  // 10. Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() =>
    getInitialStorage('supportTickets', INITIAL_SUPPORT_TICKETS as SupportTicket[])
  );

  // Navigation View State
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [selectedLandingSlug, setSelectedLandingSlug] = useState<string | null>(null);
  const [activeConfirmedOrder, setActiveConfirmedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isInitialBackendSyncRef = React.useRef(false);

  // Hydrate from persistent backend store (data/store.json) on mount.
  // IMPORTANT: merge backend + localStorage by id instead of blind overwrite,
  // so orders placed locally are never wiped by a stale backend snapshot.
  useEffect(() => {
    let isMounted = true;
    async function loadBackendStore() {
      // 1. If Supabase is configured, attempt live hydration from Supabase services
      if (isSupabaseConfigured()) {
        try {
          const [
            sbSettings,
            sbCategories,
            sbProducts,
            sbZones,
            sbOrders,
            sbCustomers,
            sbSections,
            sbLandingPages,
            sbReviews,
            sbTickets
          ] = await Promise.all([
            settingsService.fetchStoreSettings(),
            catalogService.fetchCategories(),
            catalogService.fetchProducts(),
            settingsService.fetchDeliveryZones(),
            orderService.fetchOrders(),
            orderService.fetchCustomers(),
            cmsService.fetchHomepageSections(),
            cmsService.fetchLandingPages(),
            supportService.fetchReviews(),
            supportService.fetchSupportTickets()
          ]);

          if (isMounted) {
            if (sbSettings) setSettings(prev => ({ ...prev, ...sbSettings }));
            if (sbCategories && sbCategories.length > 0) {
              const mappedCats = sbCategories.map(c => ({ ...c, image: c.image ? getAssetUrl(c.image) : c.image }));
              setCategories(prev => mergeById(mappedCats, prev));
            }
            if (sbProducts && sbProducts.length > 0) {
              const mappedProds = sbProducts.map(p => {
                const mediaImages = Array.isArray(p.media)
                  ? p.media.filter(m => m && (!m.type || m.type === 'image') && m.url).map(m => getAssetUrl(m.url))
                  : [];
                const resolvedImages = Array.isArray(p.images) && p.images.length > 0
                  ? p.images.map(getAssetUrl)
                  : mediaImages;
                return {
                  ...p,
                  images: resolvedImages,
                  media: Array.isArray(p.media) ? p.media.map(m => ({ ...m, url: getAssetUrl(m.url) })) : undefined
                };
              });
              setProducts(prev => mergeById(mappedProds, prev));
            }
            if (sbZones && sbZones.length > 0) setDeliveryZones(prev => mergeById(sbZones, prev));
            if (sbOrders && sbOrders.length > 0) {
              const normOrders = sbOrders.map(normalizeOrderRecord);
              setOrders(prev => mergeById(normOrders, prev.map(normalizeOrderRecord)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
            if (sbCustomers && sbCustomers.length > 0) setCustomers(prev => mergeById(sbCustomers, prev));
            if (sbSections && sbSections.length > 0) {
              const mappedSecs = sbSections.map(s => ({
                ...s,
                mediaUrl: s.mediaUrl ? getAssetUrl(s.mediaUrl) : s.mediaUrl,
                heroMedia: Array.isArray(s.heroMedia) ? s.heroMedia.map(m => ({ ...m, url: getAssetUrl(m.url) })) : s.heroMedia
              }));
              setHomepageSections(prev => mergeById(mappedSecs, prev));
            }
            if (sbLandingPages && sbLandingPages.length > 0) {
              const mappedLps = sbLandingPages.map(lp => ({
                ...lp,
                socialShareImage: lp.socialShareImage ? getAssetUrl(lp.socialShareImage) : lp.socialShareImage
              }));
              setLandingPages(prev => mergeById(mappedLps, prev));
            }
            if (sbReviews && sbReviews.length > 0) setReviews(prev => mergeById(sbReviews, prev));
            if (sbTickets && sbTickets.length > 0) setSupportTickets(prev => mergeById(sbTickets, prev));
            isInitialBackendSyncRef.current = true;
            return;
          }
        } catch (sbErr) {
          console.warn('[StoreContext] Supabase hydration fallback:', sbErr);
        }
      }

      // 2. Fallback to /api/store and bundled STORE_DATA
      let data: any = null;
      try {
        const resp = await fetch('/api/store');
        if (resp.ok) {
          data = await resp.json();
        }
      } catch {
        // Expected when running on static hosts like Netlify or preview without node server
      }

      const effectiveData = (data && typeof data === 'object' && Object.keys(data).length > 0)
        ? data
        : STORE_DATA;

      try {
        if (effectiveData && isMounted) {
          if (effectiveData.settings) setSettings(prev => ({ ...prev, ...effectiveData.settings }));
          // NOTE: adminUser is intentionally NOT hydrated from backend — sessions are
          // tab-local (sessionStorage) to prevent cross-browser session bleed.
          
          if (Array.isArray(effectiveData.categories) && effectiveData.categories.length > 0) {
            const mappedCategories = (effectiveData.categories as Category[]).map((c: Category) => ({
              ...c,
              image: c.image ? getAssetUrl(c.image) : c.image
            }));
            setCategories(prev => mergeById(mappedCategories, prev));
          }

          if (Array.isArray(effectiveData.products) && effectiveData.products.length > 0) {
            setProducts((prev) => {
              const mappedProducts = (effectiveData.products as Product[]).map((p: Product) => {
                const mediaImages = Array.isArray(p.media)
                  ? p.media.filter(m => m && (!m.type || m.type === 'image') && m.url).map(m => getAssetUrl(m.url))
                  : [];
                const resolvedImages = Array.isArray(p.images) && p.images.length > 0
                  ? p.images.map(getAssetUrl)
                  : mediaImages;
                return {
                  ...p,
                  images: resolvedImages,
                  media: Array.isArray(p.media) ? p.media.map(m => ({ ...m, url: getAssetUrl(m.url) })) : undefined
                };
              });
              const backendById = new Map<string, Product>(mappedProducts.map((p: Product) => [p.id, p]));
              const localById = new Map<string, Product>(prev.map((p: Product) => [p.id, p]));

              // Source-of-truth merge: bundled/backend products win
              const merged = new Map<string, Product>();
              backendById.forEach((backendProd: Product, id: string) => {
                merged.set(id, backendProd);
              });
              // Keep offline/local products if any
              localById.forEach((localProd: Product, id: string) => {
                if (!merged.has(id)) merged.set(id, localProd);
              });

              return Array.from(merged.values());
            });
          }

          if (Array.isArray(effectiveData.inventoryAdjustments)) {
            setInventoryAdjustments(prev => mergeById(effectiveData.inventoryAdjustments, prev));
          }

          if (Array.isArray(effectiveData.orders)) {
            const backendOrders = (effectiveData.orders as Order[]).map(normalizeOrderRecord);
            setOrders(prev => {
              const merged = mergeById(backendOrders, prev.map(normalizeOrderRecord));
              return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            });
          }

          if (Array.isArray(effectiveData.customers)) {
            setCustomers(prev => mergeById(effectiveData.customers, prev));
          }

          if (typeof effectiveData.nextInvoiceSequence === 'number') {
            setNextInvoiceSequence(prev => Math.max(prev, effectiveData.nextInvoiceSequence));
          }

          if (Array.isArray(effectiveData.deliveryZones) && effectiveData.deliveryZones.length > 0) {
            setDeliveryZones(prev => mergeById(effectiveData.deliveryZones, prev));
          }

          if (Array.isArray(effectiveData.homepageSections) && effectiveData.homepageSections.length > 0) {
            setHomepageSections((prev) => {
              const mappedSections = (effectiveData.homepageSections as HomepageSection[]).map((s: HomepageSection) => ({
                ...s,
                mediaUrl: s.mediaUrl ? getAssetUrl(s.mediaUrl) : s.mediaUrl,
                heroMedia: Array.isArray(s.heroMedia) ? s.heroMedia.map(m => ({ ...m, url: getAssetUrl(m.url) })) : s.heroMedia
              }));
              const byId = new Map(mappedSections.map((s: HomepageSection) => [s.id, s]));
              INITIAL_HOMEPAGE_SECTIONS.forEach(seed => { if (!byId.has(seed.id)) byId.set(seed.id, seed); });
              const promo = byId.get('sec-promo-banner') as HomepageSection | undefined;
              if (promo && (promo.ctaLink || '').includes('pure-sundarban-honey')) {
                const seed = INITIAL_HOMEPAGE_SECTIONS.find(x => x.id === 'sec-promo-banner');
                if (seed) byId.set('sec-promo-banner', { ...promo, heading: seed.heading, bodyText: seed.bodyText, ctaLabel: seed.ctaLabel, ctaLink: seed.ctaLink, mediaUrl: seed.mediaUrl });
              }
              prev.forEach(s => { if (!byId.has(s.id)) byId.set(s.id, s); });
              return Array.from(byId.values());
            });
          }

          if (Array.isArray(effectiveData.landingPages) && effectiveData.landingPages.length > 0) {
            setLandingPages((prev) => {
              const mappedPages = (effectiveData.landingPages as LandingPage[]).map((lp: LandingPage) => ({
                ...lp,
                socialShareImage: lp.socialShareImage ? getAssetUrl(lp.socialShareImage) : lp.socialShareImage
              }));
              const slugs = new Set(mappedPages.map((p: LandingPage) => p.slug));
              const missingPrev = prev.filter(p => !slugs.has(p.slug));
              const missingSeed = INITIAL_LANDING_PAGES.filter(p => !slugs.has(p.slug) && !missingPrev.some(m => m.slug === p.slug));
              return [...mappedPages, ...missingPrev, ...missingSeed];
            });
          }

          if (Array.isArray(effectiveData.reviews)) {
            setReviews(prev => mergeById(effectiveData.reviews, prev));
          }

          if (Array.isArray(effectiveData.supportTickets)) {
            setSupportTickets(prev => mergeById(effectiveData.supportTickets, prev));
          }
        }
      } catch (err) {
        console.warn('[StoreContext] Hydration note:', err);
      } finally {
        if (isMounted) {
          isInitialBackendSyncRef.current = true;
        }
      }
    }
    loadBackendStore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes to localStorage
  useEffect(() => saveToStorage('settings', settings), [settings]);
  // adminUser is stored in sessionStorage by loginAdmin/logoutAdmin — NOT in localStorage.
  useEffect(() => saveToStorage('categories', categories), [categories]);
  useEffect(() => saveToStorage('products', products), [products]);
  useEffect(() => saveToStorage('adjustments', inventoryAdjustments), [inventoryAdjustments]);
  useEffect(() => saveToStorage('cart', cart), [cart]);
  useEffect(() => saveToStorage('orders', orders), [orders]);
  useEffect(() => saveToStorage('customers', customers), [customers]);
  useEffect(() => saveToStorage('inv_seq', nextInvoiceSequence), [nextInvoiceSequence]);
  useEffect(() => saveToStorage('zones', deliveryZones), [deliveryZones]);
  useEffect(() => saveToStorage('homepage_sections', homepageSections), [homepageSections]);
  useEffect(() => saveToStorage('landing_pages', landingPages), [landingPages]);
  useEffect(() => saveToStorage('reviews', reviews), [reviews]);
  useEffect(() => saveToStorage('supportTickets', supportTickets), [supportTickets]);


  // ── Storefront tab title + SEO meta sync ────────────────────────────────
  // Single source of truth: settings.defaultSeoTitle / defaultSeoDescription.
  // Landing/campaign pages manage their own seoTitle (see LandingPageView),
  // so skip while the landing view is active to avoid fighting it.
  useEffect(() => {
    if (currentView === 'landing') return;
    const brand = (settings.storeName || 'GoodZeed').trim() || 'GoodZeed';
    const base = (settings.defaultSeoTitle || brand).trim() || 'GoodZeed';
    const titles: Record<string, string> = {
      home: base,
      shop: `Shop All Products | ${brand}`,
      category: `Shop | ${brand}`,
      checkout: `Checkout | ${brand}`,
      confirmation: `Order Confirmed | ${brand}`,
      'track-order': `Track Your Order | ${brand}`,
    };
    document.title = titles[currentView] || base;
    const desc = (settings.defaultSeoDescription || '').trim();
    if (desc) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) meta.content = desc;
      const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = desc;
    }
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = document.title;
  }, [settings.defaultSeoTitle, settings.defaultSeoDescription, settings.storeName, currentView]);

  // Dynamically update favicon across all pages when faviconPath changes.
  // Uses absolute root paths so nested storefront routes resolve correctly.
  // Cache-buster is ?v=5 (bumped after regenerating a real multi-size ICO +
  // brand-consistent PNGs — the old ?v=2 favicon.ico was raw PNG bytes).
  // Must stay in sync with index.html and App.tsx admin/storefront icons
  // (?v=5) so Safari doesn't serve stale cached icons.
  // NOTE: each link keeps its own correct asset + MIME type: .ico links stay
  // image/x-icon pointing at /favicon.ico, PNG links stay image/png pointing
  // at their size-specific file. Never cross-assign (that MIME mismatch is
  // what broke the storefront tab icon).
  useEffect(() => {
    const FAVICON_VERSION = '?v=5';
    // Storefront browser tab icon. (Admin panel swaps to the 32x32 PNG at
    // runtime in App.tsx so the two panels are visually distinct.)
    const DEFAULT_TAB_ICON = `/favicon-16x16.png${FAVICON_VERSION}`;
    const DEFAULT_ICO = `/favicon.ico${FAVICON_VERSION}`;
    const PNG_BY_SIZE: Record<string, string> = {
      '32x32': `/favicon-32x32.png${FAVICON_VERSION}`,
      '16x16': `/favicon-16x16.png${FAVICON_VERSION}`,
      default: `/favicon.png${FAVICON_VERSION}`,
    };
    const APPLE_ICON = `/apple-touch-icon.png${FAVICON_VERSION}`;

    let iconPath = (settings.faviconPath || DEFAULT_TAB_ICON).trim();
    // Migrations to the canonical 16x16 storefront tab icon:
    // - old custom upload (/uploads/*GoodZeed_icon.png) is baked into defaults
    // - old ICO / 32x32 defaults converge to the 16x16 PNG tab icon.
    // This also heals browsers with a stale path cached in localStorage.
    const LEGACY_TAB_ICONS = [
      DEFAULT_ICO,
      '/favicon.ico',
      '/favicon.ico?v=3',
      `/favicon-32x32.png${FAVICON_VERSION}`,
      '/favicon-32x32.png',
      '/favicon-32x32.png?v=3',
    ];
    if (
      (iconPath.includes('/uploads/') && /goodzeed_icon/i.test(iconPath)) ||
      LEGACY_TAB_ICONS.includes(iconPath)
    ) {
      iconPath = DEFAULT_TAB_ICON;
      setSettings(prev =>
        prev.faviconPath === iconPath ? prev : { ...prev, faviconPath: iconPath }
      );
    }
    // Normalize to absolute root path (relative paths break on nested routes)
    if (!iconPath.startsWith('/') && !iconPath.startsWith('http')) {
      iconPath = `/${iconPath}`;
    }
    // Preserve cache-busting query param if not already present
    if (iconPath.startsWith('/') && !iconPath.includes('?v=')) {
      iconPath = `${iconPath}${FAVICON_VERSION}`;
    }
    const isDefault =
      iconPath.includes('/favicon.ico') ||
      iconPath.includes('/favicon-32x32') ||
      iconPath.includes('/favicon-16x16') ||
      iconPath.includes('/favicon.png');

    const iconLinks = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='icon'], link[rel='shortcut icon']"
    );
    iconLinks.forEach((link) => {
      const sizes = (link.getAttribute('sizes') || '').trim();
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      if (isDefault) {
        // Restore each link to its own correct default asset + type.
        // The 16x16 PNG is the storefront tab icon.
        if (rel.includes('shortcut')) {
          link.href = DEFAULT_TAB_ICON;
          link.type = 'image/png';
        } else if (sizes === '32x32') {
          link.href = PNG_BY_SIZE['32x32'];
          link.type = 'image/png';
        } else if (sizes === '16x16') {
          link.href = PNG_BY_SIZE['16x16'];
          link.type = 'image/png';
        } else if ((link.getAttribute('type') || '').includes('x-icon')) {
          link.href = DEFAULT_ICO;
          link.type = 'image/x-icon';
        } else {
          link.href = PNG_BY_SIZE.default;
          link.type = 'image/png';
        }
        return;
      }
      // Truly custom icon (admin-uploaded logo etc.): point every icon link
      // at it and keep the MIME type in sync so PNGs aren't served as x-icon.
      link.href = iconPath;
      if (/\.(png|webp)(\?|#|$)/i.test(iconPath)) link.type = 'image/png';
      else if (/\.(jpe?g)(\?|#|$)/i.test(iconPath)) link.type = 'image/jpeg';
      else if (/\.svg(\?|#|$)/i.test(iconPath)) link.type = 'image/svg+xml';
      else if (/\.ico(\?|#|$)/i.test(iconPath)) link.type = 'image/x-icon';
    });
    // Keep iOS home-screen icon in sync for default + brand uploads.
    const appleIcon = document.querySelector<HTMLLinkElement>(
      "link[rel='apple-touch-icon']"
    );
    if (appleIcon) {
      if (isDefault) {
        appleIcon.href = APPLE_ICON;
      } else if (/favicon|logo|goodzeed_icon/i.test(iconPath)) {
        appleIcon.href = /\.ico(\?|#|$)/i.test(iconPath) ? APPLE_ICON : iconPath;
      }
    }
  }, [settings.faviconPath]);

  // Synchronize admin Supabase Auth session whenever an admin session is present
  useEffect(() => {
    if (adminUser) {
      ensureAdminSupabaseAuth();
    }
  }, [adminUser]);

  // Admin Auth Methods
  const loginAdmin = async (email: string, pass: string): Promise<boolean> => {
    const res = await authLoginAdmin(email, pass);
    if (res.success && res.user) {
      setAdminUser(res.user);
      showToast(`Logged in as ${res.user.role || 'Admin'}`, 'success');
      return true;
    }
    showToast(res.error || 'Invalid email or password', 'error');
    return false;
  };

  const logoutAdmin = async () => {
    await authLogoutAdmin();
    setAdminUser(null);
    showToast('Logged out of Admin Portal', 'info');
    setCurrentView('home');
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveToBackend({ settings: updated });
    settingsService.saveStoreSettings(newSettings);
    showToast('Store settings updated', 'success');
  };

  // Catalog Methods
  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveToBackend({ categories: updated });
    catalogService.saveCategory(newCat);
    showToast('Category created', 'success');
  };

  const updateCategory = (id: string, partial: Partial<Category>) => {
    const updated = categories.map(c => (c.id === id ? { ...c, ...partial } : c));
    setCategories(updated);
    saveToBackend({ categories: updated });
    const target = updated.find(c => c.id === id);
    if (target) catalogService.saveCategory(target);
    showToast('Category updated', 'success');
  };

  const toggleCategoryEnabled = (id: string) => {
    const updated = categories.map(c => (c.id === id ? { ...c, isEnabled: !c.isEnabled } : c));
    setCategories(updated);
    saveToBackend({ categories: updated });
    const target = updated.find(c => c.id === id);
    if (target) catalogService.saveCategory(target);
  };

  const reorderCategories = (ordered: Category[]) => {
    setCategories(ordered);
    saveToBackend({ categories: ordered });
    ordered.forEach(c => catalogService.saveCategory(c));
  };

  const deleteCategory = (id: string): { success: boolean; message?: string } => {
    const hasProducts = products.some(p => p.categoryId === id);
    if (hasProducts) {
      showToast('Cannot delete category: products are assigned to it. Disable it instead.', 'error');
      return { success: false, message: 'Products exist in this category' };
    }
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveToBackend({ categories: updated });
    catalogService.deleteCategory(id);
    showToast('Category deleted', 'info');
    return { success: true };
  };

  const addProduct = (prod: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prod,
      id: `prod-${Date.now()}`
    };
    const updated = [newProd, ...products];
    setProducts(updated);
    saveToBackend({ products: updated });
    catalogService.saveProduct(newProd);
    showToast('Product added successfully', 'success');
  };

  const updateProduct = async (id: string, partial: Partial<Product>) => {
    const updated = products.map(p => (p.id === id ? { ...p, ...partial } : p));
    setProducts(updated);
    const target = updated.find(p => p.id === id);
    let sbSuccess = true;
    if (target) {
      sbSuccess = await catalogService.saveProduct(target);
    }
    const backendSuccess = await saveToBackend({ products: updated });
    if (sbSuccess || backendSuccess) {
      showToast('Product updated successfully', 'success');
    } else {
      showToast('Failed to save product to server. Changes kept locally.', 'error');
    }
  };

  const toggleProductEnabled = (id: string) => {
    const updated = products.map(p => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
    setProducts(updated);
    saveToBackend({ products: updated });
    const target = updated.find(p => p.id === id);
    if (target) catalogService.saveProduct(target);
  };

  const deleteProduct = (id: string): { success: boolean; message?: string } => {
    // Check if product was ever ordered
    const ordered = orders.some(o => o.items.some(it => it.productId === id));
    if (ordered) {
      showToast('Cannot delete: this product has historical orders. Disable it instead.', 'error');
      return { success: false, message: 'Historical orders exist for this product' };
    }
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveToBackend({ products: updated });
    catalogService.deleteProduct(id);
    showToast('Product deleted', 'info');
    return { success: true };
  };

  // Inventory Methods — computed synchronously from current state so the
  // result + toast are reliable (React setState updaters run async).
  const adjustStock = (variantId: string, changeAmount: number, reason: string): boolean => {
    const targetProduct = products.find(p => p.variants.some(v => v.id === variantId));
    if (!targetProduct) return false;
    const currentVariant = targetProduct.variants.find(v => v.id === variantId);
    if (!currentVariant) return false;
    const newStockVal = Math.max(0, currentVariant.stock + changeAmount);

    const updatedProducts = products.map(prod => {
      const idx = prod.variants.findIndex(v => v.id === variantId);
      if (idx === -1) return prod;
      const updatedVariants = [...prod.variants];
      updatedVariants[idx] = { ...updatedVariants[idx], stock: newStockVal };
      return { ...prod, variants: updatedVariants };
    });
    setProducts(updatedProducts);

    const adjustment: InventoryAdjustment = {
      id: `adj-${Date.now()}`,
      productVariantId: variantId,
      productId: targetProduct.id,
      productName: targetProduct.name,
      variantLabel: currentVariant.label,
      changeAmount,
      reason,
      adjustedByAdminId: adminUser?.id || 'admin-01',
      stockAfter: newStockVal,
      createdAt: new Date().toISOString()
    };
    const updatedAdjustments = [adjustment, ...inventoryAdjustments];
    setInventoryAdjustments(updatedAdjustments);
    saveToBackend({ products: updatedProducts, inventoryAdjustments: updatedAdjustments });
    catalogService.adjustStockRPC(variantId, changeAmount, reason);
    showToast(`Stock updated for ${currentVariant.label}: ${newStockVal} units`, 'success');
    return true;
  };

  // Cart Methods
  const addToCart = (product: Product, variantId: string, quantity: number = 1): boolean => {
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant || !variant.isEnabled) {
      showToast('This size is currently unavailable', 'error');
      return false;
    }

    if (variant.stock <= 0) {
      showToast('Selected variant is out of stock', 'error');
      return false;
    }

    const currentPrice = variant.salePrice != null && variant.salePrice > 0 ? variant.salePrice : variant.price;

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.variantId === variantId);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = Math.min(variant.stock, existing.quantity + quantity);
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          unitPrice: currentPrice,
          stock: variant.stock
        };
        return updated;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantLabel: variant.label,
          unitPrice: currentPrice,
          quantity: Math.min(variant.stock, quantity),
          image: product.images[0] || '',
          stock: variant.stock
        };
        return [...prev, newItem];
      }
    });

    showToast(`Added ${quantity} × ${variant.label} to your cart`, 'success');
    return true;
  };

  const updateCartQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.variantId === variantId) {
          return { ...item, quantity: Math.min(item.stock, quantity) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout & Order Creation (Atomic transaction logic)
  const submitCheckout = (payload: CheckoutPayload): { success: boolean; order?: Order; error?: string } => {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryDistrict,
      deliveryZoneId,
      deliveryAddress,
      deliveryNotes,
      paymentMethod,
      transactionId,
      items,
      isBuyNow
    } = payload;

    if (!items || items.length === 0) {
      return { success: false, error: 'Your order has no items.' };
    }

    // 1. Re-validate stock and latest pricing against live catalog
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || !product.isEnabled) {
        return { success: false, error: `Product "${item.productName}" is no longer available.` };
      }
      const variant = product.variants.find(v => v.id === item.variantId);
      if (!variant || !variant.isEnabled) {
        return { success: false, error: `Variant "${item.variantLabel}" is unavailable.` };
      }
      if (variant.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.productName} (${variant.label}). Available: ${variant.stock}`
        };
      }
    }

    // 2. Resolve delivery zone and calculate charge
    const zone = deliveryZones.find(z => z.id === deliveryZoneId) || deliveryZones[0];
    if (!zone) {
      return { success: false, error: 'No delivery zone available. Please contact support.' };
    }
    const deliveryCharge = zone.charge;

    // 3. Compute updated products synchronously (no async updater side-effects)
    const updatedProducts = products.map(prod => {
      const matchingItems = items.filter(it => it.productId === prod.id);
      if (matchingItems.length === 0) return prod;
      const updatedVariants = prod.variants.map(variant => {
        const matchingItem = matchingItems.find(it => it.variantId === variant.id);
        if (!matchingItem) return variant;
        return { ...variant, stock: Math.max(0, variant.stock - matchingItem.quantity) };
      });
      return { ...prod, variants: updatedVariants };
    });

    // 4. Normalize customer phone & deduplicate synchronously
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    const subtotalForCustomer = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    const totalForCustomer = subtotalForCustomer + deliveryCharge;
    const nowIso = new Date().toISOString();
    let customerId = '';
    let updatedCustomers: Customer[];
    const existing = customers.find(c => c.phoneNormalized === normalizedPhone);
    if (existing) {
      customerId = existing.id;
      updatedCustomers = customers.map(c => {
        if (c.id !== existing.id) return c;
        return {
          ...c,
          name: customerName,
          email: customerEmail || c.email,
          defaultAddress: deliveryAddress,
          totalOrders: c.totalOrders + 1,
          totalSpend: c.totalSpend + totalForCustomer,
          lastOrderAt: nowIso
        };
      });
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: customerName,
        phoneNormalized: normalizedPhone,
        phoneRaw: customerPhone,
        email: customerEmail,
        defaultAddress: deliveryAddress,
        totalOrders: 1,
        totalSpend: totalForCustomer,
        lastOrderAt: nowIso,
        status: 'ACTIVE',
        createdAt: nowIso
      };
      customerId = newCustomer.id;
      updatedCustomers = [newCustomer, ...customers];
    }

    // 5. Construct Order and snapshots (unique order number)
    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const existingNumbers = new Set(orders.map(o => o.orderNumber));
    let orderNumber = generateOrderNumber();
    let guard = 0;
    while (existingNumbers.has(orderNumber) && guard < 10) {
      orderNumber = generateOrderNumber();
      guard += 1;
    }
    const subtotal = subtotalForCustomer;
    const total = totalForCustomer;

    const initialPaymentStatus: PaymentStatus =
      paymentMethod === 'COD' ? 'PENDING' : 'AWAITING_VERIFICATION';

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId,
      customerNameSnapshot: customerName,
      customerPhoneSnapshot: customerPhone,
      deliveryAddressSnapshot: deliveryAddress,
      deliveryDistrict,
      deliveryNotes: deliveryNotes || '',
      internalAdminNotes: '',
      internalNotes: [],
      status: 'PENDING',
      subtotal,
      deliveryCharge,
      total,
      source: isBuyNow ? 'BUY_NOW' : 'CART',
      createdAt: nowIso,
      updatedAt: nowIso,
      payment: {
        id: `pay-${Date.now()}`,
        orderId,
        method: paymentMethod,
        status: initialPaymentStatus,
        transactionId: transactionId || ''
      },
      delivery: {
        id: `del-${Date.now()}`,
        orderId,
        deliveryZoneId: zone.id,
        zoneNameSnapshot: zone.name,
        chargeSnapshot: deliveryCharge,
        method: 'COURIER',
        status: 'NOT_DISPATCHED',
        estimatedDelivery: zone.estimatedDeliveryTime
      },
      items: items.map(it => ({
        id: `item-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
        orderId,
        productId: it.productId,
        productVariantId: it.variantId,
        productNameSnapshot: it.productName,
        variantLabelSnapshot: it.variantLabel,
        unitPriceSnapshot: it.unitPrice,
        quantity: it.quantity,
        lineSubtotal: it.unitPrice * it.quantity,
        productImageSnapshot: it.image
      }))
    };

    const updatedOrders = [newOrder, ...orders];
    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setOrders(updatedOrders);
    // Persist to backend file so admin (any browser/device) sees the order.
    // localStorage persistence happens via the useEffect hooks below.
    saveToBackend({
      products: updatedProducts,
      customers: updatedCustomers,
      orders: updatedOrders,
      nextInvoiceSequence
    });

    // If it was standard cart checkout, clear cart
    if (!isBuyNow) {
      clearCart();
    } else {
      setBuyNowItem(null);
    }

    // If Supabase is configured, submit atomically to database via RPC
    if (isSupabaseConfigured()) {
      orderService.submitCheckoutRPC(payload).catch(err => {
        console.warn('[StoreContext] Supabase submit_checkout note:', err);
      });
    }

    setActiveConfirmedOrder(newOrder);
    return { success: true, order: newOrder };
  };

  // Order State Machine Transitions — synchronous so return value is correct
  // and every mutation is persisted to /api/store (admin + storefront share it).
  const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: ['RETURN_REQUESTED'],
    CANCELLED: [],
    RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
    RETURN_APPROVED: [],
    RETURN_REJECTED: []
  };

  const persistOrders = (updatedOrders: Order[], nextSeq?: number) => {
    saveToBackend({
      orders: updatedOrders,
      nextInvoiceSequence: nextSeq !== undefined ? nextSeq : nextInvoiceSequence
    });
  };

  const transitionOrderStatus = (orderId: string, newStatus: OrderStatus): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      showToast('Order not found', 'error');
      return false;
    }
    const allowed = VALID_ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      showToast(`Invalid status transition from ${order.status} to ${newStatus}`, 'error');
      return false;
    }

    let seq = nextInvoiceSequence;
    let invoice = order.invoice;
    if ((newStatus === 'CONFIRMED' || newStatus === 'PROCESSING' || newStatus === 'DELIVERED') && !invoice) {
      invoice = {
        id: `inv-${Date.now()}`,
        orderId: order.id,
        invoiceNumber: generateInvoiceNumber(seq),
        issuedAt: new Date().toISOString(),
        reprintedCount: 1
      };
      seq += 1;
      setNextInvoiceSequence(seq);
    }

    const updatedDelivery = {
      ...order.delivery,
      status: (newStatus === 'DELIVERED'
        ? 'DELIVERED'
        : newStatus === 'OUT_FOR_DELIVERY'
        ? 'OUT_FOR_DELIVERY'
        : newStatus === 'SHIPPED'
        ? 'DISPATCHED'
        : order.delivery.status) as DeliveryStatus
    };

    const updatedOrders = orders.map(o =>
      o.id !== orderId
        ? o
        : { ...o, status: newStatus, invoice, delivery: updatedDelivery, updatedAt: new Date().toISOString() }
    );
    setOrders(updatedOrders);
    persistOrders(updatedOrders, seq);
    orderService.transitionOrderStatusRPC(orderId, newStatus);
    showToast(`Order status moved to ${newStatus}`, 'success');
    return true;
  };

  // Payment Verification — accepts boolean (true=PAID, false=FAILED) or literal string
  const verifyPayment = (orderId: string, decision: 'PAID' | 'FAILED' | boolean, notes?: string): boolean => {
    const resolvedDecision: 'PAID' | 'FAILED' =
      decision === true ? 'PAID' : decision === false ? 'FAILED' : decision;
    const exists = orders.some(o => o.id === orderId);
    if (!exists) return false;
    const updatedOrders = orders.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        payment: {
          ...ord.payment,
          status: resolvedDecision,
          verifiedByAdminId: adminUser?.id || 'admin-01',
          verifiedAt: new Date().toISOString(),
          notes: notes || ord.payment.notes
        },
        updatedAt: new Date().toISOString()
      };
    });
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    orderService.updatePaymentRecord(orderId, resolvedDecision, resolvedDecision, notes);
    showToast(`Payment marked as ${resolvedDecision}`, 'success');
    return true;
  };

  const addOrderInternalNote = (orderId: string, note: string) => {
    const updatedOrders = orders.map(ord => {
      if (ord.id !== orderId) return ord;
      const newNote = {
        id: `note-${Date.now()}`,
        note,
        createdBy: adminUser?.name || 'Admin',
        createdAt: new Date().toISOString()
      };
      return {
        ...ord,
        internalNotes: [...(ord.internalNotes || []), newNote],
        updatedAt: new Date().toISOString()
      };
    });
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    orderService.addInternalNote(orderId, note, adminUser?.name || 'Admin');
    showToast('Note added', 'success');
  };

  // updateOrderStatus — wrapper around transitionOrderStatus returning { success, error } shape
  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus): { success: boolean; error?: string } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const allowed = VALID_ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${order.status} to ${nextStatus}. Allowed: ${allowed.join(', ') || 'none'}`
      };
    }

    const ok = transitionOrderStatus(orderId, nextStatus);
    return ok
      ? { success: true }
      : { success: false, error: `Failed to update order status to ${nextStatus}` };
  };

  const updatePaymentStatus = (orderId: string, status: PaymentStatus): boolean => {
    const exists = orders.some(o => o.id === orderId);
    if (!exists) return false;
    const updatedOrders = orders.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        payment: { ...ord.payment, status },
        updatedAt: new Date().toISOString()
      };
    });
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    orderService.updatePaymentRecord(orderId, status);
    showToast(`Payment status updated to ${status}`, 'success');
    return true;
  };

  const updateDeliveryStatus = (orderId: string, status: DeliveryStatus, tracking?: string): boolean => {
    const exists = orders.some(o => o.id === orderId);
    if (!exists) return false;
    const updatedOrders = orders.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        delivery: {
          ...ord.delivery,
          status,
          trackingNumber: tracking || ord.delivery.trackingNumber
        },
        updatedAt: new Date().toISOString()
      };
    });
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    orderService.updateDeliveryRecord(orderId, status, tracking);
    showToast(`Delivery status updated to ${status}`, 'success');
    return true;
  };

  const updateAdminNotes = (orderId: string, notes: string) => {
    const updatedOrders = orders.map(ord =>
      ord.id === orderId ? { ...ord, internalAdminNotes: notes, updatedAt: new Date().toISOString() } : ord
    );
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    showToast('Admin notes saved', 'success');
  };

  const getOrGenerateInvoice = (orderId: string): Order | null => {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return null;
    if (ord.invoice) return ord;
    let seq = nextInvoiceSequence;
    const newInvoice = {
      id: `inv-${Date.now()}`,
      orderId: ord.id,
      invoiceNumber: generateInvoiceNumber(seq),
      issuedAt: new Date().toISOString(),
      reprintedCount: 1
    };
    seq += 1;
    setNextInvoiceSequence(seq);
    const updated = { ...ord, invoice: newInvoice };
    const updatedOrders = orders.map(o => (o.id === orderId ? updated : o));
    setOrders(updatedOrders);
    persistOrders(updatedOrders, seq);
    return updated;
  };

  const incrementInvoiceReprint = (orderId: string) => {
    const updatedOrders = orders.map(ord => {
      if (ord.id !== orderId || !ord.invoice) return ord;
      return {
        ...ord,
        invoice: { ...ord.invoice, reprintedCount: ord.invoice.reprintedCount + 1 }
      };
    });
    setOrders(updatedOrders);
    persistOrders(updatedOrders);
    orderService.incrementInvoiceReprintRPC(orderId);
  };

  const updateCustomerAdminNote = (customerId: string, note: string) => {
    const updated = customers.map(c =>
      c.id === customerId ? { ...c, adminNote: note } : c
    );
    setCustomers(updated);
    saveToBackend({ customers: updated });
    orderService.updateCustomerNote(customerId, note);
    showToast('Customer note saved', 'success');
  };

  const trackOrder = (phone: string, orderNumber: string): Order | null => {
    const normPhone = normalizePhoneNumber(phone);
    const cleanOrderNum = orderNumber.trim().toUpperCase();

    if (!normPhone && !cleanOrderNum) return null;

    const match = orders.find(o => {
      const orderMatch = cleanOrderNum
        ? o.orderNumber.toUpperCase() === cleanOrderNum || o.orderNumber.toUpperCase().endsWith(cleanOrderNum)
        : true;
      const phoneMatch = normPhone
        ? normalizePhoneNumber(o.customerPhoneSnapshot).endsWith(normPhone.slice(-10)) ||
          normPhone.endsWith(normalizePhoneNumber(o.customerPhoneSnapshot).slice(-10))
        : true;
      return orderMatch && phoneMatch;
    });

    return match || null;
  };

  // Delivery Zones
  const addZone = (zone: Omit<DeliveryZone, 'id'>) => {
    const newZone = { ...zone, id: `zone-${Date.now()}` };
    const updated = [...deliveryZones, newZone];
    setDeliveryZones(updated);
    saveToBackend({ deliveryZones: updated });
    settingsService.saveDeliveryZone(newZone);
    showToast('Delivery zone added', 'success');
  };

  const updateZone = (id: string, partial: Partial<DeliveryZone>) => {
    const updated = deliveryZones.map(z => (z.id === id ? { ...z, ...partial } : z));
    setDeliveryZones(updated);
    saveToBackend({ deliveryZones: updated });
    const target = updated.find(z => z.id === id);
    if (target) settingsService.saveDeliveryZone(target);
    showToast('Delivery zone updated', 'success');
  };

  const toggleZoneEnabled = (id: string) => {
    const updated = deliveryZones.map(z => (z.id === id ? { ...z, isEnabled: !z.isEnabled } : z));
    setDeliveryZones(updated);
    saveToBackend({ deliveryZones: updated });
    const target = updated.find(z => z.id === id);
    if (target) settingsService.saveDeliveryZone(target);
  };

  // Homepage CMS
  const addHomepageSection = (section: Omit<HomepageSection, 'id'>) => {
    const safeSection = section.customHtml === undefined
      ? section
      : { ...section, customHtml: sanitizeHtml(section.customHtml) };
    const newSection: HomepageSection = {
      ...safeSection,
      id: `sec-${Date.now()}`
    };
    const updated = [...homepageSections, newSection];
    setHomepageSections(updated);
    saveToBackend({ homepageSections: updated });
    cmsService.saveHomepageSection(newSection);
    showToast('Homepage section added', 'success');
  };

  const updateHomepageSection = async (id: string, partial: Partial<HomepageSection>): Promise<boolean> => {
    const safePartial = partial.customHtml === undefined
      ? partial
      : { ...partial, customHtml: sanitizeHtml(partial.customHtml) };
    const updated = homepageSections.map(s => (s.id === id ? { ...s, ...safePartial } : s));
    setHomepageSections(updated);
    saveToBackend({ homepageSections: updated });
    const target = updated.find(s => s.id === id);
    let success = true;
    if (target) {
      success = await cmsService.saveHomepageSection(target);
    }
    return success;
  };

  const toggleHomepageSection = (id: string) => {
    const updated = homepageSections.map(s => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s));
    setHomepageSections(updated);
    saveToBackend({ homepageSections: updated });
    const target = updated.find(s => s.id === id);
    if (target) cmsService.saveHomepageSection(target);
  };

  const deleteHomepageSection = (id: string) => {
    const updated = homepageSections.filter(section => section.id !== id);
    setHomepageSections(updated);
    saveToBackend({ homepageSections: updated });
    cmsService.deleteHomepageSection(id);
    showToast('Homepage section deleted', 'success');
  };

  const reorderHomepageSections = (reordered: HomepageSection[]) => {
    setHomepageSections(reordered);
    saveToBackend({ homepageSections: reordered });
    reordered.forEach(s => cmsService.saveHomepageSection(s));
    showToast('Sections reordered', 'success');
  };

  // Landing Pages
  const addLandingPage = (lp: Omit<LandingPage, 'id' | 'createdAt'>) => {
    const newPage: LandingPage = {
      ...lp,
      id: `lp-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newPage, ...landingPages];
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    cmsService.saveLandingPage(newPage);
    showToast('Landing page created', 'success');
  };

  const updateLandingPage = (id: string, partial: Partial<LandingPage>) => {
    const updated = landingPages.map(p => (p.id === id ? { ...p, ...partial } : p));
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === id);
    if (target) cmsService.saveLandingPage(target);
    showToast('Landing page updated', 'success');
  };

  const togglePublishLandingPage = (id: string) => {
    const updated = landingPages.map(p => {
      if (p.id !== id) return p;
      const willPublish = !p.isPublished;
      return {
        ...p,
        isPublished: willPublish,
        publishedAt: willPublish ? new Date().toISOString() : p.publishedAt
      };
    });
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === id);
    if (target) cmsService.saveLandingPage(target);
  };

  const deleteLandingPage = (id: string) => {
    const updated = landingPages.filter(p => p.id !== id);
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    cmsService.deleteLandingPage(id);
    showToast('Landing page deleted', 'info');
  };

  const addLandingPageBlock = (
    landingPageId: string,
    block: Omit<LandingPageBlock, 'id' | 'landingPageId'>
  ) => {
    const newBlock: LandingPageBlock = {
      ...block,
      id: `block-${Date.now()}`,
      landingPageId,
      sanitizedHtml: block.blockType === 'CUSTOM_HTML' ? sanitizeHtml(block.content.rawHtml || '') : undefined
    };

    const updated = landingPages.map(p => {
      if (p.id !== landingPageId) return p;
      return { ...p, blocks: [...p.blocks, newBlock] };
    });
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === landingPageId);
    if (target) cmsService.saveLandingPage(target);
    showToast('Block added to landing page', 'success');
  };

  const updateLandingPageBlock = (
    landingPageId: string,
    blockId: string,
    partial: Partial<LandingPageBlock>
  ) => {
    const updated = landingPages.map(p => {
      if (p.id !== landingPageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => {
          if (b.id !== blockId) return b;
          const merged = { ...b, ...partial };
          if (merged.blockType === 'CUSTOM_HTML' && merged.content?.rawHtml) {
            merged.sanitizedHtml = sanitizeHtml(merged.content.rawHtml);
          }
          return merged;
        })
      };
    });
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === landingPageId);
    if (target) cmsService.saveLandingPage(target);
    showToast('Block updated', 'success');
  };

  const deleteLandingPageBlock = (landingPageId: string, blockId: string) => {
    const updated = landingPages.map(p => {
      if (p.id !== landingPageId) return p;
      return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
    });
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === landingPageId);
    if (target) cmsService.saveLandingPage(target);
    showToast('Block removed', 'info');
  };

  const reorderLandingPageBlocks = (landingPageId: string, blocks: LandingPageBlock[]) => {
    const updated = landingPages.map(p => {
      if (p.id !== landingPageId) return p;
      return { ...p, blocks };
    });
    setLandingPages(updated);
    saveToBackend({ landingPages: updated });
    const target = updated.find(p => p.id === landingPageId);
    if (target) cmsService.saveLandingPage(target);
  };

  // Reviews
  const submitReview = (
    productId: string,
    name: string,
    phone: string,
    rating: number,
    text: string
  ): boolean => {
    const normPhone = normalizePhoneNumber(phone);
    const prod = products.find(p => p.id === productId);

    // Check if phone matches a Delivered order containing this product
    const isVerified = orders.some(
      o =>
        o.status === 'DELIVERED' &&
        normalizePhoneNumber(o.customerPhoneSnapshot) === normPhone &&
        o.items.some(item => item.productId === productId)
    );

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId,
      productName: prod?.name || '',
      reviewerName: name,
      reviewerPhone: normPhone,
      rating,
      reviewText: text,
      isVerifiedPurchase: isVerified,
      moderationStatus: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    saveToBackend({ reviews: updated });
    supportService.submitReview(newRev);
    showToast('Review submitted! It will appear after quick verification.', 'success');
    return true;
  };

  const moderateReview = (reviewId: string, decision: 'APPROVED' | 'REJECTED') => {
    const updated = reviews.map(r => (r.id === reviewId ? { ...r, moderationStatus: decision } : r));
    setReviews(updated);
    saveToBackend({ reviews: updated });
    supportService.moderateReview(reviewId, decision);
    showToast(`Review ${decision.toLowerCase()}`, 'success');
  };

  // Support Ticket Methods
  const submitSupportTicket = (
    ticket: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): SupportTicket => {
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      ...ticket,
      id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now
    };
    const updated = [newTicket, ...supportTickets];
    setSupportTickets(updated);
    saveToBackend({ supportTickets: updated });
    supportService.submitSupportTicket(newTicket);
    showToast('Support request submitted! We will get back to you soon.', 'success');
    return newTicket;
  };

  const updateSupportTicketStatus = (id: string, status: SupportStatus) => {
    const updated = supportTickets.map(t =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    );
    setSupportTickets(updated);
    saveToBackend({ supportTickets: updated });
    supportService.updateSupportTicketStatus(id, status);
    showToast(`Ticket status updated to ${status.replace('_', ' ')}`, 'success');
  };

  const updateSupportTicketNotes = (id: string, notes: string) => {
    const updated = supportTickets.map(t =>
      t.id === id ? { ...t, adminNotes: notes, updatedAt: new Date().toISOString() } : t
    );
    setSupportTickets(updated);
    saveToBackend({ supportTickets: updated });
    supportService.updateSupportTicketNotes(id, notes);
    showToast('Admin notes saved', 'success');
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        updateSettings,
        adminUser,
        isAdminLoggedIn: !!adminUser,
        loginAdmin,
        logoutAdmin,

        categories,
        products,
        addCategory,
        updateCategory,
        toggleCategoryEnabled,
        reorderCategories,
        deleteCategory,
        addProduct,
        updateProduct,
        toggleProductEnabled,
        deleteProduct,

        inventoryAdjustments,
        adjustStock,

        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartItemCount,
        isCartOpen,
        setIsCartOpen,

        buyNowItem,
        setBuyNowItem,

        checkoutPrefill,
        setCheckoutPrefill,

        orders,
        submitCheckout,
        transitionOrderStatus,
        updateOrderStatus,
        verifyPayment,
        updatePaymentStatus,
        updateDeliveryStatus,
        updateAdminNotes,
        addOrderInternalNote,
        getOrGenerateInvoice,
        incrementInvoiceReprint,
        trackOrder,

        customers,
        updateCustomerAdminNote,

        deliveryZones,
        addZone,
        updateZone,
        toggleZoneEnabled,

        homepageSections,
        addHomepageSection,
        updateHomepageSection,
        toggleHomepageSection,
        deleteHomepageSection,
        reorderHomepageSections,

        landingPages,
        addLandingPage,
        updateLandingPage,
        togglePublishLandingPage,
        deleteLandingPage,
        addLandingPageBlock,
        updateLandingPageBlock,
        deleteLandingPageBlock,
        reorderLandingPageBlocks,

        reviews,
        submitReview,
        moderateReview,

        supportTickets,
        submitSupportTicket,
        updateSupportTicketStatus,
        updateSupportTicketNotes,

        currentView,
        setCurrentView,
        selectedCategorySlug,
        setSelectedCategorySlug,
        selectedProductSlug,
        setSelectedProductSlug,
        selectedLandingSlug,
        setSelectedLandingSlug,
        activeConfirmedOrder,
        setActiveConfirmedOrder,
        searchQuery,
        setSearchQuery,

        toast,
        showToast,
        hideToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
