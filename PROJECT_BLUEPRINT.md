# GoodZeed — Project Architecture & Replication Blueprint

## 0. Executive Summary

This repository is a React 19 + Vite storefront with a separate admin portal for managing products, orders, categories, delivery zones, CMS homepage sections, landing pages, and review moderation. The application uses dual persistence: browser localStorage as a fast cache and an Express backend (`server.js` + `server/apiRouter.js`) backed by `data/store.json` as the cross-browser/device source of truth, plus disk file uploads via `POST /api/upload` into `public/uploads/`. The backend also mirrors uploads and state to `src/assets/uploads/` and `src/data/storeData.json` so static builds and Git tracking stay consistent.

The most important architectural fact is that the app intentionally splits traffic into two route trees:

- Public storefront: `/` and all customer views
- Admin portal: `ADMIN_PORTAL_PATH/*` (obscured path `/gz-panel-7392` configured in `StoreContext.tsx`) with a dedicated login gate

Everything is driven by a single `StoreContext` provider, with seed data bootstrapped from `src/data/storeData.json` (exported as `STORE_DATA` via `src/data/seedData.ts`), localStorage keys as the cache layer, and `saveToBackend()` persisting every mutation to `/api/store`. Backend hydration merges (never blind-overwrites) so locally placed orders are never wiped by a stale snapshot.

The app also includes an AI Support chat system (`POST /api/support/ai`) powered by Gemini `gemini-3.6-flash`, with rate limiting and a store-aware dynamic system prompt built from live store data.

This document is a complete blueprint for reproducing the current application behavior from scratch without missing the core logic, data structures, route structure, CMS behavior, or persistence contract.

> **Verification note (September 2026):** dependency list, file tree, localStorage keys, context action names, backend endpoint behavior, homepage section priority order, media-upload rules, AI support integration, and data-source architecture in this document were re-checked against the codebase and updated where they had drifted.

---

## 1. Tech Stack & Environment Setup

### 1.1 Dependency snapshot from package.json

Runtime dependencies:

- `react`: `^19.0.1`
- `react-dom`: `^19.0.1`
- `react-router-dom`: `^7.18.3`
- `vite`: `^6.2.3`
- `@vitejs/plugin-react`: `^5.0.4`
- `@tailwindcss/vite`: `^4.1.14`
- `tailwindcss`: `^4.1.14`
- `lucide-react`: `^0.546.0`
- `motion`: `^12.23.24`
- `swiper`: `^14.2.0`
- `canvas-confetti`: `^1.9.4`
- `@google/genai`: `^2.4.0`
- `dotenv`: `^17.2.3`
- `express`: `^4.21.2`
- `multer`: `^1.4.5-lts.1`

Dev dependencies:

- `typescript`: `~5.8.2`
- `@types/node`: `^22.14.0`
- `@types/express`: `^4.17.21`
- `@types/canvas-confetti`: `^1.9.0`
- `autoprefixer`: `^10.4.21`
- `esbuild`: `^0.25.0`
- `tsx`: `^4.21.0`

Package scripts:

```bash
npm install
npm run dev            # vite --port=3000 --host=0.0.0.0 (with /api/* via apiServerPlugin)
npm run build          # vite build -> dist/
npm run preview        # vite preview
npm run lint           # tsc --noEmit
npm run clean          # rm -rf dist
npm run start:server   # node server.js -> Express on :7392 serving public/ + dist/ + /api
```

Backend endpoints (both `vite.config.ts` dev plugin and `server.js` prod mount `server/apiRouter.js`):

```text
GET  /api/health   -> { ok, timestamp }
POST /api/upload   -> multipart file -> { success, url: "/uploads/<file>", filename, size, mimetype } (50MB limit, disk in public/uploads/ + mirror in src/assets/uploads/)
GET  /api/store    -> full data/store.json snapshot (returns {} on first boot when the file doesn't exist yet)
POST /api/store    -> merge top-level keys into data/store.json (atomic tmp+rename), deep-merges settings, also syncs to src/data/storeData.json
PUT  /api/store    -> same as POST
POST /api/support/ai -> AI chat proxy to Gemini gemini-3.6-flash (rate-limited: 20 req/min per IP)
```

`GET /api/store` reads from disk each call; `POST /api/store` merges top-level keys so partial saves never wipe unrelated slices.

### 1.2 Frontend and build setup

- Project type: ES module (`"type": "module"`)
- Package name: `react-example`
- App bootstraps from `src/main.tsx`
- Global styling imported through `src/index.css`
- Tailwind is enabled via `@tailwindcss/vite` plugin in `vite.config.ts`
- React compiler integration is provided by `@vitejs/plugin-react`
- The app serves at `http://localhost:3000`

### 1.3 Vite configuration details

`vite.config.ts` configures:

```ts
plugins: [react(), tailwindcss(), apiServerPlugin()]
resolve.alias['@'] = path.resolve(__dirname, '.')
server.hmr = process.env.DISABLE_HMR !== 'true'
server.watch = process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/**', '**/public/uploads/**'] }
```

`apiServerPlugin()` mounts an Express sub-app in dev:

```ts
apiApp.use(express.json({ limit: '50mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
apiApp.use('/api', apiRouter);
apiApp.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));
```

Behavioral notes:

- `DISABLE_HMR=true` disables hot module replacement and file watching
- This is used in some agent environments to reduce flicker during editing
- `data/` and `public/uploads/` are always ignored by the watcher so persisting orders or uploading media never triggers HMR flicker
- The alias `@` points to the repo root, so imports such as `@/src/...` are possible
- Dev API base is same-origin `/api/*`, so frontend `fetch('/api/store')` works in both dev (`:3000`) and prod (`server.js` on `:7392`)
- `apiServerPlugin` also mirrors uploaded files to `src/assets/uploads/` and syncs state to `src/data/storeData.json` for static build bundling and Git tracking
- `loadEnv(mode, process.cwd(), '')` loads `.env.local` / `.env` so `GEMINI_API_KEY` is available in the server plugin process

### 1.4 TypeScript configuration details

`tsconfig.json` emphasizes browser-first UI development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "moduleDetection": "force",
    "paths": { "@/*": ["./*"] }
  }
}
```

This config is intentionally permissive and designed for a Vite app with TypeScript annotations but not a strict server-side runtime. `moduleDetection: "force"` ensures all files are treated as modules, and `useDefineForClassFields: false` aligns with the existing class field semantics.

### 1.5 Environment variables and `.env.example`

Current `.env.example`:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

(The file ships with comment headers explaining that AI Studio injects `GEMINI_API_KEY` from user secrets and `APP_URL` from the hosted Cloud Run service URL.)

Important notes:

- `GEMINI_API_KEY` is documented as the credential for Google Gemini AI features
- `APP_URL` is intended to represent the canonical public URL of the app
- Backend persistence needs no env vars: `server/apiRouter.js` resolves `data/store.json`, `public/uploads/`, `src/assets/uploads/`, and `src/data/storeData.json` from `process.cwd()`
- Local environment files such as `.env.local` are meant to stay private and are excluded from Git
- Vite will not expose arbitrary env vars to the browser unless they are prefixed with `VITE_`

Optional runtime switch:

- `DISABLE_HMR=true` can be used in local agent environments to disable file watching and HMR

### 1.6 UI and brand stack

- Typography: Fraunces (serif) and Plus Jakarta Sans (sans) via Google Fonts
- Primary colors are rooted in green, cream, charcoal, and gold
- Banner/background base is `#FAF7F2`
- Global print styles hide the storefront for invoice printing and keep the printable `#printable-invoice` container visible
- Favicon system uses versioned `?v=5` cache-busting across all icon assets

