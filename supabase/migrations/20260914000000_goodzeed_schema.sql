-- ==============================================================================
-- GOODZEED COMPLETE SUPABASE MIGRATION
-- Migration: 20260914000000_goodzeed_schema.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Admin Role Hierarchy
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'SUPER_ADMIN',
    'STORE_MANAGER',
    'ORDER_DISPATCHER',
    'SUPPORT_AGENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Order Lifecycle Status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment Enums
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('COD', 'BKASH', 'NAGAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'AWAITING_VERIFICATION',
    'PAID',
    'FAILED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delivery Enums
DO $$ BEGIN
  CREATE TYPE delivery_method AS ENUM ('OWN_DELIVERY', 'COURIER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'NOT_DISPATCHED',
    'DISPATCHED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Support Ticket Status
DO $$ BEGIN
  CREATE TYPE support_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Size Unit Enum
DO $$ BEGIN
  CREATE TYPE size_unit AS ENUM ('g', 'kg', 'ml', 'l', 'pcs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

-- 1. Admin Users (Linked to auth.users)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role admin_role NOT NULL DEFAULT 'SUPER_ADMIN',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Store Settings (Singleton row enforced by CHECK id = 1)
CREATE TABLE IF NOT EXISTS store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'GoodZeed',
  store_tagline text NOT NULL DEFAULT '100% Pure, Natural Everyday Food for Bangladesh',
  store_contact_phone text NOT NULL DEFAULT '+880 1711-223344',
  store_contact_email text NOT NULL DEFAULT 'care@goodzeed.com.bd',
  store_address text NOT NULL DEFAULT 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh',
  bkash_receiving_number text NOT NULL DEFAULT '',
  bkash_instructions text NOT NULL DEFAULT '',
  nagad_receiving_number text NOT NULL DEFAULT '',
  nagad_instructions text NOT NULL DEFAULT '',
  default_seo_title text NOT NULL DEFAULT '',
  default_seo_description text NOT NULL DEFAULT '',
  currency_symbol text NOT NULL DEFAULT '৳',
  favicon_path text DEFAULT '/favicon-16x16.png?v=5',
  whatsapp_support_number text,
  support_hours text DEFAULT 'Saturday – Thursday, 9 AM – 9 PM',
  ai_assistant_enabled boolean NOT NULL DEFAULT true,
  ai_welcome_message text,
  return_policy text,
  cancellation_policy text,
  refund_policy text,
  support_faq text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_category_subcategory_slug UNIQUE (category_id, slug)
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id text REFERENCES subcategories(id) ON DELETE SET NULL,
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  ingredients text NOT NULL DEFAULT '',
  nutrition_info text NOT NULL DEFAULT '',
  origin_info text NOT NULL DEFAULT '',
  purity_info text NOT NULL DEFAULT '',
  storage_instructions text NOT NULL DEFAULT '',
  usage_instructions text NOT NULL DEFAULT '',
  seo_title text,
  seo_description text,
  images text[] NOT NULL DEFAULT '{}',
  video_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  rating numeric(3, 2) DEFAULT 5.00,
  review_count integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  trust_label text,
  custom_badge text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Full text search column maintained via trigger (avoids non-immutable 42P17 error)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION products_update_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.short_description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.keywords, ' '), '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name, short_description, tags, keywords
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_update_search_vector();

-- 6. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  label text NOT NULL,
  size_value numeric NOT NULL DEFAULT 0,
  size_unit size_unit NOT NULL DEFAULT 'g',
  price numeric(12, 2) NOT NULL DEFAULT 0,
  sale_price numeric(12, 2),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5,
  barcode text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Product Media Items
CREATE TABLE IF NOT EXISTS product_media (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  url text NOT NULL,
  alt_text text,
  title text,
  thumbnail_url text,
  video_source text CHECK (video_source IN ('direct', 'youtube', 'vimeo')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  charge numeric(10, 2) NOT NULL DEFAULT 0,
  estimated_delivery_time text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Customers (with optional auth_user_id linkage)
CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name text NOT NULL,
  phone_normalized text NOT NULL UNIQUE,
  phone_raw text NOT NULL,
  email text,
  default_address text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spend numeric(12, 2) NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FLAGGED')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number text NOT NULL UNIQUE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name_snapshot text NOT NULL,
  customer_phone_snapshot text NOT NULL,
  delivery_address_snapshot text NOT NULL,
  delivery_district text NOT NULL,
  delivery_notes text,
  status order_status NOT NULL DEFAULT 'PENDING',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  delivery_charge numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'CART' CHECK (source IN ('CART', 'BUY_NOW', 'LANDING_PAGE')),
  internal_admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_variant_id text REFERENCES product_variants(id) ON DELETE SET NULL,
  product_id text REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  variant_label_snapshot text NOT NULL,
  unit_price_snapshot numeric(12, 2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_subtotal numeric(12, 2) NOT NULL,
  product_image_snapshot text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Order Payments (1:1)
CREATE TABLE IF NOT EXISTS order_payments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL DEFAULT 'COD',
  status payment_status NOT NULL DEFAULT 'PENDING',
  transaction_id text,
  verified_by_admin_id text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Order Deliveries (1:1)
CREATE TABLE IF NOT EXISTS order_deliveries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  delivery_zone_id text REFERENCES delivery_zones(id) ON DELETE SET NULL,
  zone_name_snapshot text NOT NULL,
  charge_snapshot numeric(10, 2) NOT NULL,
  method delivery_method NOT NULL DEFAULT 'OWN_DELIVERY',
  status delivery_status NOT NULL DEFAULT 'NOT_DISPATCHED',
  tracking_number text,
  estimated_delivery text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Order Invoices (1:1)
CREATE SEQUENCE IF NOT EXISTS invoice_sequence_counter START WITH 108;

CREATE TABLE IF NOT EXISTS order_invoices (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  reprinted_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Order Internal Notes (1:M)
CREATE TABLE IF NOT EXISTS order_internal_notes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Inventory Adjustments (Audit Log)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_variant_id text NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  variant_label text NOT NULL,
  change_amount integer NOT NULL,
  reason text NOT NULL,
  adjusted_by_admin_id text,
  stock_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. Homepage Sections
CREATE TABLE IF NOT EXISTS homepage_sections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  section_type text NOT NULL CHECK (section_type IN (
    'HERO', 'TRUST_STRIP', 'SHOP_BY_CATEGORY', 'FEATURED_PRODUCTS',
    'BEST_SELLERS', 'PROMO_BANNER', 'WHY_GOODZEED', 'SOURCE_STORY',
    'FEATURED_COLLECTION', 'REVIEWS', 'BRAND_STORY', 'FINAL_CTA'
  )),
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  heading text,
  subtitle text,
  body_text text,
  cta_label text,
  cta_link text,
  media_url text,
  badge text,
  custom_html text,
  hero_headline text,
  hero_bengali_title text,
  hero_description text,
  hero_cta_text text,
  hero_cta_category_slug text,
  hero_secondary_cta_text text,
  hero_image_url text,
  hero_video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Hero Media Items
CREATE TABLE IF NOT EXISTS hero_media_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  homepage_section_id text NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  url text NOT NULL,
  alt_text text,
  title text,
  caption text,
  thumbnail_url text,
  video_source text CHECK (video_source IN ('direct', 'youtube', 'vimeo')),
  badge text,
  subtitle text,
  description text,
  cta_text text,
  cta_link_type text CHECK (cta_link_type IN ('shop', 'category', 'product', 'cms', 'custom')),
  cta_product_slug text,
  cta_category_slug text,
  cta_landing_slug text,
  cta_custom_url text,
  secondary_cta_text text,
  secondary_cta_link_type text CHECK (secondary_cta_link_type IN ('shop', 'category', 'product', 'cms', 'custom', 'track-order')),
  secondary_cta_product_slug text,
  secondary_cta_category_slug text,
  secondary_cta_landing_slug text,
  secondary_cta_custom_url text,
  overlay text CHECK (overlay IN ('light', 'medium', 'dark')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  advanced_html text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. Landing Pages
CREATE TABLE IF NOT EXISTS landing_pages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  social_share_image text,
  facebook_pixel_id text,
  google_analytics_id text,
  countdown_ends_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  is_no_index boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 20. Landing Page Blocks
CREATE TABLE IF NOT EXISTS landing_page_blocks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  landing_page_id text NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  block_type text NOT NULL CHECK (block_type IN (
    'HERO', 'PRODUCT_SHOWCASE', 'PURCHASE_SECTION', 'IMAGE', 'VIDEO',
    'TEXT', 'BENEFITS', 'TESTIMONIALS', 'FAQ', 'CTA', 'TRUST_SECTION',
    'CUSTOM_HTML', 'COUNTDOWN_TIMER', 'QUICK_ORDER_FORM'
  )),
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sanitized_html text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text,
  reviewer_name text NOT NULL,
  reviewer_phone text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 22. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  order_number text,
  subject text NOT NULL,
  message text NOT NULL,
  status support_status NOT NULL DEFAULT 'OPEN',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_normalized ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(customer_phone);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_number ON support_tickets(order_number);

-- ==============================================================================
-- 3. RLS HELPER FUNCTION & POLICIES
-- ==============================================================================

CREATE OR REPLACE FUNCTION has_admin_role(VARIADIC allowed_roles admin_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
    AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. Admin Users
CREATE POLICY "Super Admins can manage admin users"
  ON admin_users FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN'));

CREATE POLICY "Admins can view their own profile"
  ON admin_users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2. Store Settings
CREATE POLICY "Public can view store settings"
  ON store_settings FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Super Admins can update store settings"
  ON store_settings FOR UPDATE TO authenticated
  USING (has_admin_role('SUPER_ADMIN'));

-- 3. Catalog
CREATE POLICY "Public can view enabled categories"
  ON categories FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view enabled subcategories"
  ON subcategories FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage subcategories"
  ON subcategories FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view published products"
  ON products FOR SELECT TO anon, authenticated
  USING ((is_enabled = true AND is_published = true) OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage products"
  ON products FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view enabled product variants"
  ON product_variants FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage product variants"
  ON product_variants FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view product media"
  ON product_media FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage product media"
  ON product_media FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

-- 4. Delivery Zones
CREATE POLICY "Public can view enabled delivery zones"
  ON delivery_zones FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

-- 5. Orders & Customers
CREATE POLICY "Admins can view and manage all orders"
  ON orders FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER', 'SUPPORT_AGENT'));

CREATE POLICY "Admins can view and manage order items"
  ON order_items FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can view and manage order payments"
  ON order_payments FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can view and manage order deliveries"
  ON order_deliveries FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can view and manage invoices"
  ON order_invoices FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can manage internal notes"
  ON order_internal_notes FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER'));

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_DISPATCHER', 'SUPPORT_AGENT'));

CREATE POLICY "Authenticated customers can view own record"
  ON customers FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- 6. Inventory Adjustments
CREATE POLICY "Admins can view and record inventory adjustments"
  ON inventory_adjustments FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

-- 7. CMS & Landing Pages
CREATE POLICY "Public can view enabled homepage sections"
  ON homepage_sections FOR SELECT TO anon, authenticated
  USING (is_enabled = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage homepage sections"
  ON homepage_sections FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view published hero slides"
  ON hero_media_items FOR SELECT TO anon, authenticated
  USING (status = 'published' OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage hero slides"
  ON hero_media_items FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view published landing pages"
  ON landing_pages FOR SELECT TO anon, authenticated
  USING (is_published = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Admins can manage landing pages"
  ON landing_pages FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

CREATE POLICY "Public can view landing blocks for published pages"
  ON landing_page_blocks FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM landing_pages
    WHERE landing_pages.id = landing_page_blocks.landing_page_id
    AND (landing_pages.is_published = true OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'))
  ));

CREATE POLICY "Admins can manage landing blocks"
  ON landing_page_blocks FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER'));

-- 8. Reviews
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT TO anon, authenticated
  USING (moderation_status = 'APPROVED' OR has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT'));

CREATE POLICY "Public can submit reviews in PENDING state"
  ON reviews FOR INSERT TO anon, authenticated
  WITH CHECK (moderation_status = 'PENDING');

CREATE POLICY "Admins can moderate and delete reviews"
  ON reviews FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT'));

-- 9. Support Tickets
CREATE POLICY "Public can submit support tickets in OPEN state"
  ON support_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'OPEN');

CREATE POLICY "Admins can manage support tickets"
  ON support_tickets FOR ALL TO authenticated
  USING (has_admin_role('SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT'));

-- ==============================================================================
-- 4. VIEWS FOR FRONTEND COMPATIBILITY
-- ==============================================================================

CREATE OR REPLACE VIEW products_view AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.category_id AS "categoryId",
  p.subcategory_id AS "subcategoryId",
  p.short_description AS "shortDescription",
  p.full_description AS "fullDescription",
  p.ingredients,
  p.nutrition_info AS "nutritionInfo",
  p.origin_info AS "originInfo",
  p.purity_info AS "purityInfo",
  p.storage_instructions AS "storageInstructions",
  p.usage_instructions AS "usageInstructions",
  p.seo_title AS "seoTitle",
  p.seo_description AS "seoDescription",
  p.images,
  p.video_url AS "videoUrl",
  p.is_featured AS "isFeatured",
  p.is_best_seller AS "isBestSeller",
  p.is_new AS "isNew",
  p.is_enabled AS "isEnabled",
  p.is_published AS "isPublished",
  p.rating,
  p.review_count AS "reviewCount",
  p.tags,
  p.keywords,
  p.trust_label AS "trustLabel",
  p.custom_badge AS "customBadge",
  coalesce(
    (
      SELECT json_agg(
        json_build_object(
          'id', v.id,
          'productId', v.product_id,
          'sku', v.sku,
          'label', v.label,
          'sizeValue', v.size_value,
          'sizeUnit', v.size_unit,
          'price', v.price,
          'salePrice', v.sale_price,
          'stock', v.stock,
          'lowStockThreshold', v.low_stock_threshold,
          'barcode', v.barcode,
          'isEnabled', v.is_enabled
        ) ORDER BY v.price ASC
      )
      FROM product_variants v
      WHERE v.product_id = p.id
    ),
    '[]'::json
  ) AS variants,
  coalesce(
    (
      SELECT json_agg(
        json_build_object(
          'id', m.id,
          'type', m.type,
          'url', m.url,
          'altText', m.alt_text,
          'title', m.title,
          'thumbnailUrl', m.thumbnail_url,
          'videoSource', m.video_source
        ) ORDER BY m.sort_order ASC
      )
      FROM product_media m
      WHERE m.product_id = p.id
    ),
    '[]'::json
  ) AS media
FROM products p;

CREATE OR REPLACE VIEW orders_view AS
SELECT
  o.id,
  o.order_number AS "orderNumber",
  o.customer_id AS "customerId",
  o.customer_name_snapshot AS "customerNameSnapshot",
  o.customer_phone_snapshot AS "customerPhoneSnapshot",
  o.delivery_address_snapshot AS "deliveryAddressSnapshot",
  o.delivery_district AS "deliveryDistrict",
  o.delivery_notes AS "deliveryNotes",
  o.status,
  o.subtotal,
  o.delivery_charge AS "deliveryCharge",
  o.total,
  o.source,
  o.internal_admin_notes AS "internalAdminNotes",
  o.created_at AS "createdAt",
  o.updated_at AS "updatedAt",
  (
    SELECT json_build_object(
      'id', py.id,
      'orderId', py.order_id,
      'method', py.method,
      'status', py.status,
      'transactionId', py.transaction_id,
      'verifiedByAdminId', py.verified_by_admin_id,
      'verifiedAt', py.verified_at,
      'notes', py.notes
    )
    FROM order_payments py
    WHERE py.order_id = o.id
  ) AS payment,
  (
    SELECT json_build_object(
      'id', dl.id,
      'orderId', dl.order_id,
      'deliveryZoneId', dl.delivery_zone_id,
      'zoneNameSnapshot', dl.zone_name_snapshot,
      'chargeSnapshot', dl.charge_snapshot,
      'method', dl.method,
      'status', dl.status,
      'trackingNumber', dl.tracking_number,
      'estimatedDelivery', dl.estimated_delivery
    )
    FROM order_deliveries dl
    WHERE dl.order_id = o.id
  ) AS delivery,
  (
    SELECT json_build_object(
      'id', inv.id,
      'orderId', inv.order_id,
      'invoiceNumber', inv.invoice_number,
      'issuedAt', inv.issued_at,
      'reprintedCount', inv.reprinted_count
    )
    FROM order_invoices inv
    WHERE inv.order_id = o.id
  ) AS invoice,
  coalesce(
    (
      SELECT json_agg(
        json_build_object(
          'id', it.id,
          'orderId', it.order_id,
          'productVariantId', it.product_variant_id,
          'productId', it.product_id,
          'productNameSnapshot', it.product_name_snapshot,
          'variantLabelSnapshot', it.variant_label_snapshot,
          'unitPriceSnapshot', it.unit_price_snapshot,
          'quantity', it.quantity,
          'lineSubtotal', it.line_subtotal,
          'productImageSnapshot', it.product_image_snapshot
        )
      )
      FROM order_items it
      WHERE it.order_id = o.id
    ),
    '[]'::json
  ) AS items,
  coalesce(
    (
      SELECT json_agg(
        json_build_object(
          'id', n.id,
          'note', n.note,
          'createdBy', n.created_by,
          'createdAt', n.created_at
        ) ORDER BY n.created_at ASC
      )
      FROM order_internal_notes n
      WHERE n.order_id = o.id
    ),
    '[]'::json
  ) AS "internalNotes"
FROM orders o;

-- ==============================================================================
-- 5. BUSINESS LOGIC FUNCTIONS & RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION submit_checkout(payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_item jsonb;
  v_variant record;
  v_zone record;
  v_subtotal numeric := 0;
  v_delivery_charge numeric := 0;
  v_total numeric := 0;
  v_phone_raw text;
  v_phone_norm text;
  v_customer_id text;
  v_order_id text;
  v_order_number text;
  v_pay_status payment_status;
  v_order_json jsonb;
BEGIN
  IF jsonb_array_length(payload->'items') = 0 THEN
    RAISE EXCEPTION 'Checkout cart cannot be empty';
  END IF;

  SELECT * INTO v_zone FROM delivery_zones
  WHERE id = (payload->>'deliveryZoneId') AND is_enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive delivery zone';
  END IF;
  v_delivery_charge := v_zone.charge;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT * INTO v_variant FROM product_variants
    WHERE id = (v_item->>'variantId') FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variant % not found', (v_item->>'variantId');
    END IF;

    IF v_variant.stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION 'Insufficient stock for % (requested %, available %)',
        v_variant.label, (v_item->>'quantity')::int, v_variant.stock;
    END IF;

    v_subtotal := v_subtotal + ((v_item->>'unitPrice')::numeric * (v_item->>'quantity')::int);
  END LOOP;

  v_total := v_subtotal + v_delivery_charge;

  v_phone_raw := payload->>'customerPhone';
  v_phone_norm := regexp_replace(v_phone_raw, '[^0-9]', '', 'g');
  IF length(v_phone_norm) > 11 THEN
    v_phone_norm := right(v_phone_norm, 11);
  END IF;

  SELECT id INTO v_customer_id FROM customers WHERE phone_normalized = v_phone_norm FOR UPDATE;

  IF FOUND THEN
    UPDATE customers SET
      name = payload->>'customerName',
      email = coalesce(payload->>'customerEmail', email),
      default_address = payload->>'deliveryAddress',
      total_orders = total_orders + 1,
      total_spend = total_spend + v_total,
      last_order_at = now(),
      updated_at = now()
    WHERE id = v_customer_id;
  ELSE
    v_customer_id := 'cust-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4);
    INSERT INTO customers (
      id, name, phone_normalized, phone_raw, email, default_address,
      total_orders, total_spend, last_order_at
    ) VALUES (
      v_customer_id, payload->>'customerName', v_phone_norm, v_phone_raw,
      payload->>'customerEmail', payload->>'deliveryAddress',
      1, v_total, now()
    );
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    UPDATE product_variants
    SET stock = stock - (v_item->>'quantity')::int,
        updated_at = now()
    WHERE id = (v_item->>'variantId');
  END LOOP;

  v_order_number := 'GZ-' || to_char(now(), 'YYYY') || '-' || (1000 + nextval('invoice_sequence_counter')::int);
  v_order_id := 'order-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  IF (payload->>'paymentMethod') = 'COD' THEN
    v_pay_status := 'PENDING';
  ELSE
    v_pay_status := 'AWAITING_VERIFICATION';
  END IF;

  INSERT INTO orders (
    id, order_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
    delivery_address_snapshot, delivery_district, delivery_notes, status,
    subtotal, delivery_charge, total, source
  ) VALUES (
    v_order_id, v_order_number, v_customer_id, payload->>'customerName',
    v_phone_raw, payload->>'deliveryAddress', payload->>'deliveryDistrict',
    payload->>'deliveryNotes', 'PENDING', v_subtotal, v_delivery_charge, v_total,
    coalesce(payload->>'source', 'CART')
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    INSERT INTO order_items (
      order_id, product_variant_id, product_id, product_name_snapshot,
      variant_label_snapshot, unit_price_snapshot, quantity, line_subtotal,
      product_image_snapshot
    ) VALUES (
      v_order_id, v_item->>'variantId', v_item->>'productId',
      v_item->>'productName', v_item->>'variantLabel',
      (v_item->>'unitPrice')::numeric, (v_item->>'quantity')::int,
      (v_item->>'unitPrice')::numeric * (v_item->>'quantity')::int,
      coalesce(v_item->>'image', '')
    );
  END LOOP;

  INSERT INTO order_payments (
    order_id, method, status, transaction_id
  ) VALUES (
    v_order_id, (payload->>'paymentMethod')::payment_method, v_pay_status,
    payload->>'transactionId'
  );

  INSERT INTO order_deliveries (
    order_id, delivery_zone_id, zone_name_snapshot, charge_snapshot,
    method, status, estimated_delivery
  ) VALUES (
    v_order_id, v_zone.id, v_zone.name, v_delivery_charge,
    'OWN_DELIVERY', 'NOT_DISPATCHED', v_zone.estimated_delivery_time
  );

  SELECT row_to_json(o) INTO v_order_json FROM orders_view o WHERE o.id = v_order_id;
  RETURN v_order_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION lookup_order(p_phone text, p_order_number text)
RETURNS jsonb AS $$
DECLARE
  v_norm_phone text;
  v_order_json jsonb;
BEGIN
  v_norm_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_norm_phone) > 10 THEN
    v_norm_phone := right(v_norm_phone, 10);
  END IF;

  SELECT row_to_json(o) INTO v_order_json
  FROM orders_view o
  WHERE upper(trim(o."orderNumber")) = upper(trim(p_order_number))
  AND right(regexp_replace(o."customerPhoneSnapshot", '[^0-9]', '', 'g'), 10) = v_norm_phone;

  RETURN v_order_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id text,
  p_new_status order_status
)
RETURNS boolean AS $$
DECLARE
  v_curr_status order_status;
  v_valid boolean := false;
  v_inv_num text;
BEGIN
  SELECT status INTO v_curr_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_curr_status = 'PENDING' AND p_new_status IN ('CONFIRMED', 'CANCELLED') THEN v_valid := true;
  ELSIF v_curr_status = 'CONFIRMED' AND p_new_status IN ('PROCESSING', 'CANCELLED') THEN v_valid := true;
  ELSIF v_curr_status = 'PROCESSING' AND p_new_status IN ('SHIPPED', 'CANCELLED') THEN v_valid := true;
  ELSIF v_curr_status = 'SHIPPED' AND p_new_status = 'OUT_FOR_DELIVERY' THEN v_valid := true;
  ELSIF v_curr_status = 'OUT_FOR_DELIVERY' AND p_new_status = 'DELIVERED' THEN v_valid := true;
  ELSIF v_curr_status = 'DELIVERED' AND p_new_status = 'RETURN_REQUESTED' THEN v_valid := true;
  ELSIF v_curr_status = 'RETURN_REQUESTED' AND p_new_status IN ('RETURN_APPROVED', 'RETURN_REJECTED') THEN v_valid := true;
  END IF;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Illegal order status transition from % to %', v_curr_status, p_new_status;
  END IF;

  UPDATE orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;

  IF p_new_status IN ('CONFIRMED', 'PROCESSING', 'DELIVERED') THEN
    IF NOT EXISTS (SELECT 1 FROM order_invoices WHERE order_id = p_order_id) THEN
      v_inv_num := 'GZ-INV-' || lpad(nextval('invoice_sequence_counter')::text, 6, '0');
      INSERT INTO order_invoices (order_id, invoice_number)
      VALUES (p_order_id, v_inv_num);
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION adjust_stock(
  p_variant_id text,
  p_change_amount integer,
  p_reason text
)
RETURNS boolean AS $$
DECLARE
  v_var record;
  v_prod record;
  v_new_stock integer;
BEGIN
  SELECT * INTO v_var FROM product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product variant % not found', p_variant_id;
  END IF;

  v_new_stock := v_var.stock + p_change_amount;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Adjustment would cause negative stock (% -> %)', v_var.stock, v_new_stock;
  END IF;

  SELECT * INTO v_prod FROM products WHERE id = v_var.product_id;

  UPDATE product_variants
  SET stock = v_new_stock, updated_at = now()
  WHERE id = p_variant_id;

  INSERT INTO inventory_adjustments (
    product_variant_id, product_id, product_name, variant_label,
    change_amount, reason, adjusted_by_admin_id, stock_after
  ) VALUES (
    p_variant_id, v_var.product_id, v_prod.name, v_var.label,
    p_change_amount, p_reason, auth.uid()::text, v_new_stock
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. STORAGE BUCKET CONFIGURATION
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'goodzeed-media',
  'goodzeed-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/svg+xml', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

CREATE POLICY "Public media access"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'goodzeed-media');

CREATE POLICY "Admin media upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'goodzeed-media' AND
    has_admin_role('SUPER_ADMIN', 'STORE_MANAGER')
  );

CREATE POLICY "Admin media update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'goodzeed-media' AND
    has_admin_role('SUPER_ADMIN', 'STORE_MANAGER')
  );

CREATE POLICY "Admin media delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'goodzeed-media' AND
    has_admin_role('SUPER_ADMIN', 'STORE_MANAGER')
  );
