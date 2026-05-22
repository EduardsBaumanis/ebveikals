-- ============================================================
-- schema.sql
-- Database schema for the Latvian ceramics e-store.
-- Run this FIRST in the Supabase SQL editor.
--
-- Order of execution:
--   1. schema.sql        (this file - tables, constraints, indexes)
--   2. functions.sql     (triggers and stored procedures)
--   3. rls-policies.sql  (Row Level Security policies)
--   4. seed-demo-data.sql (demo content)
--
-- All comments are in English (for teaching).
-- All visible text values are in Latvian.
-- ============================================================

-- Supabase already provides the pgcrypto extension for gen_random_uuid().
-- If running on plain PostgreSQL, uncomment the next line:
-- create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- admin_users
-- Links a Supabase Auth user to admin privileges.
-- A user is an admin ONLY if a row exists here for their user_id.
-- ------------------------------------------------------------
create table if not exists admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

-- ------------------------------------------------------------
-- product_types  (Bļoda, Krūze, Urna, ...)
-- ------------------------------------------------------------
create table if not exists product_types (
  id          uuid primary key default gen_random_uuid(),
  name_lv     text not null,
  slug        text not null unique,
  sort_order  int not null default 0
);

-- ------------------------------------------------------------
-- themes  (Mežs, Upe, Senās zīmes, ...)
-- ------------------------------------------------------------
create table if not exists themes (
  id              uuid primary key default gen_random_uuid(),
  name_lv         text not null,
  slug            text not null unique,
  description_lv  text,
  sort_order      int not null default 0
);

-- ------------------------------------------------------------
-- firing_styles  (glazing / firing styles)
-- ------------------------------------------------------------
create table if not exists firing_styles (
  id              uuid primary key default gen_random_uuid(),
  name_lv         text not null,
  slug            text not null unique,
  description_lv  text,
  sort_order      int not null default 0
);

-- ------------------------------------------------------------
-- clay_locations  (places in Latvia where clay was gathered)
-- latitude/longitude are approximate and used by the artistic map.
-- ------------------------------------------------------------
create table if not exists clay_locations (
  id              uuid primary key default gen_random_uuid(),
  name_lv         text not null,
  slug            text not null unique,
  region_lv       text,
  latitude        numeric,
  longitude       numeric,
  description_lv  text,
  story_lv        text,
  sort_order      int not null default 0
);

-- ------------------------------------------------------------
-- parcel_machines  (Latvijas Pasts parcel machines / pakomāti)
-- Demo data only - see ADMIN_GUIDE.md for how to maintain this list.
-- ------------------------------------------------------------
create table if not exists parcel_machines (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'Latvijas Pasts',
  name_lv      text not null,
  address_lv   text,
  city_lv      text,
  postal_code  text,
  active       boolean not null default true
);

-- ------------------------------------------------------------
-- products
-- The core table. "status" controls visibility and availability.
-- ------------------------------------------------------------
create table if not exists products (
  id                    uuid primary key default gen_random_uuid(),
  title_lv              text not null,
  slug                  text unique,
  short_description_lv  text,
  long_description_lv   text,
  price_eur             numeric(10,2) not null,
  original_quantity     int not null,
  quantity_left         int not null,
  status                text not null default 'hidden'
                          check (status in ('visible', 'hidden', 'sold_out', 'archived')),
  product_type_id       uuid references product_types(id),
  theme_id              uuid references themes(id),
  firing_style_id       uuid references firing_styles(id),
  clay_location_id      uuid references clay_locations(id),
  dimensions_lv         text,
  weight_grams          int,
  care_instructions_lv  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Data integrity constraints
  constraint price_non_negative          check (price_eur >= 0),
  constraint original_quantity_non_neg   check (original_quantity >= 0),
  constraint quantity_left_non_negative  check (quantity_left >= 0),
  constraint quantity_left_within_made   check (quantity_left <= original_quantity)
);

-- ------------------------------------------------------------
-- product_images
-- Multiple images per product. One image is marked is_main.
-- alt text is generated in the frontend from file_name.
-- ------------------------------------------------------------
create table if not exists product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  is_main       boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- orders
-- One row per customer order. Created with status 'pending_payment'.
-- public_order_number is a short human-friendly id shown to customers.
-- ------------------------------------------------------------
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  public_order_number text unique,
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  parcel_machine_id   uuid references parcel_machines(id),
  customer_comment    text,
  status              text not null default 'pending_payment'
                        check (status in ('pending_payment', 'paid', 'cancelled', 'failed', 'refunded')),
  payment_provider    text not null default 'klix',
  klix_purchase_id    text,
  klix_checkout_url   text,
  total_eur           numeric(10,2),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- order_items
-- A snapshot of each purchased product (title + price) so the order
-- record stays correct even if the product changes later.
-- ------------------------------------------------------------
create table if not exists order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  product_id        uuid references products(id),
  title_snapshot_lv text,
  unit_price_eur    numeric(10,2),
  quantity          int not null,
  line_total_eur    numeric(10,2),
  constraint order_item_quantity_positive check (quantity > 0)
);

-- ------------------------------------------------------------
-- order_events
-- Audit log of what happened to an order (webhook received, stock
-- reduced, email sent, ...). Useful for debugging and idempotency.
-- ------------------------------------------------------------
create table if not exists order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  event_type  text not null,
  event_data  jsonb,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- email_log
-- Records every email the server tried to send.
-- ------------------------------------------------------------
create table if not exists email_log (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete set null,
  recipient     text,
  subject       text,
  status        text,
  error_message text,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- site_settings
-- Flexible key/value store for small configuration values.
-- ------------------------------------------------------------
create table if not exists site_settings (
  key    text primary key,
  value  jsonb
);

-- ============================================================
-- Indexes
-- These speed up the most common queries (filtering and sorting).
-- ============================================================
create index if not exists idx_products_status        on products(status);
create index if not exists idx_products_type           on products(product_type_id);
create index if not exists idx_products_theme          on products(theme_id);
create index if not exists idx_products_firing_style   on products(firing_style_id);
create index if not exists idx_products_clay_location  on products(clay_location_id);
create index if not exists idx_products_created_at      on products(created_at);

create index if not exists idx_product_images_product  on product_images(product_id);

create index if not exists idx_orders_status           on orders(status);
create index if not exists idx_orders_customer_email   on orders(customer_email);
create index if not exists idx_orders_created_at       on orders(created_at);

create index if not exists idx_order_items_order       on order_items(order_id);
create index if not exists idx_order_events_order      on order_events(order_id);
