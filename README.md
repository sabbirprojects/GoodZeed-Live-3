# GoodZeed — 100% Pure Natural Food Storefront

<div align="center">
<img width="1200" height="475" alt="GoodZeed Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

Bangladesh's dedicated D2C platform for natural, unadulterated everyday foods. Built with React 19, Vite, TypeScript, and Tailwind CSS v4.

---

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
cp .env.local.example .env.local
# Then edit .env.local and set GEMINI_API_KEY=your_key_here

# 3. (Optional, recommended) Start the upload server in a separate terminal so uploaded media persist across refreshes and server restarts
#    This saves uploaded files under public/uploads and exposes them at /uploads/<filename>
npm run start:server

# 4. Start the dev server (frontend)
npm run dev
```

The app will be available at **http://localhost:3000**

---

## 🌐 Route Structure

The application is split into two **completely separate** route trees so that no admin UI is ever exposed to regular customers.

| URL | Component | Audience |
|-----|-----------|----------|
| `http://localhost:3000/` | `StorefrontAppContent` | Public customers |
| `http://localhost:3000/gz-panel-7392` | `AdminAppContent` | Authenticated admins only |

### Storefront (`/`)
All customer-facing views are managed via a `currentView` context state:

| View key | Description |
|----------|-------------|
| `home` | CMS-driven homepage (hero, categories, featured products, etc.) |
| `shop` | Full product catalog with filters |
| `category` | Products filtered by category |
| `checkout` | Guest checkout (COD / bKash / Nagad) |
| `confirmation` | Post-order success + invoice |
| `track-order` | Live order tracking by phone number |
| `landing` | Campaign landing pages (e.g., Sundarban Honey) |

### Admin Panel (`/gz-panel-7392`)
- Navigate directly to **http://localhost:3000/gz-panel-7392**
- Unauthenticated users are shown the **AdminLogin** screen immediately
- After login, admins access the full management dashboard

**Admin tabs available:**

| Tab | Description |
|-----|-------------|
| Dashboard | KPIs, recent orders, quick actions |
| Orders | View, filter, update order statuses |
| Products | Add/edit/delete products & variants |
| Categories | Manage product categories |
| Inventory | Stock level management |
| Customers | Customer list & order history |
| Delivery Zones | Configure delivery areas & charges |
| Homepage CMS | Edit homepage sections, banners, content |
| Landing Pages | Manage campaign pages |
| Reviews | Moderate customer reviews |
| Settings | Store info, contact, payment details |

> **Security note:** Admin route is protected by a login gate in `AdminAppContent`. No admin components are imported, rendered, or bundled into the storefront route. Regular users navigating to `/` cannot see or access any admin UI.

### Settings and Homepage Configuration

`/gz-panel-7392/settings` is the canonical Settings route. It contains both store/payment settings and the Homepage Sections CMS. The sidebar Settings item navigates to the same route; existing `/admin` navigation remains compatible because the admin shell still selects tabs through `AdminLayout`.

Homepage sections are stored as a `HomepageSection[]` in the `homepage_sections` browser storage record. `StoreContext` owns the CRUD operations: `addHomepageSection`, `updateHomepageSection`, `toggleHomepageSection`, `deleteHomepageSection`, and `reorderHomepageSections`. Existing section IDs and legacy hero fields (`heroImageUrl`, `mediaUrl`, and `heroVideoUrl`) are retained so current records and integrations remain compatible.

Custom HTML is sanitized by the context before it is persisted. Uploaded images are uploaded directly to the backend server via `/api/upload` and saved under `public/uploads/` for permanent storage, ensuring media assets retain persistent local paths across refreshes and server restarts. Enabled sections render directly from the shared context state, so Settings changes appear immediately on the storefront without a reload.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |

Set these in `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Icons | Lucide React |
| Fonts | Fraunces (serif) · Plus Jakarta Sans (sans) |
| Payments | COD · bKash · Nagad (recorded, admin-verified) |

---

## 📁 Project Structure

```
src/
├── App.tsx                  # Root: BrowserRouter splits admin portal and /*
├── main.tsx
├── index.css                # Global styles + print CSS
├── context/
│   └── StoreContext.tsx     # Global app state
├── components/
│   ├── admin/               # Admin-only components (never loaded on storefront)
│   │   ├── AdminLogin.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   ├── common/              # Shared UI (Header, Footer, Toast, etc.)
│   │   ├── Header.tsx       # Smart-scroll fixed navbar (no admin buttons)
│   │   └── ...
│   └── storefront/          # Customer-facing views
│       ├── HeroBanner.tsx
│       ├── ShopView.tsx
│       ├── CheckoutView.tsx
│       ├── OrderConfirmationView.tsx
│       ├── InvoiceModal.tsx
│       └── ...
└── types.ts
```

---

## 🖨 Invoice Printing

Clicking **"Print Official Invoice"** on the Order Confirmation page opens an invoice modal and triggers `window.print()`. The `@media print` CSS in `index.css` hides all layout elements and renders only the `#printable-invoice` container cleanly.

