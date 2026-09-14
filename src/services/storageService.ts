import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { ensureAdminSupabaseAuth } from './authService';

export const MEDIA_BUCKET = 'goodzeed-media';

export type MediaFolder = 'products' | 'categories' | 'hero' | 'campaigns' | 'cms' | 'general';

export interface UploadResponse {
  success: boolean;
  url: string;
  filename?: string;
  error?: string;
}

/**
 * Uploads a file directly to Supabase Storage bucket 'goodzeed-media'.
 * Bypasses local server/disk storage completely.
 */
export const uploadMedia = async (
  file: File,
  folder: MediaFolder = 'general'
): Promise<UploadResponse> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      url: '',
      error: 'Supabase is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    };
  }

  try {
    // Ensure active authenticated session so RLS policy "Admin media upload" passes
    await ensureAdminSupabaseAuth();

    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${folder}/${timestamp}-${rand}-${safeName}`;

    // Directly upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      console.error('[storageService] Supabase Storage upload error:', error);
      return {
        success: false,
        url: '',
        error: error.message || 'Failed to upload to Supabase Storage'
      };
    }

    // Retrieve the permanent public URL
    const { data: urlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      filename: safeName
    };
  } catch (err: any) {
    console.error('[storageService] Unexpected upload error:', err);
    return {
      success: false,
      url: '',
      error: err?.message || 'Unexpected network error during media upload'
    };
  }
};

/**
 * Returns the public URL for an asset stored in the goodzeed-media bucket
 */
export const getStoragePublicUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.replace(/^(\/|goodzeed-media\/)+/, '');
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(cleanPath);
  return data.publicUrl;
};

/**
 * Deletes a file from Supabase Storage bucket 'goodzeed-media'.
 * Safely ignores external URLs (Unsplash, YouTube) and non-bucket assets.
 */
export const deleteMediaFromStorage = async (url: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !url) return false;
  if (!url.includes(`/${MEDIA_BUCKET}/`)) return false;

  try {
    await ensureAdminSupabaseAuth();
    const parts = url.split(`/${MEDIA_BUCKET}/`);
    if (parts.length < 2) return false;
    const storagePath = decodeURIComponent(parts[1].split('?')[0]);
    if (!storagePath) return false;

    // Safety check: ensure file is not still in use by another media record
    const [{ data: pmRefs }, { data: hmRefs }] = await Promise.all([
      supabase.from('product_media').select('id').eq('url', url).limit(1),
      supabase.from('hero_media_items').select('id').eq('url', url).limit(1)
    ]);

    if ((pmRefs && pmRefs.length > 0) || (hmRefs && hmRefs.length > 0)) {
      // File still in use by another record; keep in storage
      return true;
    }

    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    if (error) {
      console.warn(`[storageService] Could not delete ${storagePath} from bucket:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[storageService] Unexpected error during storage delete:', err);
    return false;
  }
};


