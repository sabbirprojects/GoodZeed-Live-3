import { HeroMediaItem, HeroMediaType, HeroCtaLinkType, HomepageSection, Product, ProductMediaItem, ProductMediaType } from '../types';

/**
 * Detects whether a URL or mime type represents an image or video.
 */
export function detectMediaType(url: string, mimeType?: string): HeroMediaType {
  if (mimeType && mimeType.startsWith('video/')) {
    return 'video';
  }

  const clean = url.trim().toLowerCase();

  // Base64 video data URL
  if (clean.startsWith('data:video/')) {
    return 'video';
  }

  // Common video platforms
  if (
    clean.includes('youtube.com/') ||
    clean.includes('youtu.be/') ||
    clean.includes('vimeo.com/')
  ) {
    return 'video';
  }

  // Common video extensions
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.includes('.mp4?') ||
    clean.includes('.webm?')
  ) {
    return 'video';
  }

  return 'image';
}

/**
 * Parses video URLs to distinguish YouTube, Vimeo, and direct MP4/WebM video files.
 * Provides clean embed URLs for iframes with autoplay, mute, and loop parameters.
 */
export function parseVideoUrl(url: string): {
  type: 'youtube' | 'vimeo' | 'direct';
  embedUrl: string;
  videoId?: string;
  thumbnailUrl?: string;
} {
  const clean = url.trim();

  // YouTube detection
  // Supports: youtube.com/watch?v=XYZ, youtu.be/XYZ, youtube.com/embed/XYZ, youtube.com/shorts/XYZ
  const ytMatch = clean.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // Vimeo detection
  // Supports: vimeo.com/123456789, player.vimeo.com/video/123456789
  const vimeoMatch = clean.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1&autopause=0&playsinline=1`
    };
  }

  // Direct MP4 / WebM / blob / data URL
  return {
    type: 'direct',
    embedUrl: clean
  };
}

/**
 * Normalizes legacy single-image or single-video HomepageSection setups into
 * a modern HeroMediaItem array for complete backwards compatibility.
 */
export function normalizeHeroMedia(section?: HomepageSection | null): HeroMediaItem[] {
  if (!section) return [];

  // If already configured with multi-media items, return them
  if (Array.isArray(section.heroMedia) && section.heroMedia.length > 0) {
    return section.heroMedia.filter(item => item && item.url && item.url.trim().length > 0);
  }

  const items: HeroMediaItem[] = [];

  // Legacy heroVideoUrl fallback
  if (section.heroVideoUrl && section.heroVideoUrl.trim()) {
    items.push({
      id: 'legacy-video-1',
      type: 'video',
      url: section.heroVideoUrl.trim(),
      title: section.heroHeadline || section.heading || 'Hero Video',
      videoSource: parseVideoUrl(section.heroVideoUrl.trim()).type
    });
  }

  // Legacy heroImageUrl or mediaUrl fallback
  const legacyImageUrl = section.heroImageUrl || section.mediaUrl;
  if (legacyImageUrl && legacyImageUrl.trim()) {
    const trimmed = legacyImageUrl.trim();
    const mediaType = detectMediaType(trimmed);
    items.push({
      id: 'legacy-media-1',
      type: mediaType,
      url: trimmed,
      title: section.heroHeadline || section.heading || 'Hero Media',
      videoSource: mediaType === 'video' ? parseVideoUrl(trimmed).type : undefined
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Product Media Utilities
// ---------------------------------------------------------------------------

/**
 * Detects whether a URL/mime represents image or video.
 * Same logic as detectMediaType but returns ProductMediaType.
 */
export function detectProductMediaType(url: string, mimeType?: string): ProductMediaType {
  return detectMediaType(url, mimeType) as ProductMediaType;
}

/**
 * Converts a plain string URL into a ProductMediaItem.
 */
export function imageUrlToMediaItem(url: string, index: number): ProductMediaItem {
  const type = detectProductMediaType(url);
  const videoInfo = type === 'video' ? parseVideoUrl(url) : null;
  return {
    id: `media-${index}-${Date.now()}`,
    type,
    url,
    videoSource: videoInfo ? videoInfo.type : undefined,
    thumbnailUrl: videoInfo?.thumbnailUrl
  };
}

/**
 * Normalizes a Product into a canonical ProductMediaItem[] list.
 * Prefers product.media if present, otherwise converts product.images + optional videoUrl.
 * Falls back gracefully to an empty array so callers always get a valid array.
 */
export function normalizeProductMedia(product: Product): ProductMediaItem[] {
  // Prefer explicit media array
  if (Array.isArray(product.media) && product.media.length > 0) {
    const valid = product.media.filter(m => m && m.url && m.url.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  const items: ProductMediaItem[] = [];

  // Convert legacy images[]
  if (Array.isArray(product.images)) {
    product.images
      .filter(url => url && url.trim().length > 0)
      .forEach((url, idx) => {
        items.push(imageUrlToMediaItem(url, idx));
      });
  }

  // Append legacy videoUrl if present and not already in images
  if (product.videoUrl && product.videoUrl.trim()) {
    const videoUrl = product.videoUrl.trim();
    if (!items.some(m => m.url === videoUrl)) {
      items.push(imageUrlToMediaItem(videoUrl, items.length));
    }
  }

  return items;
}

/**
 * Returns the primary thumbnail URL for a product (first image).
 * Falls back through media[], images[], then a placeholder.
 */
export function getProductThumbnail(product: Product): string {
  // Try media[] first
  if (Array.isArray(product.media) && product.media.length > 0) {
    const first = product.media.find(m => m && m.url && m.url.trim());
    if (first) return first.thumbnailUrl || (first.type === 'image' ? first.url : '');
  }
  // Legacy images[]
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  return 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80';
}

/**
 * Syncs images[] from a ProductMediaItem[] so legacy consumers always see a valid images array.
 * Extracts image URLs (skipping videos), falling back to thumbnailUrl for video items.
 */
export function syncLegacyImages(media: ProductMediaItem[]): string[] {
  const urls = media
    .filter(m => m && m.url && m.url.trim())
    .map(m => {
      if (m.type === 'image') return m.url;
      return m.thumbnailUrl || m.url; // Use thumbnail for video items
    })
    .filter(Boolean) as string[];

  return urls.length > 0
    ? urls
    : ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'];
}

// ---------------------------------------------------------------------------
// Hero Slide CTA Resolution
// ---------------------------------------------------------------------------

export interface SlideCtaInfo {
  /** Internal view name for setCurrentView(), or null for external URL. */
  view: string | null;
  /** Category slug for setSelectedCategorySlug(), or null. */
  categorySlug: string | null;
  /** Product slug for setSelectedProductSlug(), or null. */
  productSlug: string | null;
  /** Landing page slug for setSelectedLandingSlug(), or null. */
  landingSlug: string | null;
  /** External or custom URL — open directly via window.location or anchor. */
  externalUrl: string | null;
  /** Whether to open externalUrl in a new tab. */
  openInNewTab: boolean;
}

function buildCtaInfo(
  linkType: HeroCtaLinkType | 'track-order' | undefined,
  categorySlug: string | undefined,
  productSlug: string | undefined,
  landingSlug: string | undefined,
  customUrl: string | undefined
): SlideCtaInfo {
  const empty: SlideCtaInfo = { view: null, categorySlug: null, productSlug: null, landingSlug: null, externalUrl: null, openInNewTab: false };

  if (!linkType || linkType === 'shop') {
    return { ...empty, view: 'shop' };
  }
  if (linkType === 'category') {
    return { ...empty, view: 'category', categorySlug: categorySlug || null };
  }
  if (linkType === 'product') {
    return { ...empty, view: 'product', productSlug: productSlug || null };
  }
  if (linkType === 'cms') {
    return { ...empty, view: 'landing', landingSlug: landingSlug || null };
  }
  if (linkType === 'track-order') {
    return { ...empty, view: 'track-order' };
  }
  if (linkType === 'custom' && customUrl) {
    // Open external URLs (different origin) in a new tab
    let isExternal = false;
    try {
      const u = new URL(customUrl, window.location.href);
      isExternal = u.origin !== window.location.origin;
    } catch {
      isExternal = customUrl.startsWith('http');
    }
    return { ...empty, externalUrl: customUrl, openInNewTab: isExternal };
  }
  return { ...empty, view: 'shop' };
}

/**
 * Resolves the primary CTA navigation info for a hero slide.
 * Falls back to global heroSection values when the slide has no per-slide CTA config.
 */
export function resolveSlideCtaInfo(
  slide: HeroMediaItem,
  heroSection?: HomepageSection | null
): SlideCtaInfo {
  const linkType = slide.ctaLinkType;
  if (linkType) {
    return buildCtaInfo(linkType, slide.ctaCategorySlug, slide.ctaProductSlug, slide.ctaLandingSlug, slide.ctaCustomUrl);
  }
  // Fall back to global heroSection category slug
  const globalCategorySlug = heroSection?.heroCtaCategorySlug;
  if (globalCategorySlug && globalCategorySlug.trim()) {
    return buildCtaInfo('category', globalCategorySlug, undefined, undefined, undefined);
  }
  return buildCtaInfo('shop', undefined, undefined, undefined, undefined);
}

/**
 * Resolves the secondary CTA navigation info for a hero slide.
 */
export function resolveSlideSecondaryCtaInfo(slide: HeroMediaItem): SlideCtaInfo {
  const linkType = slide.secondaryCtaLinkType;
  return buildCtaInfo(
    linkType as HeroCtaLinkType | 'track-order' | undefined,
    slide.secondaryCtaCategorySlug,
    slide.secondaryCtaProductSlug,
    slide.secondaryCtaLandingSlug,
    slide.secondaryCtaCustomUrl
  );
}

/**
 * Simple URL format validator. Returns null if valid, or an error message.
 */
export function validateCtaUrl(url: string): string | null {
  if (!url || !url.trim()) return null; // empty is fine (means not set)
  try {
    new URL(url, window.location.href);
    return null;
  } catch {
    return 'Invalid URL format. Use a full URL (https://...) or a relative path (/shop).';
  }
}

