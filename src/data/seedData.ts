import storeData from './storeData.json';
import { getAssetUrl } from '../utils/assetHelper';
import {
  StoreSettings,
  AdminUser,
  Category,
  Product,
  DeliveryZone,
  HomepageSection,
  LandingPage,
  Customer,
  Order,
  Review
} from '../types';

// Raw store data loaded directly from src/data/storeData.json
export const STORE_DATA = storeData;
export const INITIAL_LAST_UPDATED = (storeData as { lastUpdated?: string }).lastUpdated || new Date().toISOString();

export const INITIAL_SETTINGS: StoreSettings = (storeData.settings || {}) as StoreSettings;

export const INITIAL_ADMIN: AdminUser = (storeData.adminUser || {}) as AdminUser;

export const INITIAL_CATEGORIES: Category[] = Array.isArray(storeData.categories)
  ? (storeData.categories as Category[]).map(cat => ({
      ...cat,
      image: cat.image ? getAssetUrl(cat.image) : cat.image
    }))
  : [];

export const INITIAL_PRODUCTS: Product[] = Array.isArray(storeData.products)
  ? (storeData.products as Product[]).map(p => ({
      ...p,
      images: Array.isArray(p.images) ? p.images.map(img => getAssetUrl(img)) : [],
      media: Array.isArray(p.media)
        ? p.media.map(m => ({ ...m, url: getAssetUrl(m.url) }))
        : undefined
    }))
  : [];

export const INITIAL_DELIVERY_ZONES: DeliveryZone[] = Array.isArray(storeData.deliveryZones)
  ? (storeData.deliveryZones as DeliveryZone[])
  : [];

export const INITIAL_HOMEPAGE_SECTIONS: HomepageSection[] = Array.isArray(storeData.homepageSections)
  ? (storeData.homepageSections as HomepageSection[]).map(s => ({
      ...s,
      mediaUrl: s.mediaUrl ? getAssetUrl(s.mediaUrl) : s.mediaUrl,
      heroMedia: Array.isArray(s.heroMedia)
        ? s.heroMedia.map(m => ({ ...m, url: getAssetUrl(m.url) }))
        : s.heroMedia
    }))
  : [];

export const INITIAL_LANDING_PAGES: LandingPage[] = Array.isArray(storeData.landingPages)
  ? (storeData.landingPages as LandingPage[]).map(lp => ({
      ...lp,
      socialShareImage: lp.socialShareImage ? getAssetUrl(lp.socialShareImage) : lp.socialShareImage,
      blocks: Array.isArray(lp.blocks)
        ? lp.blocks.map(b => {
            if (b.content && typeof b.content === 'object') {
              const content = { ...b.content };
              if (typeof content.mediaUrl === 'string') content.mediaUrl = getAssetUrl(content.mediaUrl);
              if (typeof content.imageUrl === 'string') content.imageUrl = getAssetUrl(content.imageUrl);
              return { ...b, content };
            }
            return b;
          })
        : lp.blocks
    }))
  : [];

export const INITIAL_CUSTOMERS: Customer[] = Array.isArray(storeData.customers)
  ? (storeData.customers as Customer[])
  : [];

export const INITIAL_ORDERS: Order[] = Array.isArray(storeData.orders)
  ? (storeData.orders as Order[]).map(ord => ({
      ...ord,
      items: Array.isArray(ord.items)
        ? ord.items.map(it => ({
            ...it,
            productImageSnapshot: it.productImageSnapshot ? getAssetUrl(it.productImageSnapshot) : it.productImageSnapshot
          }))
        : []
    }))
  : [];

export const INITIAL_REVIEWS: Review[] = Array.isArray(storeData.reviews)
  ? (storeData.reviews as Review[])
  : [];

export const INITIAL_SUPPORT_TICKETS = Array.isArray((storeData as { supportTickets?: unknown[] }).supportTickets)
  ? (storeData as { supportTickets: unknown[] }).supportTickets
  : [];
export const INITIAL_INVOICE_SEQUENCE = (storeData as { nextInvoiceSequence?: number }).nextInvoiceSequence || 107;
