# GoodZeed Supabase Architecture & Deployment Guide

This directory contains the production-ready PostgreSQL migrations, views, triggers, functions, storage bucket rules, and Row Level Security (RLS) policies for GoodZeed.

## Directory Structure

```
supabase/
├── migrations/
│   └── 20260914000000_goodzeed_schema.sql   # Complete schema (22 tables, 7 enums, 4 views, 4 RPCs, RLS, Storage)
└── README.md                                # Architecture & deployment documentation
scripts/
├── migrate-store-to-supabase.js             # Automated seed script from src/data/storeData.json
└── verify-supabase-connection.js            # Pre-flight schema & connection verification
```

---

## 1. Database Schema Overview

The database contains **22 tables** organized into 8 functional domains:

1. **Authentication & Admin**:
   * `admin_users` (linked to `auth.users(id)` with `admin_role` enum: `SUPER_ADMIN`, `STORE_MANAGER`, `ORDER_DISPATCHER`, `SUPPORT_AGENT`)
2. **Settings**:
   * `store_settings` (bKash/Nagad accounts, SEO metadata, contact details, policies)
3. **Catalog & Inventory**:
   * `categories` & `subcategories`
   * `products` & `product_variants`
   * `product_media` (images and videos)
   * `inventory_adjustments` (audit log for stock level changes)
4. **Logistics & Delivery**:
   * `delivery_zones` (rate, estimated delivery days, district arrays)
5. **Orders & Checkout**:
   * `orders`
   * `order_items` (with historical name, variant, and price snapshots)
   * `order_payments`
   * `order_deliveries`
   * `order_invoices` (with database sequence `order_invoice_seq`)
   * `order_internal_notes`
6. **Customers**:
   * `customers` (deduplicated by `phone_normalized`, optional `auth_user_id`)
7. **Content Management System (CMS)**:
   * `homepage_sections`
   * `hero_media_slides`
   * `landing_pages`
   * `landing_page_blocks`
8. **Customer Engagement**:
   * `product_reviews` (with `PENDING`, `APPROVED`, `REJECTED` moderation states)
   * `support_tickets` (with `OPEN`, `IN_PROGRESS`, `WAITING`, `RESOLVED` states)

---

## 2. PostgreSQL Views

Four views format and denormalize data matching the frontend's TypeScript interfaces:

* **`products_view`**: Aggregates variants and media into nested JSON arrays, returning identical structure to `Product` interface.
* **`orders_view`**: Aggregates items, payment, delivery, invoices, and notes into `Order` interface shape.
* **`category_hierarchy_view`**: Nest subcategories under their parent categories.
* **`customer_order_summary_view`**: Customer metrics (order count, lifetime value, last order timestamp).

---

## 3. Atomic RPC Functions

* **`submit_checkout(payload jsonb)`**:
  Performs customer upsert, inventory check with `FOR UPDATE` row lock, order creation, order items creation, payment record, delivery record, invoice sequence generation, and atomic stock decrement within a single transaction.
* **`lookup_order(p_order_number text, p_phone text)`**:
  Securely looks up customer order status by verifying both order number and normalized phone number without granting direct table read permissions to anonymous users.
* **`transition_order_status(p_order_id text, p_new_status text, p_admin_id text, p_note text)`**:
  Validates business rules for status transitions, updates status, and logs an internal admin note atomically.
* **`adjust_stock(p_variant_id text, p_delta integer, p_reason text, p_admin_id text, p_reference text)`**:
  Atomically adjusts variant stock and logs an entry in `inventory_adjustments`.

---

## 4. Storage Bucket Setup

* **Bucket Name**: `goodzeed-media`
* **Access Level**: Public read access
* **File Size Limit**: 50MB (52,428,800 bytes)
* **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`, `image/avif`, `video/mp4`, `video/webm`
* **Write Access**: Restricted to authenticated administrators with an active record in `admin_users`.

---

## 5. Deployment Step-by-Step

### Step 1: Run SQL Migration
Execute `supabase/migrations/20260914000000_goodzeed_schema.sql` in the Supabase SQL Editor.

### Step 2: Configure Environment Variables
In `.env.local` (for development) or your hosting provider's environment settings:
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

### Step 3: Verify Schema & Connection
Run the automated preflight checker:
```bash
npm run db:verify
```

### Step 4: Seed Historical Data
Migrate existing categories, products, orders, and CMS configuration:
```bash
SUPABASE_URL=https://<your-project-id>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
npm run db:migrate-seed
```

### Step 5: Verify Admin Login
Log in to `/gz-panel-7392` using your Supabase Auth admin credentials.