---

## 2. Complete Directory & File Structure

```text
goodzeed/
├── .env.example
├── .env.local                    # local-only secrets, not committed
├── .gitignore
├── README.md
├── PROJECT_BLUEPRINT.md
├── bun.lock
├── package-lock.json
├── package.json                  # name: "react-example"
├── metadata.json                 # applet metadata (name, description, capabilities)
├── index.html                    # updated favicon system (?v=5), SEO meta tags
├── tsconfig.json
├── vite.config.ts                # includes apiServerPlugin (/api/* + /uploads in dev), loadEnv
├── server.js                     # Express prod server (:7392): /api + public/ + dist/ + SPA catch-all
├── server/
│   └── apiRouter.js              # GET/POST /api/store, POST /api/upload, GET /api/health, POST /api/support/ai
├── data/
│   └── store.json                # backend source of truth (gitignored, runtime-generated)
├── src/
│   ├── assets/
│   │   └── uploads/              # mirrored uploads for Vite bundling and Git tracking
│   ├── App.tsx                   # top-level route split + conditional rendering
│   ├── main.tsx                  # ReactRoot + <StrictMode> bootstrap
│   ├── index.css                 # Tailwind import, font styles, print rules
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminCategories.tsx
│   │   │   ├── AdminCustomers.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminDeliveryZones.tsx
│   │   │   ├── AdminHomepageCMS.tsx
│   │   │   ├── AdminInventory.tsx
│   │   │   ├── AdminLandingPages.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── AdminOrders.tsx
│   │   │   ├── AdminProducts.tsx
│   │   │   ├── AdminReviews.tsx
│   │   │   ├── AdminSalesMarketing.tsx  # also handles homepage (hero tab) and landing (campaigns tab)
│   │   │   ├── AdminSettings.tsx
│   │   │   ├── AdminSupport.tsx        # NEW: admin support ticket manager
│   │   │   ├── HeroMediaManager.tsx
│   │   │   ├── InvoiceModal.tsx
│   │   │   ├── MediaUploadInput.tsx
│   │   │   └── ProductMediaManager.tsx
│   │   ├── common/
│   │   │   ├── BrandLogo.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MobileTabBar.tsx
│   │   │   └── Toast.tsx
│   │   ├── motion/             # reusable animation primitives (motion library)
│   │   │   ├── AnimatedButton.tsx
│   │   │   ├── AnimatedContainer.tsx
│   │   │   ├── AnimatedList.tsx
│   │   │   ├── FadeInWhenVisible.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── ScrollProgress.tsx
│   │   │   ├── transitions.ts
│   │   │   └── index.ts
│   │   ├── storefront/
│   │   │   ├── BrandStorySection.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── CategoryGrid.tsx
│   │   │   ├── CheckoutView.tsx
│   │   │   ├── FeaturedProductsSection.tsx
│   │   │   ├── HeroCarousel.tsx          # NEW: Swiper-based hero carousel (replaces HeroBanner)
│   │   │   ├── HomeFaqSection.tsx
│   │   │   ├── LandingPageView.tsx
│   │   │   ├── OrderConfirmationView.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductDetailModal.tsx
│   │   │   ├── SearchAutocomplete.tsx    # NEW: search autocomplete dropdown
│   │   │   ├── ShopView.tsx
│   │   │   ├── TestimonialsSection.tsx
│   │   │   ├── TrackOrderView.tsx
│   │   │   └── TrustStrip.tsx
│   │   ├── support/                      # NEW: AI support chat system
│   │   │   ├── AIChatDrawer.tsx
│   │   │   ├── ContactFormModal.tsx
│   │   │   └── SupportWidget.tsx
│   │   └── upload/
│   │       └── UploadFlowDemo.tsx
│   ├── context/
│   │   └── StoreContext.tsx     # sync-computed mutations + saveToBackend + merge hydration + support tickets + sessionStorage
│   ├── data/
│   │   ├── seedData.ts          # imports STORE_DATA from storeData.json, exports INITIAL_* constants
│   │   └── storeData.json       # primary seed data source (tracked by Git)
│   ├── types/
│   │   └── index.ts             # expanded with Subcategory, SupportTicket, SupportStatus, HeroCtaLinkType
│   └── utils/
│       ├── assetHelper.ts       # NEW: getAssetUrl(), resolveObjectAssets() for src/assets/ resolution
│       ├── formatters.ts
│       ├── mediaUtils.ts
│       ├── productSearch.ts     # NEW: tokenized search index (normalizeSearchText, tokenizeSearchText, buildProductSearchIndex, searchIndex, searchProducts, getSearchSuggestions, POPULAR_SEARCHES, useDebouncedValue)
│       └── sanitizer.ts
```

### 2.1 Key responsibilities of the major files

- `src/App.tsx`: Defines the storefront branch and admin branch using `BrowserRouter`, `Routes`, and `useLocation`. Also renders the floating `SupportWidget` on all storefront views and manages the `ProductDetailModal` via `AnimatePresence`.
- `src/context/StoreContext.tsx`: The single source of state and business logic; includes checkout, inventory, CMS, landing page, order status transitions, support tickets, and persistence. Admin sessions use `sessionStorage` (tab-local, 8-hour expiry).
- `src/data/seedData.ts`: Imports `STORE_DATA` from `src/data/storeData.json` and exports `INITIAL_*` constants with `getAssetUrl()` normalization applied.
- `src/data/storeData.json`: Primary seed data source (tracked by Git). Contains settings, adminUser, categories, products, deliveryZones, homepageSections, landingPages, customers, orders, reviews, supportTickets, nextInvoiceSequence.
- `src/types/index.ts`: Primary TypeScript contract for every core entity, expanded with `Subcategory`, `SupportTicket`, `SupportStatus`, `HeroCtaLinkType`, and new fields on existing types.
- `src/utils/assetHelper.ts`: Resolves asset URLs from `src/assets/` using Vite's `import.meta.glob`, handles `/uploads/` paths, and provides `resolveObjectAssets()` for bulk normalization.
- `src/utils/productSearch.ts`: Tokenized product search index (`normalizeSearchText`, `tokenizeSearchText`, `buildProductSearchIndex`, `searchIndex`, `searchProducts`, `getSearchSuggestions`, `POPULAR_SEARCHES`, `useDebouncedValue`).
- `src/utils/sanitizer.ts`: Dangerous HTML stripping with a strict allow-list for custom CMS HTML.
- `src/utils/formatters.ts`: Phone normalization, order number generation, invoice number generation.
- `src/utils/mediaUtils.ts`: Detects image/video URLs, resolves YouTube/Vimeo embed URLs, normalizes legacy hero/product media.
- `src/components/admin/*`: Admin dashboards and tools, all logically isolated from storefront route rendering.
- `src/components/storefront/*`: Public product catalog, hero carousel, checkout, confirmation, tracking, search, and marketing pages.
- `src/components/support/*`: AI chat drawer, contact form modal, and floating support widget available on all storefront views.
- `src/components/motion/*`: Reusable animation primitives built on the `motion` library (`AnimatedButton`, `AnimatedContainer`, `AnimatedList`, `FadeInWhenVisible`, `PageTransition`, `ScrollProgress`, shared `transitions.ts`), re-exported via `index.ts`.
- `src/components/upload/UploadFlowDemo.tsx`: Demo/documentation component for the `/api/upload` flow.

