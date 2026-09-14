import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Category, Product, ProductVariant, ProductMediaItem } from '../types';
import { deleteMediaFromStorage } from './storageService';
import { ensureAdminSupabaseAuth } from './authService';

export const fetchCategories = async (): Promise<Category[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      sortOrder: c.sort_order,
      isEnabled: c.is_enabled
    }));
  } catch (err) {
    console.warn('[catalogService] fetchCategories fallback:', err);
    return null;
  }
};

export const saveCategory = async (category: Category): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      sort_order: category.sortOrder,
      is_enabled: category.isEnabled,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { data: cat } = await supabase.from('categories').select('image').eq('id', id).single();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error && cat?.image) {
      await deleteMediaFromStorage(cat.image).catch(() => {});
    }
    return !error;
  } catch {
    return false;
  }
};

export const fetchProducts = async (): Promise<Product[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('products_view')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Product[];
  } catch (err) {
    console.warn('[catalogService] fetchProducts fallback:', err);
    return null;
  }
};

export const saveProduct = async (product: Product): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    // Authenticate admin session so RLS policies permit update and delete operations
    await ensureAdminSupabaseAuth();

    // Derive synchronized image URLs from product.media if available
    const syncedImages = Array.isArray(product.media)
      ? product.media.filter(m => m.type === 'image' && m.url).map(m => m.url)
      : (product.images || []);

    // 1. Upsert product
    const { error: pErr } = await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category_id: product.categoryId,
      subcategory_id: product.subcategoryId || null,
      short_description: product.shortDescription,
      full_description: product.fullDescription,
      ingredients: product.ingredients,
      nutrition_info: product.nutritionInfo,
      origin_info: product.originInfo,
      purity_info: product.purityInfo,
      storage_instructions: product.storageInstructions,
      usage_instructions: product.usageInstructions,
      seo_title: product.seoTitle || null,
      seo_description: product.seoDescription || null,
      images: syncedImages,
      video_url: product.videoUrl || null,
      is_featured: product.isFeatured,
      is_best_seller: product.isBestSeller,
      is_new: product.isNew,
      is_enabled: product.isEnabled,
      is_published: product.isPublished !== false,
      rating: product.rating || 5.0,
      review_count: product.reviewCount || 0,
      tags: product.tags || [],
      keywords: product.keywords || [],
      trust_label: product.trustLabel || null,
      custom_badge: product.customBadge || null,
      updated_at: new Date().toISOString()
    });

    if (pErr) throw pErr;

    // 2. Upsert variants
    if (product.variants?.length) {
      const variants = product.variants.map(v => ({
        id: v.id,
        product_id: product.id,
        sku: v.sku,
        label: v.label,
        size_value: v.sizeValue,
        size_unit: v.sizeUnit,
        price: v.price,
        sale_price: v.salePrice || null,
        stock: v.stock,
        low_stock_threshold: v.lowStockThreshold || 5,
        barcode: v.barcode || null,
        is_enabled: v.isEnabled !== false,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('product_variants').upsert(variants);
    }

    // 3. Sync media (delete removed items, upsert remaining items)
    const { data: existingMedia } = await supabase
      .from('product_media')
      .select('id, url')
      .eq('product_id', product.id);

    const currentMedia = product.media || [];
    const remainingIds = new Set(currentMedia.map(m => m.id));

    // Delete removed items from product_media table and goodzeed-media bucket
    const toDelete = (existingMedia || []).filter(m => !remainingIds.has(m.id));
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(m => m.id);
      const { error: delErr } = await supabase.from('product_media').delete().in('id', deleteIds);
      if (delErr) {
        console.error('[catalogService] Error deleting from product_media:', delErr);
      }
      for (const item of toDelete) {
        if (item.url) await deleteMediaFromStorage(item.url).catch(() => {});
      }
    }

    // Upsert remaining media items
    if (currentMedia.length > 0) {
      let mIdx = 0;
      const media = currentMedia.map(m => ({
        id: m.id,
        product_id: product.id,
        type: m.type,
        url: m.url,
        alt_text: m.altText || null,
        title: m.title || null,
        thumbnail_url: m.thumbnailUrl || null,
        video_source: m.videoSource || null,
        sort_order: mIdx++
      }));
      await supabase.from('product_media').upsert(media);
    }

    return true;
  } catch (err) {
    console.error('[catalogService] saveProduct error:', err);
    return false;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    await ensureAdminSupabaseAuth();
    const { data: existingMedia } = await supabase
      .from('product_media')
      .select('url')
      .eq('product_id', id);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    if (existingMedia?.length) {
      for (const m of existingMedia) {
        if (m.url) await deleteMediaFromStorage(m.url).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.error('[catalogService] deleteProduct error:', err);
    return false;
  }
};

export const adjustStockRPC = async (
  variantId: string,
  changeAmount: number,
  reason: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.rpc('adjust_stock', {
      p_variant_id: variantId,
      p_change_amount: changeAmount,
      p_reason: reason
    });
    return !error;
  } catch {
    return false;
  }
};
