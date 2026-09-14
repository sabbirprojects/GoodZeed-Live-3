import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { HomepageSection, HeroMediaItem, LandingPage, LandingPageBlock } from '../types';
import { deleteMediaFromStorage } from './storageService';
import { ensureAdminSupabaseAuth } from './authService';

export const fetchHomepageSections = async (): Promise<HomepageSection[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: sections, error: sErr } = await supabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true });

    if (sErr) throw sErr;

    const { data: heroMedia, error: hmErr } = await supabase
      .from('hero_media_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (hmErr) throw hmErr;

    const mediaMap = new Map<string, HeroMediaItem[]>();
    for (const m of (heroMedia || [])) {
      const item: HeroMediaItem = {
        id: m.id,
        type: m.type,
        url: m.url,
        altText: m.alt_text || undefined,
        title: m.title || undefined,
        caption: m.caption || undefined,
        thumbnailUrl: m.thumbnail_url || undefined,
        videoSource: m.video_source || undefined,
        badge: m.badge || undefined,
        subtitle: m.subtitle || undefined,
        description: m.description || undefined,
        ctaText: m.cta_text || undefined,
        ctaLinkType: m.cta_link_type || undefined,
        ctaProductSlug: m.cta_product_slug || undefined,
        ctaCategorySlug: m.cta_category_slug || undefined,
        ctaLandingSlug: m.cta_landing_slug || undefined,
        ctaCustomUrl: m.cta_custom_url || undefined,
        secondaryCtaText: m.secondary_cta_text || undefined,
        secondaryCtaLinkType: m.secondary_cta_link_type || undefined,
        secondaryCtaProductSlug: m.secondary_cta_product_slug || undefined,
        secondaryCtaCategorySlug: m.secondary_cta_category_slug || undefined,
        secondaryCtaLandingSlug: m.secondary_cta_landing_slug || undefined,
        secondaryCtaCustomUrl: m.secondary_cta_custom_url || undefined,
        overlay: m.overlay || undefined,
        status: m.status || 'published',
        advancedHtml: m.advanced_html || undefined
      };
      if (!mediaMap.has(m.homepage_section_id)) {
        mediaMap.set(m.homepage_section_id, []);
      }
      mediaMap.get(m.homepage_section_id)!.push(item);
    }

    return (sections || []).map(s => ({
      id: s.id,
      sectionType: s.section_type,
      title: s.title,
      sortOrder: s.sort_order,
      isEnabled: s.is_enabled,
      heading: s.heading || undefined,
      subtitle: s.subtitle || undefined,
      bodyText: s.body_text || undefined,
      ctaLabel: s.cta_label || undefined,
      ctaLink: s.cta_link || undefined,
      mediaUrl: s.media_url || undefined,
      badge: s.badge || undefined,
      customHtml: s.custom_html || undefined,
      heroHeadline: s.hero_headline || undefined,
      heroBengaliTitle: s.hero_bengali_title || undefined,
      heroDescription: s.hero_description || undefined,
      heroCtaText: s.hero_cta_text || undefined,
      heroCtaCategorySlug: s.hero_cta_category_slug || undefined,
      heroSecondaryCtaText: s.hero_secondary_cta_text || undefined,
      heroImageUrl: s.hero_image_url || undefined,
      heroVideoUrl: s.hero_video_url || undefined,
      heroMedia: mediaMap.get(s.id) || []
    }));
  } catch (err) {
    console.warn('[cmsService] fetchHomepageSections fallback:', err);
    return null;
  }
};

export const saveHomepageSection = async (sec: HomepageSection): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    // Authenticate admin session so RLS policies permit management of homepage sections & hero slides
    await ensureAdminSupabaseAuth();

    const { error: sErr } = await supabase.from('homepage_sections').upsert({
      id: sec.id,
      section_type: sec.sectionType,
      title: sec.title,
      sort_order: sec.sortOrder,
      is_enabled: sec.isEnabled,
      heading: sec.heading || null,
      subtitle: sec.subtitle || null,
      body_text: sec.bodyText || null,
      cta_label: sec.ctaLabel || null,
      cta_link: sec.ctaLink || null,
      media_url: sec.mediaUrl || null,
      badge: sec.badge || null,
      custom_html: sec.customHtml || null,
      hero_headline: sec.heroHeadline || null,
      hero_bengali_title: sec.heroBengaliTitle || null,
      hero_description: sec.heroDescription || null,
      hero_cta_text: sec.heroCtaText || null,
      hero_cta_category_slug: sec.heroCtaCategorySlug || null,
      hero_secondary_cta_text: sec.heroSecondaryCtaText || null,
      hero_image_url: sec.heroImageUrl || null,
      hero_video_url: sec.heroVideoUrl || null,
      updated_at: new Date().toISOString()
    });

    if (sErr) throw sErr;

    // Sync hero slides (delete removed slides, upsert remaining slides)
    const { data: existingSlides } = await supabase
      .from('hero_media_items')
      .select('id, url')
      .eq('homepage_section_id', sec.id);

    const currentSlides = sec.heroMedia || [];
    const remainingSlideIds = new Set(currentSlides.map(s => s.id));

    // Delete removed slides from hero_media_items table and goodzeed-media bucket
    const toDelete = (existingSlides || []).filter(s => !remainingSlideIds.has(s.id));
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(s => s.id);
      const { error: delErr } = await supabase.from('hero_media_items').delete().in('id', deleteIds);
      if (delErr) {
        console.error('[cmsService] Error deleting from hero_media_items:', delErr);
      }
      for (const slide of toDelete) {
        if (slide.url) await deleteMediaFromStorage(slide.url).catch(() => {});
      }
    }

    // Upsert remaining slides
    if (currentSlides.length > 0) {
      let idx = 0;
      const slides = currentSlides.map(hm => ({
        id: hm.id,
        homepage_section_id: sec.id,
        type: hm.type,
        url: hm.url,
        alt_text: hm.altText || null,
        title: hm.title || null,
        caption: hm.caption || null,
        thumbnail_url: hm.thumbnailUrl || null,
        video_source: hm.videoSource || null,
        badge: hm.badge || null,
        subtitle: hm.subtitle || null,
        description: hm.description || null,
        cta_text: hm.ctaText || null,
        cta_link_type: hm.ctaLinkType || null,
        cta_product_slug: hm.ctaProductSlug || null,
        cta_category_slug: hm.ctaCategorySlug || null,
        cta_landing_slug: hm.ctaLandingSlug || null,
        cta_custom_url: hm.ctaCustomUrl || null,
        secondary_cta_text: hm.secondaryCtaText || null,
        secondary_cta_link_type: hm.secondaryCtaLinkType || null,
        secondary_cta_product_slug: hm.secondaryCtaProductSlug || null,
        secondary_cta_category_slug: hm.secondaryCtaCategorySlug || null,
        secondary_cta_landing_slug: hm.secondaryCtaLandingSlug || null,
        secondary_cta_custom_url: hm.secondaryCtaCustomUrl || null,
        overlay: hm.overlay || null,
        status: hm.status || 'published',
        advanced_html: hm.advancedHtml || null,
        sort_order: idx++
      }));
      await supabase.from('hero_media_items').upsert(slides);
    }

    return true;
  } catch (err) {
    console.error('[cmsService] saveHomepageSection error:', err);
    return false;
  }
};