---

## 3. Complete Data Models & Database Schemas

Important note: this repo does not include a PostgreSQL, MongoDB, or SQL schema. Persistence is dual-layer:

- Browser localStorage cache (`goodzeed_store_*` keys) for instant load.
- Express backend source of truth: `data/store.json` (read via `GET /api/store`, written via `POST/PUT /api/store` with atomic tmp+rename). Also mirrored to `src/data/storeData.json` for static builds and Git tracking. Holds `settings`, `categories`, `products`, `inventoryAdjustments`, `orders`, `customers`, `nextInvoiceSequence`, `deliveryZones`, `homepageSections`, `landingPages`, `reviews`, `supportTickets`, `lastUpdated`.
- Binary assets on disk: `public/uploads/*` and `src/assets/uploads/*` via `POST /api/upload` (multer, 50MB limit). Only `/uploads/...` URLs are stored in records — never base64 `data:` URLs (they exceed the ~5MB localStorage quota and bloat `store.json` saves).

### 3.1 Core model definitions

#### ProductVariant

```ts
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  label: string; // e.g., "250g", "500g", "1kg", "500ml"
  sizeValue: number;
  sizeUnit: 'g' | 'kg' | 'ml' | 'l' | 'pcs';
  price: number; // in BDT ৳
  salePrice?: number | null; // in BDT ৳
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
  isEnabled: boolean;
}
```

#### ProductMediaItem

```ts
export interface ProductMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string; // Image URL, base64 data URI, or video URL (MP4/WebM, YouTube, Vimeo)
  altText?: string;
  title?: string;
  thumbnailUrl?: string; // Optional custom poster/thumbnail for video slides
  videoSource?: 'direct' | 'youtube' | 'vimeo';
}
```

#### Product

```ts
export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  subcategoryId?: string;
  shortDescription: string;
  fullDescription: string;
  ingredients: string;
  nutritionInfo: string;
  originInfo: string;
  purityInfo: string;
  storageInstructions: string;
  usageInstructions: string;
  seoTitle?: string;
  seoDescription?: string;
  images: string[];          // legacy sync field
  media?: ProductMediaItem[]; // enhanced media list
  videoUrl?: string;         // legacy field
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  isEnabled: boolean;
  isPublished?: boolean;
  variants: ProductVariant[];
  rating?: number;
  reviewCount?: number;
  /** Optional search keywords/tags (matched by storefront search; all optional). */
  tags?: string[];
  keywords?: string[];
  /** Optional trust/verification label shown on the product card below the title. */
  trustLabel?: string;
  /** Optional free-text badge override shown on the product card image. */
  customBadge?: string;
}
```

#### Category and Subcategory

```ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isEnabled: boolean;
}
```

#### CartItem

```ts
export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  image: string;
  stock: number;
}
```

#### Order and order lifecycle

```ts
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED';

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD';
export type PaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';
export type DeliveryMethod = 'OWN_DELIVERY' | 'COURIER';
export type DeliveryStatus = 'NOT_DISPATCHED' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_FAILED';
```

```ts
export interface OrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  productId: string;
  productNameSnapshot: string;
  variantLabelSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineSubtotal: number;
  productImageSnapshot: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  verifiedByAdminId?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface DeliveryRecord {
  id: string;
  orderId: string;
  deliveryZoneId: string;
  zoneNameSnapshot: string;
  chargeSnapshot: number;
  method: DeliveryMethod;
  status: DeliveryStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string; // example: GZ-INV-000101
  issuedAt: string;
  reprintedCount: number;
}

export interface OrderInternalNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // example: GZ-2026-1001
  customerId: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  deliveryAddressSnapshot: string;
  deliveryDistrict: string;
  deliveryNotes?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  payment: PaymentRecord;
  delivery: DeliveryRecord;
  invoice?: Invoice;
  internalAdminNotes?: string;
  internalNotes?: OrderInternalNote[];
  source: 'CART' | 'BUY_NOW' | 'LANDING_PAGE';
  createdAt: string;
  updatedAt: string;
}
```

#### Customer, delivery zone, inventory adjustment

```ts
export interface Customer {
  id: string;
  name: string;
  phoneNormalized: string;
  phoneRaw: string;
  email?: string;
  defaultAddress?: string;
  totalOrders: number;
  totalSpend: number;
  lastOrderAt: string;
  status: 'ACTIVE' | 'FLAGGED';
  createdAt: string;
  /** Private admin-only note for customer-related information. Never shown on storefront. */
  adminNote?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  estimatedDeliveryTime: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface InventoryAdjustment {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  changeAmount: number; // positive or negative
  reason: string;
  adjustedByAdminId: string;
  stockAfter: number;
  createdAt: string;
}
```

#### Homepage sections and hero media

```ts
export type SectionType =
  | 'HERO'
  | 'TRUST_STRIP'
  | 'SHOP_BY_CATEGORY'
  | 'FEATURED_PRODUCTS'
  | 'BEST_SELLERS'
  | 'PROMO_BANNER'
  | 'WHY_GOODZEED'
  | 'SOURCE_STORY'
  | 'FEATURED_COLLECTION'
  | 'REVIEWS'
  | 'BRAND_STORY'
  | 'FINAL_CTA';

export type HeroMediaType = 'image' | 'video';
export type HeroCtaLinkType = 'shop' | 'category' | 'product' | 'cms' | 'custom';

export interface HeroMediaItem {
  id: string;
  type: HeroMediaType;
  url: string; // Image URL / base64 or video URL (MP4/WebM, YouTube, Vimeo)
  altText?: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string; // Optional custom poster for video
  videoSource?: 'direct' | 'youtube' | 'vimeo';

  // Per-slide content overrides (all optional — falls back to global heroSection.* when absent)
  badge?: string;
  subtitle?: string;         // Per-slide subtitle / Bengali title override
  description?: string;      // Per-slide body text override

  // Primary CTA
  ctaText?: string;
  ctaLinkType?: HeroCtaLinkType;
  ctaProductSlug?: string;
  ctaCategorySlug?: string;
  ctaLandingSlug?: string;
  ctaCustomUrl?: string;

  // Secondary CTA (optional)
  secondaryCtaText?: string;
  secondaryCtaLinkType?: HeroCtaLinkType | 'track-order';
  secondaryCtaProductSlug?: string;
  secondaryCtaCategorySlug?: string;
  secondaryCtaLandingSlug?: string;
  secondaryCtaCustomUrl?: string;

  // Overlay intensity for text contrast
  overlay?: 'light' | 'medium' | 'dark';

  // Slide publish gating
  status?: 'draft' | 'published';

  // Optional advanced HTML to replace the content area (power-user override)
  advancedHtml?: string;
}

export interface HomepageSection {
  id: string;
  sectionType: SectionType;
  title: string;
  sortOrder: number;
  isEnabled: boolean;
  heading?: string;
  subtitle?: string;
  bodyText?: string;
  ctaLabel?: string;
  ctaLink?: string;
  mediaUrl?: string;
  badge?: string;
  customHtml?: string;
  heroHeadline?: string;
  heroBengaliTitle?: string;
  heroDescription?: string;
  heroCtaText?: string;
  heroCtaCategorySlug?: string;
  heroSecondaryCtaText?: string;
  heroImageUrl?: string; // Legacy single image compatibility
  heroVideoUrl?: string; // Legacy / optional direct video URL
  heroMedia?: HeroMediaItem[]; // Enhanced multi-image and video list
}
```

#### Landing pages and marketing blocks

