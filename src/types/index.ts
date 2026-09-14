export type SizeUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  label: string; // e.g., "250g", "500g", "1kg", "500ml"
  sizeValue: number;
  sizeUnit: SizeUnit;
  price: number; // in BDT ৳
  salePrice?: number | null; // in BDT ৳
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
  isEnabled: boolean;
}

export type ProductMediaType = 'image' | 'video';

export interface ProductMediaItem {
  id: string;
  type: ProductMediaType;
  url: string; // Image URL, base64 data URI, or video URL (MP4/WebM, YouTube, Vimeo)
  altText?: string;
  title?: string;
  thumbnailUrl?: string; // Optional custom poster/thumbnail for video slides
  videoSource?: 'direct' | 'youtube' | 'vimeo';
}

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
  images: string[]; // Legacy: always kept in sync with media[] for backwards compatibility
  media?: ProductMediaItem[]; // Enhanced: multi-image and video list
  videoUrl?: string; // Legacy: optional primary video URL
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
  /**
   * Optional trust/verification label shown on the product card below the title.
   * e.g. "100% Pure & Lab Verified", "USDA Organic Certified", "Lab Tested".
   * When absent the trust row is hidden — no fallback is hardcoded.
   */
  trustLabel?: string;
  /**
   * Optional free-text badge override shown on the product card image.
   * e.g. "ORGANIC", "LIMITED", "SALE". Takes priority over isBestSeller / isNew / isFeatured.
   * Leave empty to use the automatic boolean-flag badge.
   */
  customBadge?: string;
}

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

export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_VERIFICATION'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type DeliveryMethod = 'OWN_DELIVERY' | 'COURIER';

export type DeliveryStatus =
  | 'NOT_DISPATCHED'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED';

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
  invoiceNumber: string; // e.g. GZ-INV-000101
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
  orderNumber: string; // e.g. GZ-2026-1001
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
  ctaProductSlug?: string;   // Used when ctaLinkType === 'product'
  ctaCategorySlug?: string;  // Used when ctaLinkType === 'category'
  ctaLandingSlug?: string;   // Used when ctaLinkType === 'cms'
  ctaCustomUrl?: string;     // Used when ctaLinkType === 'custom'

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
  // Hero slide overrides (used when sectionType === 'HERO')
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

  // ── Support & AI Configuration ──────────────────────────────────────────
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

// ── Support Tickets ──────────────────────────────────────────────────────────

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

