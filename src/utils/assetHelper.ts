// Utility to resolve assets located in src/assets/ (bundled by Vite)
// Works in both development and production (e.g. Netlify static hosting)

const assetModules = (import.meta as any).glob(
  '/src/assets/**/*.{png,jpg,jpeg,webp,svg,gif,mp4,webm,avif}',
  { eager: true, import: 'default' }
) as Record<string, string>;

/**
 * Maps any relative path or /uploads/... path to its bundled Vite asset URL.
 * If the path is an external URL (http/https/data:), it returns unchanged.
 */
export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Normalize path by removing query strings and leading slashes
  const [cleanUrl] = path.split('?');
  const normalized = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;

  // Direct check in /src/assets/
  const directPath = `/src/assets/${normalized}`;
  if (assetModules[directPath]) {
    return assetModules[directPath];
  }

  // If path is uploads/<filename> or /uploads/<filename>
  if (normalized.startsWith('uploads/')) {
    const filename = normalized.replace(/^uploads\//, '');
    const uploadPath = `/src/assets/uploads/${filename}`;
    if (assetModules[uploadPath]) {
      return assetModules[uploadPath];
    }
  }

  // If filename only, check directly inside /src/assets/uploads/
  const simpleUploadPath = `/src/assets/uploads/${normalized}`;
  if (assetModules[simpleUploadPath]) {
    return assetModules[simpleUploadPath];
  }

  // Check logo
  if (normalized === 'logo.png') {
    if (assetModules['/src/assets/logo.png']) {
      return assetModules['/src/assets/logo.png'];
    }
  }

  // Fallback to original path
  return path;
}

/**
 * Helper to resolve all image strings within an object (like Product, LandingPage, etc.)
 */
export function resolveObjectAssets<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => resolveObjectAssets(item)) as unknown as T;
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = { ...record };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      if (
        value.startsWith('/uploads/') ||
        value.startsWith('uploads/') ||
        value === '/logo.png' ||
        value === 'logo.png'
      ) {
        result[key] = getAssetUrl(value);
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (typeof item === 'string' && (item.startsWith('/uploads/') || item.startsWith('uploads/'))) {
          return getAssetUrl(item);
        }
        return resolveObjectAssets(item);
      });
    } else if (value && typeof value === 'object') {
      result[key] = resolveObjectAssets(value);
    }
  }

  return result as T;
}