```ts
export type LandingPageBlockType =
  | 'HERO'
  | 'PRODUCT_SHOWCASE'
  | 'PURCHASE_SECTION'
  | 'IMAGE'
  | 'VIDEO'
  | 'TEXT'
  | 'BENEFITS'
  | 'TESTIMONIALS'
  | 'FAQ'
  | 'CTA'
  | 'TRUST_SECTION'
  | 'CUSTOM_HTML'
  | 'COUNTDOWN_TIMER'
  | 'QUICK_ORDER_FORM';

export interface LandingPageBlock {
  id: string;
  landingPageId: string;
  blockType: LandingPageBlockType;
  sortOrder: number;
  content: Record<string, any>;
  sanitizedHtml?: string;
}

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  socialShareImage?: string;
  facebookPixelId?: string;
  googleAnalyticsId?: string;
  countdownEndsAt?: string; // ISO datetime for page-level countdown
  isPublished: boolean;
  isNoIndex: boolean;
  publishedAt?: string;
  blocks: LandingPageBlock[];
  createdAt: string;
}
```

#### Reviews, settings, admin user, support tickets

```ts
export interface Review {
  id: string;
  productId: string;
  productName?: string;
  reviewerName: string;
  reviewerPhone: string;
  rating: number; // 1 to 5
  reviewText: string;
  isVerifiedPurchase: boolean;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storeContactPhone: string;
  storeContactEmail: string;
  storeAddress: string;
  bkashReceivingNumber: string;
  bkashInstructions: string;
  nagadReceivingNumber: string;
  nagadInstructions: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  currencySymbol: string;
  faviconPath?: string;
  /** WhatsApp number for support (international format, e.g. +8801711223344). Defaults to storeContactPhone. */
  whatsappSupportNumber?: string;
  /** Human-readable support hours shown in AI and contact UI. */
  supportHours?: string;
  /** Master toggle — false disables the AI Assistant option in the support widget. */
  aiAssistantEnabled?: boolean;
  /** Opening message shown when the AI chat panel is first opened. */
  aiWelcomeMessage?: string;
  /** Return policy text fed to the AI as store knowledge. */
  returnPolicy?: string;
  /** Cancellation policy text fed to the AI. */
  cancellationPolicy?: string;
  /** Refund policy text fed to the AI. */
  refundPolicy?: string;
  /** Free-form FAQ / additional knowledge for the AI assistant. */
  supportFAQ?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN';
  lastLoginAt?: string;
  /** Per-browser-tab session token generated at login. Never persisted server-side. */
  sessionToken?: string;
  /** ISO timestamp when this session expires (default 8 hours from login). */
  expiresAt?: string;
}

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED';

export interface SupportTicket {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** Optional order number provided by the customer. */
  orderNumber?: string;
  subject: string;
  message: string;
  status: SupportStatus;
  /** Optional admin-only notes on this ticket. */
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Seed data behavior and fallback defaults

Seeded defaults live in `src/data/storeData.json` and are loaded via `src/data/seedData.ts`, which exports:

- `STORE_DATA` — the raw `storeData.json` content
- `INITIAL_SETTINGS`
- `INITIAL_ADMIN`
- `INITIAL_CATEGORIES`
- `INITIAL_PRODUCTS`
- `INITIAL_DELIVERY_ZONES`
- `INITIAL_HOMEPAGE_SECTIONS`
- `INITIAL_LANDING_PAGES`
- `INITIAL_CUSTOMERS`
- `INITIAL_ORDERS`
- `INITIAL_REVIEWS`
- `INITIAL_SUPPORT_TICKETS`
- `INITIAL_INVOICE_SEQUENCE`

The `seedData.ts` applies `getAssetUrl()` normalization to all image/media URLs so assets resolve correctly in both dev and production (Vite-bundled `src/assets/`). Hallmarks of the data model:

- Products include both legacy fields (`images`, `videoUrl`) and modern ones (`media`)
- Products can have `tags`, `keywords`, `trustLabel`, and `customBadge` for search and display
- Product thumbnails are derived with `normalizeProductMedia()` and `getProductThumbnail()` when needed
- Homepage sections retain older hero fields to stay backward compatible with existing records
- Orders snapshot product names and variant labels at checkout time so historical records remain stable even if the catalog later changes
- `normalizePhoneNumber()` is used in `formatters.ts` to standardize customer telephony
- Customer records can have `adminNote` for private admin-only notes

### 3.3 Browser storage keys + backend file

The app uses a prefix and saves each top-level state slice into localStorage as a cache:

```ts
const LOCAL_STORAGE_KEY_PREFIX = 'goodzeed_store_';
```

Examples:

- `goodzeed_store_settings`
- `goodzeed_store_adminUser` — **NOT stored here; admin sessions use sessionStorage (`goodzeed_admin_session`) with 8-hour expiry**
- `goodzeed_store_categories`
- `goodzeed_store_products`
- `goodzeed_store_adjustments`
- `goodzeed_store_orders`
- `goodzeed_store_customers`
- `goodzeed_store_zones`
- `goodzeed_store_homepage_sections`
- `goodzeed_store_landing_pages`
- `goodzeed_store_reviews`
- `goodzeed_store_cart`
- `goodzeed_store_inv_seq`
- `goodzeed_store_supportTickets`

Source of truth is `data/store.json` via `/api/store`. Every mutation calls `saveToBackend()` (same-origin POST, checks `resp.ok`, warns on >4.5MB payloads) in addition to the localStorage `useEffect` cache. On mount, hydration fetches `/api/store` and **merges by id** (`mergeById`) instead of blind-overwriting, normalizes orders (`normalizeOrderRecord`), sorts newest-first, and takes `max` for `nextInvoiceSequence` — so orders placed on one device/browser are never wiped by a stale snapshot and always appear in admin.

---

## 4. Core Business Logic & State Flow

### 4.1 `StoreContext` contract and state actions

`StoreContext` exposes a single large context object with these sections:

- Settings and admin auth (with `sessionStorage` session management)
- Catalog and inventory (with `toggleCategoryEnabled`, `reorderCategories`, `deleteCategory`)
- Cart and buy-now flows (with `clearCart`, `checkoutPrefill`)
- Checkout, orders, and customers (with `updateOrderStatus`, `updateAdminNotes`, `addOrderInternalNote`, `incrementInvoiceReprint`)
- Delivery zones
- Homepage CMS, landing pages, and reviews
- **Support tickets** (`submitSupportTicket`, `updateSupportTicketStatus`, `updateSupportTicketNotes`)
- Routing and view state (with `searchQuery`, `isMobileMenuOpen`)
- Toast notifications

Core context actions:

```ts
loginAdmin(email, pass)
logoutAdmin()
updateSettings(newSettings)
addCategory(category)
updateCategory(id, partial)
toggleCategoryEnabled(id)
reorderCategories(ordered)
deleteCategory(id)
addProduct(product)
updateProduct(id, partial)
toggleProductEnabled(id)
deleteProduct(id)
adjustStock(variantId, changeAmount, reason)
addToCart(product, variantId, qty)
updateCartQuantity(variantId, qty)
removeFromCart(variantId)
clearCart()
submitCheckout(payload)
transitionOrderStatus(orderId, newStatus)
updateOrderStatus(orderId, newStatus)
verifyPayment(orderId, decision, notes)
updatePaymentStatus(orderId, status)
updateDeliveryStatus(orderId, status, tracking)
updateAdminNotes(orderId, notes)
addOrderInternalNote(orderId, note)
getOrGenerateInvoice(orderId)
incrementInvoiceReprint(orderId)
trackOrder(phone, orderNumber)
addHomepageSection(section)
updateHomepageSection(id, partial)
toggleHomepageSection(id)
deleteHomepageSection(id)
reorderHomepageSections(ordered)
addLandingPage(page)
deleteLandingPage(id)
addLandingPageBlock(pageId, block)
updateLandingPageBlock(pageId, blockId, partial)
deleteLandingPageBlock(pageId, blockId)
reorderLandingPageBlocks(pageId, blocks)
submitReview(productId, name, phone, rating, text)
moderateReview(reviewId, decision)
submitSupportTicket(ticket)
updateSupportTicketStatus(id, status)
updateSupportTicketNotes(id, notes)
```

All mutating actions compute the next state **synchronously from current state** (never via side-effects inside `setState` updaters — updaters must stay pure under `<StrictMode>`), then `setX(updated)` and `saveToBackend({...})`. `saveToBackend` POSTs to `/api/store`, checks `resp.ok`, toasts on failure, and warns on >4.5MB payloads. Order mutations share a `persistOrders(updatedOrders, nextSeq)` helper so admin sees changes on any browser/device after reload.

State-updater purity rule (critical): never call `saveToBackend`, `setAnotherState`, or assign outer `let success` flags inside a `setX(prev => ...)` updater. Compute from `orders`/`products`/`customers` closures instead — this fixes `submitCheckout` orphan `customerId`, `transitionOrderStatus` always-`false`, `verifyPayment` always-`false`, `getOrGenerateInvoice` always-`null`, and `adjustStock` always-`false` bugs.

**Admin session management**: `loginAdmin` generates a `sessionToken` (via `crypto.randomUUID()`) and `expiresAt` (8 hours from login), stores the session in `sessionStorage`, and sets `adminUser` state. `logoutAdmin` clears both. Admin sessions are **never** persisted to localStorage or the backend — they are tab-local only.

### 4.2 Client-side routing and view rendering

`src/App.tsx` contains a split route tree:

```tsx
<BrowserRouter>
  <StoreProvider>
    <Routes>
      <Route path={`${ADMIN_PORTAL_PATH}/*`} element={<AdminAppContent />} />
      <Route path="/*" element={<StorefrontAppContent />} />
    </Routes>
  </StoreProvider>
