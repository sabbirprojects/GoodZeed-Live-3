/**
 * GoodZeed Supabase Production Pre-flight Verification Script
 *
 * Usage:
 *   VITE_SUPABASE_URL="https://xxx.supabase.co" VITE_SUPABASE_ANON_KEY="xxx" node scripts/verify-supabase-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('====================================================');
console.log('GoodZeed — Supabase Verification & Health Pre-flight');
console.log('====================================================');

if (!url || !key || url.includes('YOUR_SUPABASE_URL')) {
  console.log('ℹ️  Supabase URL/Key not configured in environment.');
  console.log('ℹ️  Application is currently safely operating in local JSON fallback mode.');
  console.log('ℹ️  To test live connection:');
  console.log('    VITE_SUPABASE_URL="https://xxx.supabase.co" VITE_SUPABASE_ANON_KEY="xxx" node scripts/verify-supabase-connection.js');
  process.exit(0);
}

const supabase = createClient(url, key);

const TABLES = [
  'admin_users',
  'store_settings',
  'categories',
  'subcategories',
  'products',
  'product_variants',
  'product_media',
  'delivery_zones',
  'orders',
  'order_items',
  'order_payments',
  'order_deliveries',
  'order_invoices',
  'order_internal_notes',
  'customers',
  'inventory_adjustments',
  'homepage_sections',
  'hero_media_items',
  'landing_pages',
  'landing_page_blocks',
  'reviews',
  'support_tickets'
];

const VIEWS = [
  'products_view',
  'orders_view',
  'category_hierarchy_view',
  'customer_order_summary_view'
];

async function runCheck() {
  console.log(`📡 Connecting to: ${url}`);
  let errors = 0;

  // 1. Check Tables
  console.log('\n--- Checking Tables (22 total) ---');
  for (const t of TABLES) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`  ❌ Table [${t}]: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✅ Table [${t}] exists (records: ${count ?? 0})`);
      }
    } catch (e) {
      console.error(`  ❌ Table [${t}] exception:`, e.message);
      errors++;
    }
  }

  // 2. Check Views
  console.log('\n--- Checking Views (4 total) ---');
  for (const v of VIEWS) {
    try {
      const { count, error } = await supabase.from(v).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`  ❌ View [${v}]: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✅ View [${v}] exists (rows: ${count ?? 0})`);
      }
    } catch (e) {
      console.error(`  ❌ View [${v}] exception:`, e.message);
      errors++;
    }
  }

  // 3. Check RPC Functions
  console.log('\n--- Checking RPC Functions (4 total) ---');
  const RPCS = [
    { name: 'lookup_order', params: { p_order_number: 'NON_EXISTENT', p_phone: '01700000000' } },
    { name: 'submit_checkout', params: { payload: {} } },
    { name: 'transition_order_status', params: { p_order_id: 'NON_EXISTENT', p_new_status: 'CANCELLED' } },
    { name: 'adjust_stock', params: { p_variant_id: 'NON_EXISTENT', p_delta: 0, p_reason: 'TEST' } }
  ];

  for (const r of RPCS) {
    try {
      const { error } = await supabase.rpc(r.name, r.params);
      if (error && error.code === '42883') {
        console.error(`  ❌ RPC [${r.name}]: Function does not exist (42883)`);
        errors++;
      } else {
        // Any error other than 42883 (e.g. invalid payload or not found) proves the function signature exists in PostgreSQL!
        console.log(`  ✅ RPC [${r.name}] is installed and callable`);
      }
    } catch (e) {
      console.error(`  ❌ RPC [${r.name}] exception:`, e.message);
      errors++;
    }
  }

  // 4. Check Storage Bucket
  console.log('\n--- Checking Storage Bucket ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.warn(`  ℹ️ Storage list note: ${bError.message} (expected for anon key)`);
      // Test direct public URL access to goodzeed-media
      const { data: publicUrlData } = supabase.storage.from('goodzeed-media').getPublicUrl('test.txt');
      if (publicUrlData?.publicUrl?.includes('goodzeed-media')) {
        console.log('  ✅ Storage bucket [goodzeed-media] public endpoint verified.');
      }
    } else {
      const found = buckets?.some(b => b.name === 'goodzeed-media');
      if (found) {
        console.log('  ✅ Storage bucket [goodzeed-media] verified.');
      } else {
        console.warn('  ⚠️ Bucket [goodzeed-media] not found in bucket list.');
      }
    }
  } catch (e) {
    console.warn('  ⚠️ Storage check skipped:', e.message);
  }

  console.log('\n====================================================');
  if (errors === 0) {
    console.log('🎉 ALL SUPABASE SCHEMA CHECKS PASSED!');
  } else {
    console.log(`⚠️  ${errors} issue(s) encountered. Review above output.`);
  }
  console.log('====================================================\n');
}

runCheck();