export const deleteHomepageSection = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { data: slides } = await supabase
      .from('hero_media_items')
      .select('url')
      .eq('homepage_section_id', id);

    const { data: sec } = await supabase
      .from('homepage_sections')
      .select('media_url, hero_image_url, hero_video_url')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('homepage_sections').delete().eq('id', id);
    if (error) throw error;

    if (slides?.length) {
      for (const slide of slides) {
        if (slide.url) await deleteMediaFromStorage(slide.url).catch(() => {});
      }
    }
    if (sec?.media_url) await deleteMediaFromStorage(sec.media_url).catch(() => {});
    if (sec?.hero_image_url) await deleteMediaFromStorage(sec.hero_image_url).catch(() => {});
    if (sec?.hero_video_url) await deleteMediaFromStorage(sec.hero_video_url).catch(() => {});

    return true;
  } catch (err) {
    console.error('[cmsService] deleteHomepageSection error:', err);
    return false;
  }
};

export const fetchLandingPages = async (): Promise<LandingPage[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: pages, error: pErr } = await supabase
      .from('landing_pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    const { data: blocks, error: bErr } = await supabase
      .from('landing_page_blocks')
      .select('*')
      .order('sort_order', { ascending: true });

    if (bErr) throw bErr;

    const blockMap = new Map<string, LandingPageBlock[]>();
    for (const b of (blocks || [])) {
      const block: LandingPageBlock = {
        id: b.id,
        landingPageId: b.landing_page_id,
        blockType: b.block_type,
        sortOrder: b.sort_order,
        content: b.content || {},
        sanitizedHtml: b.sanitized_html || undefined
      };
      if (!blockMap.has(b.landing_page_id)) {
        blockMap.set(b.landing_page_id, []);
      }
      blockMap.get(b.landing_page_id)!.push(block);
    }

    return (pages || []).map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      seoTitle: p.seo_title || '',
      seoDescription: p.seo_description || '',
      socialShareImage: p.social_share_image || undefined,
      facebookPixelId: p.facebook_pixel_id || undefined,
      googleAnalyticsId: p.google_analytics_id || undefined,
      countdownEndsAt: p.countdown_ends_at || undefined,
      isPublished: p.is_published,
      isNoIndex: p.is_no_index,
      publishedAt: p.published_at || undefined,
      blocks: blockMap.get(p.id) || [],
      createdAt: p.created_at
    }));
  } catch (err) {
    console.warn('[cmsService] fetchLandingPages fallback:', err);
    return null;
  }
};

export const saveLandingPage = async (page: LandingPage): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { error: pErr } = await supabase.from('landing_pages').upsert({
      id: page.id,
      slug: page.slug,
      title: page.title,
      seo_title: page.seoTitle,
      seo_description: page.seoDescription,
      social_share_image: page.socialShareImage || null,
      facebook_pixel_id: page.facebookPixelId || null,
      google_analytics_id: page.googleAnalyticsId || null,
      countdown_ends_at: page.countdownEndsAt || null,
      is_published: page.isPublished,
      is_no_index: page.isNoIndex,
      published_at: page.publishedAt || null,
      created_at: page.createdAt,
      updated_at: new Date().toISOString()
    });

    if (pErr) throw pErr;

    if (page.blocks?.length) {
      const blocks = page.blocks.map(b => ({
        id: b.id,
        landing_page_id: page.id,
        block_type: b.blockType,
        sort_order: b.sortOrder,
        content: b.content || {},
        sanitized_html: b.sanitizedHtml || null
      }));
      await supabase.from('landing_page_blocks').upsert(blocks);
    }

    return true;
  } catch (err) {
    console.error('[cmsService] saveLandingPage error:', err);
    return false;
  }
};

export const deleteLandingPage = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { data: page } = await supabase.from('landing_pages').select('social_share_image').eq('id', id).single();
    const { error } = await supabase.from('landing_pages').delete().eq('id', id);
    if (!error && page?.social_share_image) {
      await deleteMediaFromStorage(page.social_share_image).catch(() => {});
    }
    return !error;
  } catch {
    return false;
  }
};