</BrowserRouter>
```

Where `ADMIN_PORTAL_PATH = '/gz-panel-7392'` (single source of truth in `StoreContext.tsx`).

Storefront view flow:

- `currentView` defaults to `'home'`
- Values include `'home'`, `'shop'`, `'category'`, `'checkout'`, `'confirmation'`, `'track-order'`, and `'landing'`
- The storefront contents render from the main state and not from URL-based route matching alone
- `selectedCategorySlug`, `selectedProductSlug`, and `selectedLandingSlug` keep track of active content
- `SearchAutocomplete` is available on the shop page for product search
- `SupportWidget` (floating) is available on all storefront views with product/order context
- `ProductDetailModal` renders via `AnimatePresence` when a product is selected

Admin route behavior:

- If `adminUser` is absent, `AdminLogin` renders
- If `adminUser` exists, `AdminLayout` renders with a tab based on the URL (for example `<ADMIN_PORTAL_PATH>/orders`, `<ADMIN_PORTAL_PATH>/settings`)
- The admin tab `homepage` renders `<AdminSalesMarketing defaultTab="hero" />` and `landing` renders `<AdminSalesMarketing defaultTab="campaigns" />`
- The `support` tab renders `<AdminSupport />` for ticket management
- The public route tree does not mount admin components, so regular users cannot see the admin UI

### 4.3 Checkout flow and order creation

`submitCheckout()` is the critical order logic. The exact process is:

1. Validate payload and ensure `items.length > 0`
2. Re-check each product and variant against the current catalog
3. Return an error if a product or size is missing or out of stock
4. Resolve the selected delivery zone and calculate `deliveryCharge` (error if no zone)
5. Compute `updatedProducts` with decremented variant stock synchronously
6. Normalize the customer phone number with `normalizePhoneNumber()`
7. Deduplicate customer records by normalized phone number synchronously (existing → bump `totalOrders`/`totalSpend`; new → `cust-<ts>`), capturing the real `customerId`
8. Build an `Order` object with snapshot fields:
   - unique `order-<ts>-<rand>` id and collision-checked `generateOrderNumber()` (retry vs existing numbers)
   - correct `customerId` (no orphan fallback)
   - customer snapshot data
   - item snapshot data
   - subtotal/delivery/total
   - payment status based on `COD` vs `BKASH`/`NAGAD`
   - delivery record with zone snapshot
9. `setProducts/setCustomers/setOrders` + `saveToBackend({ products, customers, orders, nextInvoiceSequence })` so the order survives restarts and appears in admin on any device
10. Clear the cart for cart-based checkout or clear buy-now item for direct buys
11. Set `activeConfirmedOrder` for confirmation page rendering

Payment statuses created at checkout:

- `COD` => `PENDING`
- `BKASH` / `NAGAD` => `AWAITING_VERIFICATION`

Customer phone normalization is important because tracking and review verification are phone-based. The app intentionally treats phone numbers as normalized strings to match user history reliably.

### 4.4 Order state machine and invoice generation

Allowed transitions are defined in `transitionOrderStatus()`:

```ts
PENDING -> [CONFIRMED, CANCELLED]
CONFIRMED -> [PROCESSING, CANCELLED]
PROCESSING -> [SHIPPED, CANCELLED]
SHIPPED -> [OUT_FOR_DELIVERY]
OUT_FOR_DELIVERY -> [DELIVERED]
DELIVERED -> [RETURN_REQUESTED]
CANCELLED -> []
RETURN_REQUESTED -> [RETURN_APPROVED, RETURN_REJECTED]
RETURN_APPROVED -> []
RETURN_REJECTED -> []
```

Invoice generation rules:

- If the order transitions to `CONFIRMED`, `PROCESSING`, or `DELIVERED` and no `invoice` exists, one is created
- Invoice numbering uses `generateInvoiceNumber(nextInvoiceSequence)` with `seq+1` computed synchronously (never `setSeq` inside another updater)
- The sequence is stored in `goodzeed_store_inv_seq` localStorage **and** `nextInvoiceSequence` in `data/store.json` (max-wins on hydration)
- Every transition/verify/payment/delivery/note/invoice mutation calls `persistOrders(updatedOrders, seq)` → `saveToBackend({ orders, nextInvoiceSequence })`
- `reprintedCount` increments whenever a reprint is generated
- `AdminOrders` is defensive: optional-chaining on `payment`/`delivery`/`items`/`internalNotes` + invoice button uses the fresh return value `setInvoiceOrder(fresh || o)`
- `updateOrderStatus` wraps `transitionOrderStatus` returning `{ success, error }` shape
- `addOrderInternalNote` adds notes to `internalNotes[]` array and calls `persistOrders`

### 4.5 Admin authentication and authorization logic

The admin gate is very intentionally lightweight. The portal lives at the
obscured path `ADMIN_PORTAL_PATH = '/gz-panel-7392'` (single source of truth in
`StoreContext.tsx`) instead of the guessable `/admin`, and `loginAdmin`
accepts exactly one operator username + password pair (defined once in
`ADMIN_CREDENTIALS` — no demo backdoors, no 1-click login):

```ts
export const ADMIN_CREDENTIALS = {
  username: 'goodzeed-admin',
  password: 'cAK9-Sxo3LfyKLhoe'
};

