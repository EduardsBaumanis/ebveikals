-- ============================================================
-- rls-policies.sql
-- Row Level Security (RLS) policies.
-- Run this AFTER schema.sql and functions.sql.
--
-- KEY IDEA:
--   * The PUBLIC anon key (used in the browser) may only READ
--     visible products and public reference data.
--   * Orders are created by the Cloudflare Function using the
--     SERVICE ROLE key, which bypasses RLS. Browsers never insert
--     orders directly.
--   * Admins (rows in admin_users) may manage everything.
--
-- A helper function is_admin() centralises the admin check.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: is_admin()
-- Returns true if the currently authenticated user is in admin_users.
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- Enable RLS on every public table.
-- Once enabled, NOTHING is allowed unless a policy permits it.
-- ------------------------------------------------------------
alter table admin_users    enable row level security;
alter table product_types  enable row level security;
alter table themes         enable row level security;
alter table firing_styles  enable row level security;
alter table clay_locations enable row level security;
alter table parcel_machines enable row level security;
alter table products       enable row level security;
alter table product_images enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table order_events   enable row level security;
alter table email_log      enable row level security;
alter table site_settings  enable row level security;

-- ============================================================
-- admin_users
-- A logged-in user may read their own admin row (to confirm they
-- are an admin). Only admins may manage admin rows.
-- ============================================================
drop policy if exists admin_users_select_self on admin_users;
create policy admin_users_select_self on admin_users
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists admin_users_admin_all on admin_users;
create policy admin_users_admin_all on admin_users
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Public reference tables: product_types, themes, firing_styles,
-- clay_locations, parcel_machines.
-- Public may READ. Only admins may write.
-- ============================================================

-- product_types
drop policy if exists product_types_public_read on product_types;
create policy product_types_public_read on product_types
  for select using (true);
drop policy if exists product_types_admin_write on product_types;
create policy product_types_admin_write on product_types
  for all using (is_admin()) with check (is_admin());

-- themes
drop policy if exists themes_public_read on themes;
create policy themes_public_read on themes
  for select using (true);
drop policy if exists themes_admin_write on themes;
create policy themes_admin_write on themes
  for all using (is_admin()) with check (is_admin());

-- firing_styles
drop policy if exists firing_styles_public_read on firing_styles;
create policy firing_styles_public_read on firing_styles
  for select using (true);
drop policy if exists firing_styles_admin_write on firing_styles;
create policy firing_styles_admin_write on firing_styles
  for all using (is_admin()) with check (is_admin());

-- clay_locations
drop policy if exists clay_locations_public_read on clay_locations;
create policy clay_locations_public_read on clay_locations
  for select using (true);
drop policy if exists clay_locations_admin_write on clay_locations;
create policy clay_locations_admin_write on clay_locations
  for all using (is_admin()) with check (is_admin());

-- parcel_machines: public may read ACTIVE machines only; admins all.
drop policy if exists parcel_machines_public_read on parcel_machines;
create policy parcel_machines_public_read on parcel_machines
  for select using (active = true or is_admin());
drop policy if exists parcel_machines_admin_write on parcel_machines;
create policy parcel_machines_admin_write on parcel_machines
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- products
-- Public may read ONLY products that are visible or sold_out
-- (sold_out items still need to be shown, marked as sold).
-- Hidden and archived products are admin-only.
-- ============================================================
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select using (status in ('visible', 'sold_out') or is_admin());

drop policy if exists products_admin_write on products;
create policy products_admin_write on products
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- product_images
-- Public may read images of products they can see.
-- Only admins may write.
-- ============================================================
drop policy if exists product_images_public_read on product_images;
create policy product_images_public_read on product_images
  for select using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id
        and (p.status in ('visible', 'sold_out') or is_admin())
    )
  );

drop policy if exists product_images_admin_write on product_images;
create policy product_images_admin_write on product_images
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- orders / order_items / order_events / email_log
-- These contain customer PERSONAL DATA. The public anon role gets
-- NO access at all. Only admins may read.
-- Inserts/updates happen via the SERVICE ROLE key (Cloudflare
-- Function), which bypasses RLS entirely - so no public insert
-- policy is added on purpose.
-- ============================================================

-- orders
drop policy if exists orders_admin_read on orders;
create policy orders_admin_read on orders
  for select using (is_admin());
drop policy if exists orders_admin_write on orders;
create policy orders_admin_write on orders
  for all using (is_admin()) with check (is_admin());

-- order_items
drop policy if exists order_items_admin_read on order_items;
create policy order_items_admin_read on order_items
  for select using (is_admin());
drop policy if exists order_items_admin_write on order_items;
create policy order_items_admin_write on order_items
  for all using (is_admin()) with check (is_admin());

-- order_events
drop policy if exists order_events_admin_read on order_events;
create policy order_events_admin_read on order_events
  for select using (is_admin());
drop policy if exists order_events_admin_write on order_events;
create policy order_events_admin_write on order_events
  for all using (is_admin()) with check (is_admin());

-- email_log
drop policy if exists email_log_admin_read on email_log;
create policy email_log_admin_read on email_log
  for select using (is_admin());
drop policy if exists email_log_admin_write on email_log;
create policy email_log_admin_write on email_log
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- site_settings: public read, admin write.
-- ============================================================
drop policy if exists site_settings_public_read on site_settings;
create policy site_settings_public_read on site_settings
  for select using (true);
drop policy if exists site_settings_admin_write on site_settings;
create policy site_settings_admin_write on site_settings
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Supabase Storage bucket policies for product images.
--
-- Create a PUBLIC bucket named "product-images" in the Supabase
-- dashboard (Storage > New bucket > Public). Then run the policies
-- below so that:
--   * anyone may READ (download) images;
--   * only admins may upload / update / delete.
--
-- Storage objects live in the storage.objects table.
-- ============================================================

-- Public read for the product-images bucket.
drop policy if exists storage_product_images_public_read on storage.objects;
create policy storage_product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

-- Admin-only insert.
drop policy if exists storage_product_images_admin_insert on storage.objects;
create policy storage_product_images_admin_insert on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

-- Admin-only update.
drop policy if exists storage_product_images_admin_update on storage.objects;
create policy storage_product_images_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and is_admin());

-- Admin-only delete.
drop policy if exists storage_product_images_admin_delete on storage.objects;
create policy storage_product_images_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
