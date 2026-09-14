import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const uploadsDir = path.resolve(process.cwd(), 'public/uploads');

const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

async function main() {
  console.log('--- Migrating local uploads to Supabase Storage (goodzeed-media) ---');
  if (!fs.existsSync(uploadsDir)) {
    console.log('No public/uploads directory found.');
    return;
  }

  const files = fs.readdirSync(uploadsDir).filter(f => f !== '.gitkeep' && !f.startsWith('.'));
  console.log(`Found ${files.length} files in public/uploads`);

  const urlMap = new Map(); // localFilename -> publicUrl

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);
    const storagePath = `uploads/${filename}`;

    const { error: upErr } = await supabase.storage
      .from('goodzeed-media')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });

    if (upErr) {
      console.warn(`Error uploading ${filename}:`, upErr.message);
    } else {
      const { data } = supabase.storage.from('goodzeed-media').getPublicUrl(storagePath);
      urlMap.set(filename, data.publicUrl);
      urlMap.set(`/uploads/${filename}`, data.publicUrl);
      urlMap.set(`uploads/${filename}`, data.publicUrl);
      urlMap.set(`/src/assets/uploads/${filename}`, data.publicUrl);
      urlMap.set(`src/assets/uploads/${filename}`, data.publicUrl);
    }
  }

  console.log(`Successfully uploaded ${urlMap.size / 5} unique files to Supabase Storage!`);

  // Helper to replace matching URLs
  const replaceUrl = (origUrl) => {
    if (!origUrl || typeof origUrl !== 'string') return origUrl;
    if (origUrl.startsWith('http://') || origUrl.startsWith('https://')) return origUrl;
    return urlMap.get(origUrl) || origUrl;
  };

  // 1. Update Categories
  const { data: categories } = await supabase.from('categories').select('id, image');
  if (categories) {
    for (const cat of categories) {
      const newImg = replaceUrl(cat.image);
      if (newImg !== cat.image) {
        await supabase.from('categories').update({ image: newImg }).eq('id', cat.id);
      }
    }
  }

  // 2. Update Products & Product Media
  const { data: products } = await supabase.from('products').select('id, images');
  if (products) {
    for (const prod of products) {
      if (Array.isArray(prod.images)) {
        const newImages = prod.images.map(replaceUrl);
        await supabase.from('products').update({ images: newImages }).eq('id', prod.id);
      }
    }
  }

  const { data: productMedia } = await supabase.from('product_media').select('id, url');
  if (productMedia) {
    for (const pm of productMedia) {
      const newUrl = replaceUrl(pm.url);
      if (newUrl !== pm.url) {
        await supabase.from('product_media').update({ url: newUrl }).eq('id', pm.id);
      }
    }
  }

  // 3. Update Homepage Sections & Hero Media
  const { data: sections } = await supabase.from('homepage_sections').select('id, media_url, hero_image_url, hero_video_url');
  if (sections) {
    for (const s of sections) {
      await supabase.from('homepage_sections').update({
        media_url: replaceUrl(s.media_url),
        hero_image_url: replaceUrl(s.hero_image_url),
        hero_video_url: replaceUrl(s.hero_video_url)
      }).eq('id', s.id);
    }
  }

  const { data: heroMedia } = await supabase.from('hero_media_items').select('id, url');
  if (heroMedia) {
    for (const hm of heroMedia) {
      const newUrl = replaceUrl(hm.url);
      if (newUrl !== hm.url) {
        await supabase.from('hero_media_items').update({ url: newUrl }).eq('id', hm.id);
      }
    }
  }

  // 4. Update storeData.json to maintain consistency
  const storeDataPath = path.resolve(process.cwd(), 'src/data/storeData.json');
  if (fs.existsSync(storeDataPath)) {
    let raw = fs.readFileSync(storeDataPath, 'utf8');
    for (const [localPath, publicUrl] of urlMap.entries()) {
      raw = raw.split(`"${localPath}"`).join(`"${publicUrl}"`);
    }
    fs.writeFileSync(storeDataPath, raw, 'utf8');
  }

  console.log('--- Migration of local media to Supabase Storage completed successfully! ---');
}

main().catch(console.error);