---

## 🎬 Hero Banner: Multi-Image Carousel & Video Handling

The GoodZeed storefront features an interactive, touch-friendly Hero Banner powered by **Swiper.js**, supporting multiple high-resolution images, video files (MP4/WebM), and video embeds (YouTube / Vimeo).

### 📐 Media Size & Format Guidelines

| Media Type | Recommended Dimensions | Max File Size | Supported Formats / Protocols |
|---|---|---|---|
| **Image** | 1920 × 1080 px (16:9 aspect ratio) | 5 MB | JPG, PNG, WebP, GIF, SVG |
| **Direct Video** | 1920 × 1080 px (16:9 aspect ratio) | 35 MB (upload) / any (URL) | MP4 (H.264/AAC), WebM |
| **Embedded Video** | 16:9 standard | N/A | YouTube (`youtube.com/watch?v=...`, `youtu.be/...`, Shorts), Vimeo (`vimeo.com/...`) |

> **Dynamic Auto-Fit Guarantee**: The storefront and admin previews dynamically accept **ANY** image aspect ratio (16:9, 4:3, square 1:1, or portrait) and ANY video resolution. Media containers use CSS `object-fit: cover` with `object-position: center`, scaling smoothly without stretching or distorting the layout.

### 🗄 Media Array Schema (`HeroMediaItem`)

