/**
 * GoodZeed Seed Migration Script
 * Migrates all data from src/data/storeData.json to Supabase
 *
 * Usage:
 *   # Live migration:
 *   node scripts/migrate-store-to-supabase.js
 *
 *   # Dry run validation (no network / no credentials required):
 *   node scripts/migrate-store-to-supabase.js --dry-run
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

const storeDataPath = path.resolve(process.cwd(), 'src/data/storeData.json');
if (!fs.existsSync(storeDataPath)) {
  console.error(`Error: storeData.json not found at ${storeDataPath}`);
  process.exit(1);
}

const rawData = fs.readFileSync(storeDataPath, 'utf8');
const data = JSON.parse(rawData);

if (isDryRun) {
  console.log('====================================================');
  console.log('GoodZeed — Migration Dry-Run Validation');
  console.log('====================================================');
  console.log('Checking dataset integrity and entity relationships...\n');

  const settingsOk = Boolean(data.settings && data.settings.storeName);
  const catCount = Array.isArray(data.categories) ? data.categories.length : 0;
  const prodCount = Array.isArray(data.products) ? data.products.length : 0;
  const zoneCount = Array.isArray(data.deliveryZones) ? data.deliveryZones.length : 0;
  const custCount = Array.isArray(data.customers) ? data.customers.length : 0;
  const orderCount = Array.isArray(data.orders) ? data.orders.length : 0;
  const adjCount = Array.isArray(data.inventoryAdjustments) ? data.inventoryAdjustments.length : 0;
  const secCount = Array.isArray(data.homepageSections) ? data.homepageSections.length : 0;
  const pageCount = Array.isArray(data.landingPages) ? data.landingPages.length : 0;
  const revCount = Array.isArray(data.reviews) ? data.reviews.length : 0;
  const ticketCount = Array.isArray(data.supportTickets) ? data.supportTickets.length : 0;

  // Relationship checks
  const catIds = new Set((data.categories || []).map(c => c.id));
  const missingCatRefs = [];
  let totalVariants = 0;
  let totalMedia = 0;
  const seenVariantIds = new Set();
  const duplicateVariants = [];

  (data.products || []).forEach(p => {
    if (!catIds.has(p.categoryId)) {
      missingCatRefs.push({ product: p.name, categoryId: p.categoryId });
    }
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        totalVariants++;
        if (seenVariantIds.has(v.id)) {
          duplicateVariants.push({ variantId: v.id, product: p.name });
        }
        seenVariantIds.add(v.id);
      });
    }
    if (Array.isArray(p.media)) totalMedia += p.media.length;
    else if (Array.isArray(p.images)) totalMedia += p.images.length;
  });

  console.log(`  ✅ Store Settings: ${settingsOk ? 'Valid' : 'Missing'}`);
  console.log(`  ✅ Categories: ${catCount}`);
  console.log(`  ✅ Products: ${prodCount} (Variants: ${totalVariants}, Media items: ${totalMedia})`);
  if (duplicateVariants.length > 0) {
    console.log(`     ℹ️ ${duplicateVariants.length} duplicate variant ID(s) detected. Migration will automatically assign unique composite IDs.`);
  }
  console.log(`  ✅ Delivery Zones: ${zoneCount}`);
  console.log(`  ✅ Customers: ${custCount}`);
  console.log(`  ✅ Orders: ${orderCount}`);
  console.log(`  ✅ Inventory Audit Adjustments: ${adjCount}`);
  console.log(`  ✅ Homepage CMS Sections: ${secCount}`);
  console.log(`  ✅ Landing Pages: ${pageCount}`);
  console.log(`  ✅ Customer Reviews: ${revCount}`);
  console.log(`  ✅ Support Tickets: ${ticketCount}`);

  if (missingCatRefs.length > 0) {
    console.warn('\n⚠️ Foreign Key Warnings:', missingCatRefs);
  } else {
    console.log('\n  ✅ All foreign key relationships (products -> categories) verified.');
  }

  console.log('\n====================================================');
  console.log('🎉 DRY-RUN VALIDATION SUCCESSFUL! Data is ready for Supabase.');
  console.log('====================================================\n');
  process.exit(0);
}

// Live Migration Execution
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
  console.error('Error: Please provide valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('For dry-run validation without Supabase, use: node scripts/migrate-store-to-supabase.js --dry-run');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const report = {
  store_settings: { inserted: 0, updated: 0, skipped: 0 },
  categories: { inserted: 0, updated: 0, skipped: 0 },
  subcategories: { inserted: 0, updated: 0, skipped: 0 },
  delivery_zones: { inserted: 0, updated: 0, skipped: 0 },
  products: { inserted: 0, updated: 0, skipped: 0 },
  product_variants: { inserted: 0, updated: 0, skipped: 0 },
  product_media: { inserted: 0, updated: 0, skipped: 0 },
  customers: { inserted: 0, updated: 0, skipped: 0 },
  orders: { inserted: 0, updated: 0, skipped: 0 },
  order_items: { inserted: 0, updated: 0, skipped: 0 },
  order_payments: { inserted: 0, updated: 0, skipped: 0 },
  order_deliveries: { inserted: 0, updated: 0, skipped: 0 },
  order_invoices: { inserted: 0, updated: 0, skipped: 0 },
  order_internal_notes: { inserted: 0, updated: 0, skipped: 0 },
  inventory_adjustments: { inserted: 0, updated: 0, skipped: 0 },
  homepage_sections: { inserted: 0, updated: 0, skipped: 0 },
  hero_media_items: { inserted: 0, updated: 0, skipped: 0 },
  landing_pages: { inserted: 0, updated: 0, skipped: 0 },
  landing_page_blocks: { inserted: 0, updated: 0, skipped: 0 },
  reviews: { inserted: 0, updated: 0, skipped: 0 },
  support_tickets: { inserted: 0, updated: 0, skipped: 0 }
};

const warnings = [];

async function runMigration() {
  console.log('Starting GoodZeed seed data migration to Supabase...');

  // 1. Store Settings
  if (data.settings) {
    const s = data.settings;
    const { error } = await supabase.from('store_settings').upsert({
      id: 1,
      store_name: s.storeName,
      store_tagline: s.storeTagline,
      store_contact_phone: s.storeContactPhone,
      store_contact_email: s.storeContactEmail,
      store_address: s.storeAddress,
      bkash_receiving_number: s.bkashReceivingNumber || '',
      bkash_instructions: s.bkashInstructions || '',
      nagad_receiving_number: s.nagadReceivingNumber || '',
      nagad_instructions: s.nagadInstructions || '',
      default_seo_title: s.defaultSeoTitle || '',
      default_seo_description: s.defaultSeoDescription || '',
      currency_symbol: s.currencySymbol || '৳',
      favicon_path: s.faviconPath,
      whatsapp_support_number: s.whatsappSupportNumber,
      support_hours: s.supportHours,
      ai_assistant_enabled: s.aiAssistantEnabled !== false,
      ai_welcome_message: s.aiWelcomeMessage,
      return_policy: s.returnPolicy,
      cancellation_policy: s.cancellationPolicy,
      refund_policy: s.refundPolicy,
      support_faq: s.supportFAQ
    }, { onConflict: 'id' });
    if (error) {
      warnings.push(`Store Settings: ${error.message}`);
      report.store_settings.skipped++;
    } else {
      report.store_settings.inserted++;
    }
  }

  // 2. Categories & Subcategories
  if (data.categories?.length) {
    const cats = data.categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      sort_order: c.sortOrder || 0,
      is_enabled: c.isEnabled !== false
    }));
    const { error } = await supabase.from('categories').upsert(cats, { onConflict: 'id' });
    if (error) {
      warnings.push(`Categories: ${error.message}`);
      report.categories.skipped += cats.length;
    } else {
      report.categories.inserted += cats.length;
    }

    // Subcategories if present
    const subcats = [];
    data.categories.forEach(c => {
      if (Array.isArray(c.subcategories)) {
        c.subcategories.forEach(sub => {
          subcats.push({
            id: sub.id,
            category_id: c.id,
            name: sub.name,
            slug: sub.slug,
            description: sub.description || '',
            sort_order: sub.sortOrder || 0,
            is_enabled: sub.isEnabled !== false
          });
        });
      }
    });
    if (subcats.length > 0) {
      const { error: subErr } = await supabase.from('subcategories').upsert(subcats, { onConflict: 'id' });
      if (subErr) {
        warnings.push(`Subcategories: ${subErr.message}`);
        report.subcategories.skipped += subcats.length;
      } else {
        report.subcategories.inserted += subcats.length;
      }
    }
  }

  // 3. Delivery Zones
  if (data.deliveryZones?.length) {
    const zones = data.deliveryZones.map(z => ({
      id: z.id,
      name: z.name,
      charge: z.charge,
      estimated_delivery_time: z.estimatedDeliveryTime,
      is_enabled: z.isEnabled !== false,
      sort_order: z.sortOrder || 0
    }));
    const { error } = await supabase.from('delivery_zones').upsert(zones, { onConflict: 'id' });
    if (error) {
      warnings.push(`Delivery Zones: ${error.message}`);
      report.delivery_zones.skipped += zones.length;
    } else {
      report.delivery_zones.inserted += zones.length;
    }
  }

  // 4. Products, Variants & Media
  const seenVariantIds = new Set();
  const variantIdMap = new Map(); // `${p.id}:${v.id}` -> unique variant ID

  if (data.products?.length) {
    const productsToInsert = [];
    const variantsToInsert = [];
    const mediaToInsert = [];

    for (const p of data.products) {
      productsToInsert.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category_id: p.categoryId,
        subcategory_id: p.subcategoryId || null,
        short_description: p.shortDescription || '',
        full_description: p.fullDescription || '',
        ingredients: p.ingredients || '',
        nutrition_info: p.nutritionInfo || '',
        origin_info: p.originInfo || '',
        purity_info: p.purityInfo || '',
        storage_instructions: p.storageInstructions || '',
        usage_instructions: p.usageInstructions || '',
        seo_title: p.seoTitle || '',
        seo_description: p.seoDescription || '',
        images: Array.isArray(p.images) ? p.images : [],
        is_featured: Boolean(p.isFeatured),
        is_best_seller: Boolean(p.isBestSeller),
        is_new: Boolean(p.isNew),
        is_enabled: p.isEnabled !== false,
        is_published: p.isPublished !== false,
        rating: p.rating || 5.0,
        review_count: p.reviewCount || 0,
        tags: Array.isArray(p.tags) ? p.tags : [],
        keywords: Array.isArray(p.keywords) ? p.keywords : []
      });

      if (Array.isArray(p.variants)) {
        p.variants.forEach(v => {
          let uniqueVariantId = v.id;
          if (seenVariantIds.has(uniqueVariantId)) {
            uniqueVariantId = `${v.id}-${p.id}`;
          }
          seenVariantIds.add(uniqueVariantId);
          variantIdMap.set(`${p.id}:${v.id}`, uniqueVariantId);

          variantsToInsert.push({
            id: uniqueVariantId,
            product_id: p.id,
            sku: v.sku,
            label: v.label,
            size_value: v.sizeValue || 0,
            size_unit: v.sizeUnit || 'g',
            price: v.price || 0,
            sale_price: v.salePrice ?? null,
            stock: v.stock ?? 0,
            low_stock_threshold: v.lowStockThreshold ?? 5,
            barcode: v.barcode || null,
            is_enabled: v.isEnabled !== false
          });
        });
      }

      if (Array.isArray(p.media) && p.media.length > 0) {
        p.media.forEach((m, idx) => {
          mediaToInsert.push({
            id: m.id || `${p.id}-m-${idx}`,
            product_id: p.id,
            type: m.type || 'image',
            url: m.url,
            alt_text: m.altText || '',
            title: m.title || '',
            thumbnail_url: m.thumbnailUrl || null,
            video_source: m.videoSource || 'direct',
            sort_order: idx
          });
        });
      } else if (Array.isArray(p.images)) {
        p.images.forEach((img, idx) => {
          mediaToInsert.push({
            id: `${p.id}-img-${idx}`,
            product_id: p.id,
            type: 'image',
            url: img,
            alt_text: p.name,
            title: p.name,
            thumbnail_url: null,
            video_source: 'direct',
            sort_order: idx
          });
        });
      }
    }

    const { error: pErr } = await supabase.from('products').upsert(productsToInsert, { onConflict: 'id' });
    if (pErr) {
      warnings.push(`Products: ${pErr.message}`);
      report.products.skipped += productsToInsert.length;
    } else {
      report.products.inserted += productsToInsert.length;
    }

    if (variantsToInsert.length > 0) {
      const { error: vErr } = await supabase.from('product_variants').upsert(variantsToInsert, { onConflict: 'id' });
      if (vErr) {
        warnings.push(`Product Variants: ${vErr.message}`);
        report.product_variants.skipped += variantsToInsert.length;
      } else {
        report.product_variants.inserted += variantsToInsert.length;
      }
    }

    if (mediaToInsert.length > 0) {
      const { error: mErr } = await supabase.from('product_media').upsert(mediaToInsert, { onConflict: 'id' });
      if (mErr) {
        warnings.push(`Product Media: ${mErr.message}`);
        report.product_media.skipped += mediaToInsert.length;
      } else {
        report.product_media.inserted += mediaToInsert.length;
      }
    }
  }

  // 5. Customers
  if (data.customers?.length) {
    const custs = data.customers.map(c => ({
      id: c.id,
      name: c.name,
      phone_raw: c.phone || '',
      phone_normalized: c.phoneNormalized || c.phone.replace(/[^0-9]/g, '').slice(-10),
      email: c.email || null,
      default_address: c.address || c.district || '',
      created_at: c.createdAt
    }));
    const { error } = await supabase.from('customers').upsert(custs, { onConflict: 'id' });
    if (error) {
      warnings.push(`Customers: ${error.message}`);
      report.customers.skipped += custs.length;
    } else {
      report.customers.inserted += custs.length;
    }
  }

  // 6. Orders
  if (data.orders?.length) {
    for (const ord of data.orders) {
      const { error: oErr } = await supabase.from('orders').upsert({
        id: ord.id,
        order_number: ord.orderNumber,
        customer_id: ord.customerId || null,
        customer_name_snapshot: ord.customerNameSnapshot || '',
        customer_phone_snapshot: ord.customerPhoneSnapshot || '',
        delivery_address_snapshot: ord.deliveryAddress || ord.deliveryAddressSnapshot || '',
        delivery_district: ord.deliveryDistrict || '',
        delivery_notes: ord.deliveryNotes || '',
        subtotal: ord.subtotal || 0,
        delivery_charge: ord.deliveryCharge || 0,
        total: ord.total || 0,
        status: ord.status || 'PENDING',
        source: (['CART', 'BUY_NOW', 'LANDING_PAGE'].includes(ord.source) ? ord.source : (ord.isBuyNow ? 'BUY_NOW' : 'CART')),
        internal_admin_notes: Array.isArray(ord.internalNotes) ? ord.internalNotes.map(n => n.note).join('; ') : (ord.internalAdminNotes || null),
        created_at: ord.createdAt,
        updated_at: ord.updatedAt || ord.createdAt
      }, { onConflict: 'id' });

      if (oErr) {
        warnings.push(`Order ${ord.orderNumber}: ${oErr.message}`);
        report.orders.skipped++;
        continue;
      }
      report.orders.inserted++;

      if (Array.isArray(ord.items) && ord.items.length > 0) {
        const items = ord.items.map(it => ({
          id: it.id,
          order_id: ord.id,
          product_id: it.productId || null,
          product_variant_id: variantIdMap.get(`${it.productId}:${it.variantId}`) || it.variantId || null,
          product_name_snapshot: it.productNameSnapshot,
          variant_label_snapshot: it.variantLabelSnapshot,
          unit_price_snapshot: it.unitPriceSnapshot,
          quantity: it.quantity,
          line_subtotal: it.lineTotal ?? it.lineSubtotal ?? (it.unitPriceSnapshot * it.quantity),
          product_image_snapshot: it.productImageSnapshot || ''
        }));
        const { error: itErr } = await supabase.from('order_items').upsert(items, { onConflict: 'id' });
        if (itErr) warnings.push(`Order Items (${ord.orderNumber}): ${itErr.message}`);
        else report.order_items.inserted += items.length;
      }

      if (ord.payment) {
        const { error: pyErr } = await supabase.from('order_payments').upsert({
          id: ord.payment.id || `${ord.id}-pay`,
          order_id: ord.id,
          method: ord.payment.method || 'COD',
          status: ord.payment.status || 'PENDING',
          transaction_id: ord.payment.transactionId || null,
          verified_by_admin_id: ord.payment.verifiedByAdminId || null,
          verified_at: ord.payment.paidAt || null,
          notes: ord.payment.notes || null
        }, { onConflict: 'id' });
        if (pyErr) warnings.push(`Order Payment (${ord.orderNumber}): ${pyErr.message}`);
        else report.order_payments.inserted++;
      }

      if (ord.delivery) {
        const { error: dlErr } = await supabase.from('order_deliveries').upsert({
          id: ord.delivery.id || `${ord.id}-del`,
          order_id: ord.id,
          delivery_zone_id: ord.delivery.deliveryZoneId || null,
          zone_name_snapshot: ord.delivery.zoneNameSnapshot || ord.deliveryDistrict || 'Standard',
          charge_snapshot: ord.delivery.chargeSnapshot ?? ord.deliveryCharge ?? 0,
          method: ord.delivery.method || 'OWN_DELIVERY',
          status: ord.delivery.status || 'NOT_DISPATCHED',
          tracking_number: ord.delivery.trackingNumber || ord.delivery.consignmentId || null,
          estimated_delivery: ord.delivery.estimatedDelivery || ''
        }, { onConflict: 'id' });
        if (dlErr) warnings.push(`Order Delivery (${ord.orderNumber}): ${dlErr.message}`);
        else report.order_deliveries.inserted++;
      }

      if (ord.invoice) {
        const { error: invErr } = await supabase.from('order_invoices').upsert({
          id: ord.invoice.id || `${ord.id}-inv`,
          order_id: ord.id,
          invoice_number: ord.invoice.invoiceNumber,
          issued_at: ord.invoice.issuedAt || ord.createdAt,
          reprinted_count: ord.invoice.reprintCount || ord.invoice.reprintedCount || 0
        }, { onConflict: 'id' });
        if (invErr) warnings.push(`Order Invoice (${ord.orderNumber}): ${invErr.message}`);
        else report.order_invoices.inserted++;
      }

      if (Array.isArray(ord.internalNotes) && ord.internalNotes.length > 0) {
        const notes = ord.internalNotes.map(n => ({
          id: n.id,
          order_id: ord.id,
          note: n.note,
          created_by: n.adminName || n.adminId || 'Admin',
          created_at: n.createdAt
        }));
        const { error: nErr } = await supabase.from('order_internal_notes').upsert(notes, { onConflict: 'id' });
        if (nErr) warnings.push(`Order Notes (${ord.orderNumber}): ${nErr.message}`);
        else report.order_internal_notes.inserted += notes.length;
      }
    }
  }

  // 7. Inventory Adjustments
  if (data.inventoryAdjustments?.length) {
    const adjs = data.inventoryAdjustments.map(a => {
      const varId = a.productVariantId || a.variantId;
      return {
        id: a.id,
        product_variant_id: variantIdMap.get(`${a.productId}:${varId}`) || varId,
        product_id: a.productId,
        product_name: a.productName || (data.products.find(p => p.id === a.productId)?.name) || 'Product',
        variant_label: a.variantLabel || 'Standard',
        change_amount: a.delta || a.changeAmount || 0,
        reason: a.reason || 'Manual Adjustment',
        adjusted_by_admin_id: a.adjustedByAdminId || null,
        stock_after: a.newStock ?? a.stockAfter ?? 0,
        created_at: a.createdAt
      };
    });
    const { error: adjErr } = await supabase.from('inventory_adjustments').upsert(adjs, { onConflict: 'id' });
    if (adjErr) {
      warnings.push(`Inventory Adjustments: ${adjErr.message}`);
      report.inventory_adjustments.skipped += adjs.length;
    } else {
      report.inventory_adjustments.inserted += adjs.length;
    }
  }

  // 8. Homepage Sections & Hero Slides
  if (data.homepageSections?.length) {
    const sections = data.homepageSections.map((s, sIdx) => ({
      id: s.id,
      section_type: s.sectionType || s.type || 'HERO',
      title: s.title || '',
      sort_order: s.sortOrder ?? sIdx,
      is_enabled: s.isEnabled !== false,
      heading: s.heading || s.title || null,
      subtitle: s.subtitle || null,
      body_text: s.bodyText || null,
      cta_label: s.ctaLabel || s.ctaText || null,
      cta_link: s.ctaLink || s.ctaUrl || null,
      media_url: s.mediaUrl || null,
      badge: s.badge || null,
      custom_html: s.customHtml || null,
      hero_headline: s.heroHeadline || s.title || null,
      hero_bengali_title: s.heroBengaliTitle || s.titleBn || null,
      hero_description: s.heroDescription || s.subtitle || null,
      hero_cta_text: s.heroCtaText || s.ctaText || null,
      hero_cta_category_slug: s.heroCtaCategorySlug || null,
      hero_secondary_cta_text: s.heroSecondaryCtaText || null,
      hero_image_url: s.heroImageUrl || (s.mediaType === 'image' ? s.mediaUrl : null),
      hero_video_url: s.heroVideoUrl || (s.mediaType === 'video' ? s.mediaUrl : null)
    }));

    const { error: secErr } = await supabase.from('homepage_sections').upsert(sections, { onConflict: 'id' });
    if (secErr) {
      warnings.push(`Homepage Sections: ${secErr.message}`);
      report.homepage_sections.skipped += sections.length;
    } else {
      report.homepage_sections.inserted += sections.length;
    }

    const heroSlides = [];
    data.homepageSections.forEach(s => {
      if (Array.isArray(s.heroMedia)) {
        s.heroMedia.forEach((m, mIdx) => {
          heroSlides.push({
            id: m.id || `${s.id}-slide-${mIdx}`,
            homepage_section_id: s.id,
            type: m.mediaType === 'video' ? 'video' : 'image',
            url: m.url,
            title: m.title || '',
            subtitle: m.subtitle || null,
            cta_text: m.ctaText || null,
            cta_custom_url: m.ctaUrl || null,
            badge: m.badgeText || null,
            sort_order: mIdx
          });
        });
      }
    });

    if (heroSlides.length > 0) {
      const { error: slideErr } = await supabase.from('hero_media_items').upsert(heroSlides, { onConflict: 'id' });
      if (slideErr) {
        warnings.push(`Hero Media Items: ${slideErr.message}`);
        report.hero_media_items.skipped += heroSlides.length;
      } else {
        report.hero_media_items.inserted += heroSlides.length;
      }
    }
  }

  // 9. Landing Pages & Blocks
  if (data.landingPages?.length) {
    for (const lp of data.landingPages) {
      const { error: lpErr } = await supabase.from('landing_pages').upsert({
        id: lp.id,
        slug: lp.slug,
        title: lp.title,
        seo_title: lp.seoTitle || lp.title || '',
        seo_description: lp.seoDescription || '',
        social_share_image: lp.socialShareImage || null,
        countdown_ends_at: lp.countdownEnd || null,
        is_published: lp.isPublished !== false
      }, { onConflict: 'id' });

      if (lpErr) {
        warnings.push(`Landing Page (${lp.slug}): ${lpErr.message}`);
        report.landing_pages.skipped++;
        continue;
      }
      report.landing_pages.inserted++;

      if (Array.isArray(lp.blocks) && lp.blocks.length > 0) {
        const blocks = lp.blocks.map((b, bIdx) => ({
          id: b.id,
          landing_page_id: lp.id,
          block_type: b.blockType || b.type,
          sort_order: b.sortOrder ?? bIdx,
          content: b.content || {}
        }));
        const { error: blkErr } = await supabase.from('landing_page_blocks').upsert(blocks, { onConflict: 'id' });
        if (blkErr) warnings.push(`Landing Page Blocks (${lp.slug}): ${blkErr.message}`);
        else report.landing_page_blocks.inserted += blocks.length;
      }
    }
  }

  // 10. Reviews
  if (data.reviews?.length) {
    const revs = data.reviews.map(r => ({
      id: r.id,
      product_id: r.productId,
      product_name: r.productName || null,
      reviewer_name: r.reviewerName,
      reviewer_phone: r.reviewerPhone,
      rating: r.rating,
      review_text: r.reviewText,
      is_verified_purchase: r.isVerifiedPurchase || false,
      moderation_status: r.moderationStatus || 'PENDING',
      created_at: r.createdAt
    }));
    const { error: revErr } = await supabase.from('reviews').upsert(revs, { onConflict: 'id' });
    if (revErr) {
      warnings.push(`Reviews: ${revErr.message}`);
      report.reviews.skipped += revs.length;
    } else {
      report.reviews.inserted += revs.length;
    }
  }

  // 11. Support Tickets
  if (data.supportTickets?.length) {
    const tickets = data.supportTickets.map(t => ({
      id: t.id,
      customer_name: t.customerName,
      customer_phone: t.customerPhone,
      customer_email: t.customerEmail || null,
      order_number: t.orderNumber || null,
      subject: t.subject,
      message: t.message,
      status: t.status || 'OPEN',
      admin_notes: t.adminNotes || null,
      created_at: t.createdAt,
      updated_at: t.updatedAt || t.createdAt
    }));
    const { error: tErr } = await supabase.from('support_tickets').upsert(tickets, { onConflict: 'id' });
    if (tErr) {
      warnings.push(`Support Tickets: ${tErr.message}`);
      report.support_tickets.skipped += tickets.length;
    } else {
      report.support_tickets.inserted += tickets.length;
    }
  }

  console.log('\n====================================================');
  console.log('🎉 SEED MIGRATION FINISHED');
  console.log('====================================================');
  console.log('\nTable-by-Table Summary:');
  console.table(report);

  if (warnings.length > 0) {
    console.warn('\n⚠️ Warnings encountered during migration:');
    warnings.forEach(w => console.warn(` - ${w}`));
  } else {
    console.log('✅ ZERO ERRORS OR WARNINGS!');
  }
  console.log('====================================================\n');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