const loginAdmin = (email, pass) => {
  const isMatch =
    cleanEmail === ADMIN_CREDENTIALS.username &&
    cleanPass === ADMIN_CREDENTIALS.password;
  if (isMatch) {
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS).toISOString();
    const user: AdminUser = {
      ...INITIAL_ADMIN,
      lastLoginAt: new Date().toISOString(),
      sessionToken,
      expiresAt
    };
    setAdminUser(user);
    saveAdminSession(user);
    return true;
  }
  return false;
};
```

The login form ships with empty fields, `autocomplete="off"` /
`autocomplete="new-password"`, and no prefilled or displayed credentials, so
browsers do not offer to save a default password.

Admin sessions are stored in `sessionStorage` (tab-local) with an 8-hour expiry, never in localStorage or the backend. This prevents cross-browser session bleed.

This is a client-side login gate only. It is not secure for production. The app is meant to be a front-end demo or internal tool, not a hardened production admin system.

Real production requirement:

- Use a backend auth service with secure password hashing, server-side sessions or JWT
- Store admin credentials in a secure DB service
- Add authorization middleware on every admin API
- Never trust browser-local state as the sole source of admin access

### 4.6 HTML sanitizer allow-list rules

`src/utils/sanitizer.ts` strips unsafe content before storing CMS custom HTML.

Allowed tags:

```ts
[p, div, span, h1, h2, h3, h4, h5, h6,
 ul, ol, li, a, img, b, i, em, strong,
 br, hr, blockquote, table, thead, tbody, tr, th, td,
 figure, figcaption, section]
```

Allowed attributes:

- For `a`: `href`, `title`, `target`, `rel`, `class`, `id`
- For `img`: `src`, `alt`, `title`, `width`, `height`, `loading`, `class`, `id`
- Global: `class`, `id`, `aria-hidden`, `aria-label`

Blocked behavior:

- Event handlers (`onload`, `onclick`, etc.) are removed
- `javascript:`, `vbscript:`, `data:text/html` in `href`/`src` are stripped
- `script`, `style`, `iframe`, `object`, `embed`, and `link` tags are removed
- Dangerous raw HTML is sanitized before saving homepage sections or landing page custom blocks

---

## 5. CMS & Marketing Engine Specs

### 5.1 Homepage CMS section types

Current homepage section types in `SectionType` include:

- `HERO`
- `TRUST_STRIP`
- `SHOP_BY_CATEGORY` / `CATEGORIES`
- `FEATURED_PRODUCTS`
- `BEST_SELLERS`
- `PROMO_BANNER`
- `WHY_GOODZEED`
- `SOURCE_STORY`
- `FEATURED_COLLECTION`
- `REVIEWS`
- `BRAND_STORY`
- `FINAL_CTA`

The render order in `App.tsx` is priority-based and then fallback-sorted by `sortOrder`.

Priority order currently used:

```ts
HERO => 1
SHOP_BY_CATEGORY / CATEGORIES => 2
TRUST_STRIP => 3
FEATURED_PRODUCTS / BEST_SELLERS => 4
default => 10
```

This means the app keeps the homepage visually stable while still allowing manual ordering and section toggles.

### 5.2 Homepage section CRUD operations

Context provides these methods:

- `addHomepageSection(section)`
- `updateHomepageSection(id, partial)`
- `toggleHomepageSection(id)`
- `deleteHomepageSection(id)`
- `reorderHomepageSections(reordered)`

The sanitizer is applied before persistence, so `customHtml` is sanitized automatically.

The UI supports:

- enable/disable toggle
- sorting/reordering by drag/drop or sequence order
- custom HTML sections
- optional CTA text and links
- legacy hero fields retained for compatibility

### 5.3 Hero carousel and media manager

The hero experience uses `HeroCarousel` (Swiper-based) and supports both multiple media items and legacy single media fields.

`HeroMediaItem` fields include per-slide overrides:

```ts
{
  id: string;
  type: 'image' | 'video';
  url: string;
  altText?: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  videoSource?: 'direct' | 'youtube' | 'vimeo';
  // Per-slide overrides:
  badge?: string; subtitle?: string; description?: string;
  ctaText?: string; ctaLinkType?: 'shop'|'category'|'product'|'cms'|'custom';
  ctaProductSlug?: string; ctaCategorySlug?: string; ctaLandingSlug?: string; ctaCustomUrl?: string;
  secondaryCtaText?: string; secondaryCtaLinkType?: HeroCtaLinkType | 'track-order';
  secondaryCtaProductSlug?: string; secondaryCtaCategorySlug?: string; secondaryCtaLandingSlug?: string; secondaryCtaCustomUrl?: string;
  overlay?: 'light' | 'medium' | 'dark';
  status?: 'draft' | 'published';
  advancedHtml?: string;
}
```

Media handling rules:

- Uploaded files can be image or video
- Uploaded media is POSTed to `/api/upload` and stored as `/uploads/...` URLs (never base64 data URLs — see §6.1)
- Videos can also be remote YouTube/Vimeo URLs
- `detectMediaType()` determines image vs video from URL or MIME type
- `parseVideoUrl()` returns `{ type: 'youtube' | 'vimeo' | 'direct', embedUrl, videoId?, thumbnailUrl? }` — normalizes YouTube (watch/embed/shorts/youtu.be), Vimeo, and direct video URLs into embed-ready URLs
- `normalizeHeroMedia()` converts old `heroImageUrl`, `mediaUrl`, and `heroVideoUrl` to a modern `heroMedia[]` array
- Hero slides carry per-slide CTA overrides resolved by `resolveSlideCtaInfo()` / `resolveSlideSecondaryCtaInfo()` with `validateCtaUrl()` guarding custom URLs
- The `PROMO_BANNER` section type has custom rendering in `App.tsx` with a "Seasonal Harvest" badge, heading, body text, CTA button, and optional media image

Recommended media sizing:

- Image: 1920×1080 recommended, any ratio accepted, max local upload ~5MB to 10MB depending on implementation
- Video: MP4/WebM or YouTube/Vimeo URL
- The presentation uses CSS `object-fit: cover` and `object-position: center` to fill any container without distortion

### 5.4 Product media manager

The app supports product-level media arrays with multi-image and multi-video support.

Rules:

- `Product.images` is intentionally kept in sync with `Product.media`
- `syncLegacyImages(media)` converts media list to only image URLs for legacy consumers
- `normalizeProductMedia(product)` will prefer `product.media` and gracefully fallback to `product.images` plus `product.videoUrl`
- `ProductMediaManager` supports:
  - drag-and-drop upload
  - order reordering
  - video thumbnail extraction
  - URL-based media insertion
  - YouTube/Vimeo detection

A product record can therefore survive both old and new schema conventions.

### 5.5 Dynamic landing page builder

Landing pages are stored as `LandingPage[]` and each page contains blocks with `blockType` and `content`.

Landing page metadata fields:

- `slug`
- `title`
- `seoTitle`
- `seoDescription`
- `socialShareImage`
- `facebookPixelId`
- `googleAnalyticsId`
- `countdownEndsAt`
- `isPublished`
- `isNoIndex`
- `publishedAt`
- `blocks`
- `createdAt`

The app accepts block types such as:

- `HERO`
- `PRODUCT_SHOWCASE`
- `PURCHASE_SECTION`
- `IMAGE`
- `VIDEO`
- `TEXT`
- `BENEFITS`
- `TESTIMONIALS`
- `FAQ`
- `CTA`
- `TRUST_SECTION`
- `CUSTOM_HTML`
- `COUNTDOWN_TIMER`
- `QUICK_ORDER_FORM`

For `CUSTOM_HTML`, the data is sanitized before saving by `sanitizeHtml()` and stored in `sanitizedHtml`.

### 5.6 Product search

`src/utils/productSearch.ts` provides a lightweight, dependency-free search system:

- `normalizeSearchText(text)` — normalizes text for matching
- `tokenizeSearchText(text)` — tokenizes into searchable units
- `buildProductSearchIndex(products)` — precomputes lowercase blobs + token sets
- `searchIndex(query, index)` — searches the precomputed index
- `searchProducts(query, products)` — main search entry point
- `getSearchSuggestions(query, products)` — autocomplete suggestions
- `POPULAR_SEARCHES` — default popular search terms
- `useDebouncedValue(value, delay)` — debounced search hook

The search uses token-based matching with AND semantics, typo tolerance via bounded Levenshtein distance, and result capping for performance.

---

## 6. File Uploads & Persistent Storage Solution

### 6.1 What the app currently does

Uploads go to disk via the backend — no base64 storage:

- `MediaUploadInput` POSTs `FormData(file)` to `/api/upload` and stores the returned `/uploads/<ts>-<rand>-<name>` URL via `onChange`.
- `HeroMediaManager` POSTs each image/video to `/api/upload`; on failure it surfaces an error and skips the file (no base64 fallback — data URLs would exceed the ~5MB localStorage quota and bloat `store.json` saves).
- `ProductMediaManager` does the same (2MB image / 15MB video limits); failures alert `make sure backend is running` instead of falling back to `FileReader`/`blob:` URLs (which never survive reloads).
- `server/apiRouter.js` (multer, 50MB limit) writes to `public/uploads/`, served statically in both dev (`apiServerPlugin` `/uploads` static) and prod (`server.js` `express.static(publicDir)`).
- **New**: Uploaded files are also mirrored to `src/assets/uploads/` via `fs.copyFileSync()` so Vite bundles them and Git tracks them.

This means:

- local uploads persist on disk and survive server restarts
- records store only short `/uploads/...` URL strings
- state survives reload via `data/store.json` + localStorage cache
- media is visible on any browser/device hitting the same backend
- uploads are also available in static builds via `src/assets/uploads/`

### 6.2 LocalStorage and backend persistence reality

Two layers in `StoreContext`:

```ts
localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value)); // cache via useEffect
saveToBackend({ settings, products, orders, ... }); // source of truth via POST /api/store
```

`saveToBackend` checks `resp.ok`, toasts `Save failed (server X)` on failure, and warns when the JSON payload exceeds ~4.5MB (signal of accidental base64 bloat). All settings/catalog/order/CMS/review mutations call it synchronously after `setX` — never inside a `setState` updater.

### 6.3 How media + data survive server restarts

1. Media: `POST /api/upload` → `public/uploads/<file>` + `src/assets/uploads/<file>` → store `/uploads/...` URL in `Product.media[]`, `HomepageSection.heroMedia[]`, `mediaUrl`, `settings.faviconPath`, etc.
2. Data: every mutation `POST /api/store` → atomic `store.json.tmp-<ts>` + `rename` into `data/store.json` (merge top-level keys, deep-merge `settings`), **also** syncs to `src/data/storeData.json.tmp-<ts>` + `rename`.
3. Hydration: `GET /api/store` on mount, merged by id with local cache. Falls back to `STORE_DATA` from `src/data/storeData.json` if backend is unreachable (e.g., static hosting).
4. Watcher ignores `data/` and `public/uploads/` so saves/uploads never trigger HMR reloads.

### 6.4 Asset resolution (`assetHelper.ts`)

`src/utils/assetHelper.ts` provides `getAssetUrl(path)` which resolves asset URLs using Vite's `import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,svg,gif,mp4,webm,avif}', { eager: true })`. This ensures that images uploaded to `src/assets/uploads/` (and thus bundled by Vite) resolve correctly in both development and production (e.g., Netlify static hosting). Also provides `resolveObjectAssets<T>(obj)` for bulk normalization of object fields containing asset paths.