The Hero Banner media array is defined in [`src/types/index.ts`](file:///Users/sabbir/Downloads/goodzeed/src/types/index.ts):

```typescript
export type HeroMediaType = 'image' | 'video';

export interface HeroMediaItem {
  id: string;                      // Unique identifier (e.g. "media-1712345678-abcde")
  type: HeroMediaType;             // 'image' | 'video'
  url: string;                     // Direct URL, base64 data URI, or video embed link
  altText?: string;                // Accessible description for screen readers and SEO
  title?: string;                  // Optional slide title override
  caption?: string;                // Optional slide caption override
  thumbnailUrl?: string;           // Optional custom poster / video thumbnail
  videoSource?: 'direct' | 'youtube' | 'vimeo'; // Platform classifier
}
```

### 🔁 Backwards Compatibility Guarantee

The system maintains 100% backward compatibility with previous single-image schemas:
- **Legacy fields retained**: `HomepageSection` continues to support `heroImageUrl`, `mediaUrl`, and `heroVideoUrl`.
- **Automatic normalization**: The helper `normalizeHeroMedia()` in `src/utils/mediaUtils.ts` automatically converts legacy single strings into a structured `HeroMediaItem[]` array if `heroMedia` is absent.
- **Bi-directional synchronization**: Saving via the Admin Sales & Marketing tab automatically updates `heroImageUrl` and `mediaUrl` with the primary slide's URL, ensuring external APIs or legacy consumers never break.

### 🔊 Video Autoplay & Viewer Controls

- Videos start in **muted autoplay** mode in compliance with modern browser autoplay policies.
- An interactive **Mute / Unmute** toggle button (`Volume2` / `VolumeX`) allows viewers to enable audio at any time.
- A **Play / Pause** toggle lets viewers pause background videos on demand.

---

## 🎨 Brand Logo & Favicon Assets

The official GoodZeed brand logo (stylized natural green leaf / drop monogram representing 'G' and 'Z' with sprout flora) is centralized for clean rendering across high-DPI screens, browser tabs, and mobile home screens.

### 📍 Asset Locations
- **Primary High-Res Logo (PNG):** [`public/logo.png`](file:///Users/sabbir/Downloads/goodzeed/public/logo.png) (512×512 transparent RGBA)
- **Public Assets Mirror:** [`public/assets/logo.png`](file:///Users/sabbir/Downloads/goodzeed/public/assets/logo.png)
- **Standard Favicon (ICO):** [`public/favicon.ico`](file:///Users/sabbir/Downloads/goodzeed/public/favicon.ico)
- **Standard Favicon (PNG):** [`public/favicon.png`](file:///Users/sabbir/Downloads/goodzeed/public/favicon.png)
- **Multi-Resolution Favicons:**
  - [`public/favicon-32x32.png`](file:///Users/sabbir/Downloads/goodzeed/public/favicon-32x32.png) (32×32)
  - [`public/favicon-16x16.png`](file:///Users/sabbir/Downloads/goodzeed/public/favicon-16x16.png) (16×16)
- **Apple Touch Icon (iOS / Safari):** [`public/apple-touch-icon.png`](file:///Users/sabbir/Downloads/goodzeed/public/apple-touch-icon.png) (180×180)
- **PWA Web App Manifest Icons:**
  - [`public/android-chrome-192x192.png`](file:///Users/sabbir/Downloads/goodzeed/public/android-chrome-192x192.png) (192×192)
  - [`public/android-chrome-512x512.png`](file:///Users/sabbir/Downloads/goodzeed/public/android-chrome-512x512.png) (512×512)
  - Manifest files: [`public/site.webmanifest`](file:///Users/sabbir/Downloads/goodzeed/public/site.webmanifest) and [`public/manifest.json`](file:///Users/sabbir/Downloads/goodzeed/public/manifest.json)
- **Reusable React Component:** [`src/components/common/BrandLogo.tsx`](file:///Users/sabbir/Downloads/goodzeed/src/components/common/BrandLogo.tsx)

### 🧩 Using the `<BrandLogo />` Component
```tsx
import { BrandLogo } from '../common/BrandLogo';

// Light background (Navbar, Checkout, Invoices)
<BrandLogo size="md" theme="light-bg" showSubtitle={true} />

// Dark background (Footer, Admin Sidebar, Mobile Top Bar)
<BrandLogo size="lg" theme="dark-bg" showSubtitle={false} />

// Icon-only badge
<BrandLogo size="sm" variant="icon" theme="light-bg" />
```

### ⚡ Cache-Busting & Replacing Favicons
Browsers aggressively cache favicons in memory and disk cache. To ensure instant updates for all users:
1. Replace `public/logo.png` with your new image (PNG, SVG, or WebP).
2. Generate/update the multi-size icons in `public/` (`favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`).
3. In [`index.html`](file:///Users/sabbir/Downloads/goodzeed/index.html), increment the cache-busting version parameter on all icon tags (e.g. change `?v=2` to `?v=3`):
   ```html
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3" />
   <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=3" />
   <link rel="shortcut icon" href="/favicon.ico?v=3" />
   <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
   <link rel="manifest" href="/site.webmanifest?v=3" />
   ```
4. Hard refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to view the newly loaded icon immediately.

---

## 🛍️ Product Media: Multi-Image & Video Handling

GoodZeed supports multiple images and product videos (MP4/WebM files or embedded YouTube/Vimeo URLs) per product.

### 📐 Product Media Guidelines
- **Recommended Aspect Ratio:** `1:1` Square (e.g. 1000×1000px, 800×800px) or `4:5` vertical.
- **Recommended Image Size:** Max 2 MB per image (PNG, JPG, WebP).
- **Video Format:** MP4 / WebM or Video URL (Max 15 MB).
- **Auto-scaling:** All media uses CSS `object-fit: contain` / `object-fit: cover` to gracefully handle any resolution without layout distortion.

### 🗄️ Product Media Schema (`ProductMediaItem`)
```typescript
export type ProductMediaType = 'image' | 'video';

export interface ProductMediaItem {
  id: string;
  type: ProductMediaType;
  url: string;              // Image URL or video URL (direct MP4 or YouTube/Vimeo)
  altText?: string;
  title?: string;
  thumbnailUrl?: string;    // Custom poster/thumbnail for video slides
  videoSource?: 'direct' | 'youtube' | 'vimeo';
}
```

### 🔁 Backwards Compatibility
- Products retain the `images: string[]` field, which is kept automatically in sync with the primary images from `media: ProductMediaItem[]`.
- The helper `normalizeProductMedia(product)` seamlessly converts legacy single/multiple image URLs into the media list if `media` is not populated.

---

## 📝 Customer Order Notes & Special Instructions Flow

1. **Checkout Capture:** Customers can provide special delivery instructions (e.g., *"Call before delivery"*, *"Leave with building reception"*) in `CheckoutView.tsx`.
2. **State & Database Storage:** The note is stored in `order.deliveryNotes` on the atomic `Order` model in `StoreContext.tsx`.
3. **Admin Visibility:** 
   - Displayed in the **Admin Orders** table with a clear highlight badge (`AdminOrders.tsx`).
   - Displayed in the **Order Details Modal** under a dedicated *Delivery & Customer Instructions* section for full operator visibility.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |

---

## 🚀 Deployment

### Production Build

```bash
npm run build
```

This creates a production build in the `dist/` directory.

### Deployment Options

The built app can be deployed to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop the `dist/` folder or use `netlify deploy`
- **Cloudflare Pages**: `npx wrangler pages deploy`
- **Traditional hosting**: Upload the `dist/` contents to your web server

### Environment Variables for Production

Ensure `GEMINI_API_KEY` is set in your production environment, as it's required for AI features.

### Custom Domain

Update your DNS settings to point to your hosting provider, and configure the custom domain in your hosting platform's dashboard.

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
# GoodZeed-Live-3