### 6.5 Cloudinary or S3 replacement pattern (optional future)

If disk storage outgrows a single server, keep the same contract and swap the adapter:

```ts
interface UploadResult {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}
```

```ts
const uploadFileToCloud = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/uploads', { method: 'POST', body: formData });
  const payload = await response.json();
  return payload.url;
};
```

No data-model change is needed because the app already expects URL strings for images and video.

### 6.6 Production storage checklist

- Keep `/api/upload` authenticated if the admin portal becomes public (currently local-first)
- Never store raw base64 in records — always `/uploads/...` or remote URLs
- `data/store.json` is a single-file JSON DB: back it up, and migrate to SQLite/Postgres if order volume grows
- `src/data/storeData.json` is the tracked seed data source: keep it updated with the latest persisted state for static builds
- Add cleanup policy for orphaned uploads
- Use CDN caching for product and hero media

---

## 7. AI Support System

### 7.1 Overview

The app includes a built-in AI support chat system powered by Google Gemini. The AI assistant is store-aware, using a dynamic system prompt built from live store data (products, categories, delivery zones, settings, policies).

### 7.2 Frontend components

- `src/components/support/SupportWidget.tsx` — Floating widget on all storefront views, provides chat and contact form
- `src/components/support/AIChatDrawer.tsx` — Lazy-loaded AI chat interface
- `src/components/support/ContactFormModal.tsx` — Contact form for non-AI support

The `SupportWidget` derives `productContext` (when a product modal is open) and `pageContext` (checkout, product, order, or general) to feed into the AI conversation.

### 7.3 Backend endpoint

`POST /api/support/ai` in `server/apiRouter.js`:

- **Rate limiting**: 20 requests/minute per IP (in-memory Map with 5-minute cleanup)
- **Model**: `gemini-3.6-flash`
- **System prompt**: Built dynamically from live `storeData.json` including store info, payment methods, categories, products, delivery zones, return/cancellation/refund policies, and FAQ
- **Order lookup**: If `storeContext.orderLookup` contains `phone` + `orderNumber`, the server finds the matching order and includes safe, non-sensitive order details in the prompt
- **Product context**: If `storeContext.currentProduct` is provided, the product details are included in the prompt
- **Response**: Returns `{ reply, orderFound, orderNumber }`

### 7.4 Store settings for AI

`StoreSettings` includes AI-specific fields:

- `aiAssistantEnabled` — master toggle for the AI chat option
- `aiWelcomeMessage` — opening message for the chat panel
- `whatsappSupportNumber` — WhatsApp support number
- `supportHours` — human-readable support hours
- `returnPolicy`, `cancellationPolicy`, `refundPolicy`, `supportFAQ` — policy text fed to the AI

---

## 8. Replicability Checklist & Step-by-Step Build Guide

### 8.1 Minimum setup checklist

Before building the project from scratch, ensure:

- Node.js 18+ is installed
- npm is available
- The repo is initialized with `npm install`
- `.env.local` or `.env` is created when adding real API integrations
- No additional backend or DB is required to run the frontend in a demo configuration

### 8.2 Exact bootstrap sequence

```bash
npm install
cp .env.example .env.local
# Add values if needed for local secrets
npm run dev            # dev with API: vite --port=3000 --host=0.0.0.0 + /api/* + /uploads
```

Then open:

- Storefront: `http://localhost:3000/`
- Admin: `http://localhost:3000/gz-panel-7392`
- Health: `http://localhost:3000/api/health`
- Snapshot: `http://localhost:3000/api/store`
- AI Support: `http://localhost:3000/api/support/ai` (POST with messages + storeContext)

Prod:

```bash
npm run build
npm run start:server   # Express :7392 serving dist/ + public/ + /api + SPA catch-all
```

Then open `http://localhost:7392/` and `http://localhost:7392/gz-panel-7392`. Rebuild `dist/` after frontend changes before `start:server`, or prod will serve stale JS.

### 8.3 Build and validation commands

```bash
npm run lint
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

### 8.4 From-scratch replication workflow

1. Initialize a Vite React TypeScript app.
2. Install React Router, Tailwind, Lucide, Express, and Multer.
3. Add `App.tsx` with split storefront/admin route trees and `SupportWidget`.
4. Create `StoreContext.tsx` with dual persistence (localStorage cache + `saveToBackend` to `/api/store`), sync-computed mutations, merge-by-id hydration, sessionStorage admin sessions, and all action methods including support tickets.
5. Create `src/data/storeData.json` with all seed data (settings, admin, categories, products, orders, customers, zones, CMS, reviews, support tickets, invoice sequence).
6. Create `src/data/seedData.ts` that imports `storeData.json` and exports `STORE_DATA` + `INITIAL_*` constants.
7. Add the domain model contract in `src/types/index.ts` (including `Subcategory`, `SupportTicket`, `SupportStatus`, `HeroCtaLinkType`).
8. Implement `src/utils/assetHelper.ts` with `getAssetUrl()` and `resolveObjectAssets()`.
9. Implement `src/utils/productSearch.ts` with the full search index.
10. Implement backend: `server/apiRouter.js` (`/api/health`, `/api/upload` to `public/uploads/` + `src/assets/uploads/`, `/api/store` to `data/store.json` + `src/data/storeData.json`, `/api/support/ai` with Gemini integration and rate limiting), `server.js` prod static server with SPA catch-all, and `apiServerPlugin()` in `vite.config.ts` for dev.
11. Implement storefront components:
    - header + footer + mobile tab bar
    - hero carousel (Swiper via `HeroCarousel`)
    - search autocomplete
    - category grid
    - featured products / best sellers
    - product detail modal
    - shop view
    - cart drawer
    - checkout view
    - confirmation page
    - order tracking view
    - trust strip / brand story / testimonials / FAQ sections
    - landing page view
    - support widget (chat + contact form)
12. Implement admin components:
    - login screen
    - dashboard
    - orders manager
    - product manager
    - category manager (with toggle/reorder/delete)
    - inventory manager
    - customer list
    - delivery zone manager
    - sales and marketing manager (with homepage hero and landing campaigns tabs)
    - reviews manager
    - settings manager
    - support ticket manager
13. Implement media helpers in `src/utils/mediaUtils.ts`, asset helpers in `src/utils/assetHelper.ts`, HTML sanitizer in `src/utils/sanitizer.ts`, and formatters in `src/utils/formatters.ts`.
14. Add print CSS in `src/index.css` for invoice printing.
15. Wire everything through context so the same state drives both storefront and admin modules.
16. Enforce persistence invariants:
    - mutations compute synchronously, then `saveToBackend` (never inside updaters)
    - uploads store only `/uploads/...` URLs, never base64
    - hydration merges by id, normalizes orders, sorts newest-first
    - admin sessions use `sessionStorage` with 8-hour expiry
    - `src/data/storeData.json` and `src/assets/uploads/` stay in sync with runtime state
17. Test basic storefront flow:
    - add product to cart
    - checkout with COD/Bkash/Nagad
    - confirm order generates order number and invoice
    - track by phone/order number
    - review moderation and pending approvals
    - search products via autocomplete
    - open AI support chat
18. Test admin flow:
    - log in
    - update stock
    - change order status
    - verify payment
    - edit homepage sections and landing blocks
    - manage support tickets
    - manage categories (toggle/reorder/delete)

### 8.5 Zero-missing-features checklist

To reproduce the app faithfully, confirm the implementation contains these features:

- public storefront route with home/shop/category/checkout/confirmation/track-order/landing states
- admin route with auth gate and separate layouts (path `/gz-panel-7392`)
- product catalog with variant pricing and stock
- cart and buy-now checkout flows with backend-persisted orders/customers/stock
- phone normalization and order tracking
- order status transitions, payment verification, and invoice generation (all persisted)
- homepage CMS section editing and ordering (persisted to `data/store.json`)
- media upload via `/api/upload` to `public/uploads/` for hero + product media (no base64)
- upload mirroring to `src/assets/uploads/` and state sync to `src/data/storeData.json`
- landing page block editor with custom HTML sanitization
- dual persistence: localStorage cache + `data/store.json` source of truth
- print-friendly invoice modal
- mobile-friendly responsive storefront and admin shell
- **AI support chat** (`POST /api/support/ai` with Gemini `gemini-3.6-flash`, rate limiting, store-aware system prompt)
- **product search** with autocomplete (`productSearch.ts`)
- **support tickets** (CRUD in admin, submit from storefront)
- **sessionStorage-based admin sessions** with 8-hour expiry
- **asset resolution** via `assetHelper.ts` for `src/assets/` bundled images

### 8.6 Important reality check for developers

This project is a local-first E-commerce stack with a single-file JSON backend (`data/store.json`) and disk uploads (`public/uploads/`). It is suitable for demos, internal tools, and low-volume single-server deployments. For multi-server / serverless production, the next layer should be:

- real user auth (replace client-side admin gate)
- database persistence (SQLite/Postgres instead of `store.json`)
- remote object storage (S3/Cloudinary) behind the same `/api/upload` contract
- authorization middleware on every admin API
- payment gateway webhooks + event-driven status updates

Never trust browser-local state as the sole source of admin access or order truth — the backend file is authoritative.

---

## Final Conclusion

This repository is a polished local-first GoodZeed storefront and admin platform with an Express + JSON-file backend, AI support chat, and asset mirroring for static builds. Its key architectural ideas are:

- The entire business domain is represented in a central `StoreContext`
- Cached in browser storage (localStorage for data, sessionStorage for admin sessions)
- Persisted to `data/store.json` via `saveToBackend`, with `src/data/storeData.json` as the tracked seed data source
- Media on disk in `public/uploads/` with mirroring to `src/assets/uploads/`
- AI support via `POST /api/support/ai` with a store-aware dynamic system prompt
- Split public/admin route architecture with the obscured `/gz-panel-7392` path

To replicate it faithfully, the exact implementation should preserve:

- split public/admin route architecture
- dual persistence: localStorage cache + `data/store.json` source of truth, merge-by-id hydration
- sync-computed mutations (pure updaters) + `saveToBackend` with `resp.ok` checks
- sessionStorage-based admin sessions with 8-hour expiry
- product variant stock and order snapshot semantics with unique order numbers and correct customer links
- CMS-driven homepage and landing page content persisted across restarts
- `/api/upload` disk uploads only (no base64/blob fallbacks), mirrored to `src/assets/uploads/`
- hero/product media normalization and backward compatibility
- client-side sanitization rules for custom HTML blocks
- print-friendly invoice flow
- product search with autocomplete
- AI support chat with Gemini integration
- upload mirroring and state sync to `src/data/storeData.json` for static builds

That is the complete architecture needed to rebuild the app from scratch without missing the core gameplay, domain logic, or marketing engine behavior.
