-- ============================================================
-- seed-demo-data.sql
-- DEMO content for development and teaching.
-- Run this AFTER the other SQL files.
--
-- IMPORTANT: All data here is DEMO / SAMPLE data:
--   * clay locations use APPROXIMATE coordinates;
--   * parcel machines are a SHORT SAMPLE, not the real list;
--   * products are fictional examples.
-- Replace with real data before going live.
-- ============================================================

-- ------------------------------------------------------------
-- Product types
-- ------------------------------------------------------------
insert into product_types (name_lv, slug, sort_order) values
  ('Bļoda',     'bloda',     1),
  ('Krūze',     'kruze',     2),
  ('Urna',      'urna',      3),
  ('Šķīvis',    'skivis',    4),
  ('Vāze',      'vaze',      5),
  ('Skulptūra', 'skulptura', 6),
  ('Cits',      'cits',      7)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Themes (Tēmas darbos)
-- ------------------------------------------------------------
insert into themes (name_lv, slug, description_lv, sort_order) values
  ('Mežs',        'mezs',        'Darbi, kas iedvesmoti no Latvijas mežiem.', 1),
  ('Upe',         'upe',         'Ūdens un upju plūdums māla formās.',        2),
  ('Senās zīmes', 'senas-zimes', 'Latviešu etnogrāfiskās zīmes un raksti.',   3),
  ('Zeme',        'zeme',        'Zemes krāsas un faktūras.',                 4),
  ('Uguns',       'uguns',       'Uguns un apdedzināšanas spēks.',            5)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Firing / glazing styles
-- ------------------------------------------------------------
insert into firing_styles (name_lv, slug, description_lv, sort_order) values
  ('Matēta melna glazūra',     'mateta-melna-glazura',  'Dziļa, matēta melna virsma.',          1),
  ('Pelnu glazūra',            'pelnu-glazura',          'Glazūra no koka pelniem.',             2),
  ('Dabīgs māls',              'dabigs-mals',            'Neglazēta dabīga māla virsma.',        3),
  ('Eksperimentāls apdedzinājums', 'eksperimentals-apdedzinajums', 'Neparedzami uguns rezultāti.', 4)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Clay locations (DEMO coordinates - approximate!)
-- Coordinates are roughly within Latvia for the artistic map.
-- ------------------------------------------------------------
insert into clay_locations (name_lv, slug, region_lv, latitude, longitude, description_lv, story_lv, sort_order) values
  ('Latgales māls',  'latgales-mals',  'Latgale',  56.18, 27.30, 'DEMO: Sarkanīgs māls no Latgales pakalniem.', 'DEMO stāsts: Māls vākts pie ezera Latgalē.', 1),
  ('Kurzemes māls',  'kurzemes-mals',  'Kurzeme',  56.95, 21.95, 'DEMO: Gaišs māls no Kurzemes piekrastes.',   'DEMO stāsts: Smilšains māls no jūras tuvuma.', 2),
  ('Vidzemes māls',  'vidzemes-mals',  'Vidzeme',  57.32, 25.27, 'DEMO: Pelēks māls no Vidzemes mežiem.',      'DEMO stāsts: Vākts mežmalā pie upes.',         3),
  ('Zemgales māls',  'zemgales-mals',  'Zemgale',  56.50, 23.72, 'DEMO: Auglīgs līdzenuma māls.',              'DEMO stāsts: Māls no Zemgales laukiem.',       4),
  ('Sēlijas māls',   'selijas-mals',   'Sēlija',   56.28, 25.85, 'DEMO: Tumšs māls no Sēlijas.',               'DEMO stāsts: Vākts pie senas mājvietas.',      5)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Parcel machines (SAMPLE / DEMO - not the real list!)
-- See ADMIN_GUIDE.md for how to maintain this list.
-- ------------------------------------------------------------
insert into parcel_machines (provider, name_lv, address_lv, city_lv, postal_code, active) values
  ('Latvijas Pasts', 'DEMO Rīga Centrs',   'Brīvības iela 1 (PARAUGS)',   'Rīga',     'LV-1010', true),
  ('Latvijas Pasts', 'DEMO Rīga Imanta',   'Kurzemes prospekts 1 (PARAUGS)', 'Rīga',  'LV-1067', true),
  ('Latvijas Pasts', 'DEMO Liepāja',       'Lielā iela 1 (PARAUGS)',      'Liepāja',  'LV-3401', true),
  ('Latvijas Pasts', 'DEMO Daugavpils',    'Rīgas iela 1 (PARAUGS)',      'Daugavpils','LV-5401', true),
  ('Latvijas Pasts', 'DEMO Cēsis',         'Raunas iela 1 (PARAUGS)',     'Cēsis',    'LV-4101', true)
on conflict do nothing;

-- ------------------------------------------------------------
-- Demo products (8 examples)
-- We use subqueries to look up the reference ids by slug so this
-- script is easy to read and re-run.
-- ------------------------------------------------------------
insert into products (
  title_lv, slug, short_description_lv, long_description_lv,
  price_eur, original_quantity, quantity_left, status,
  product_type_id, theme_id, firing_style_id, clay_location_id,
  dimensions_lv, weight_grams, care_instructions_lv
) values
(
  'Melna bļoda "Mežs"', 'melna-bloda-mezs',
  'Matēti melna bļoda ar meža motīvu.',
  'Šī bļoda izgatavota no Latgales māla un apdedzināta ar matēti melnu glazūru. Katra līnija atgādina meža ēnas.',
  48.00, 5, 2, 'visible',
  (select id from product_types where slug='bloda'),
  (select id from themes where slug='mezs'),
  (select id from firing_styles where slug='mateta-melna-glazura'),
  (select id from clay_locations where slug='latgales-mals'),
  'Ø 18 cm, augstums 7 cm', 620,
  'Mazgāt ar rokām, nelietot trauku mazgājamā mašīnā.'
),
(
  'Krūze "Upe"', 'kruze-upe',
  'Krūze ar plūstošu ūdens rakstu.',
  'Krūze veidota no Kurzemes māla. Pelnu glazūra rada plūstošu, upei līdzīgu virsmu.',
  32.00, 8, 5, 'visible',
  (select id from product_types where slug='kruze'),
  (select id from themes where slug='upe'),
  (select id from firing_styles where slug='pelnu-glazura'),
  (select id from clay_locations where slug='kurzemes-mals'),
  'Tilpums 300 ml', 410,
  'Var mazgāt trauku mazgājamā mašīnā saudzīgā režīmā.'
),
(
  'Urna "Senās zīmes"', 'urna-senas-zimes',
  'Urna ar etnogrāfisko zīmju rakstu.',
  'Šajā urnā iegravētas latviešu senās zīmes. Darbs no Vidzemes māla, dabīga virsma.',
  120.00, 3, 1, 'visible',
  (select id from product_types where slug='urna'),
  (select id from themes where slug='senas-zimes'),
  (select id from firing_styles where slug='dabigs-mals'),
  (select id from clay_locations where slug='vidzemes-mals'),
  'Augstums 32 cm', 2400,
  'Tikai dekoratīvai lietošanai. Slaucīt ar sausu drānu.'
),
(
  'Šķīvis "Zeme"', 'skivis-zeme',
  'Plats šķīvis zemes krāsās.',
  'Šķīvis no Zemgales māla ar siltām zemes toņa nokrāsām un eksperimentālu apdedzinājumu.',
  40.00, 6, 6, 'visible',
  (select id from product_types where slug='skivis'),
  (select id from themes where slug='zeme'),
  (select id from firing_styles where slug='eksperimentals-apdedzinajums'),
  (select id from clay_locations where slug='zemgales-mals'),
  'Ø 24 cm', 780,
  'Mazgāt ar rokām.'
),
(
  'Vāze "Uguns"', 'vaze-uguns',
  'Slaida vāze ar uguns toņiem.',
  'Vāze no Sēlijas māla. Eksperimentālā apdedzināšanā radušies sarkani un oranži toņi.',
  68.00, 4, 0, 'sold_out',
  (select id from product_types where slug='vaze'),
  (select id from themes where slug='uguns'),
  (select id from firing_styles where slug='eksperimentals-apdedzinajums'),
  (select id from clay_locations where slug='selijas-mals'),
  'Augstums 28 cm', 1100,
  'Tikai sausi ziedi. Slaucīt ar sausu drānu.'
),
(
  'Skulptūra "Sakne"', 'skulptura-sakne',
  'Abstrakta skulptūra par saknēm.',
  'Skulptūra no Latgales māla, kas simbolizē saknes un piederību zemei.',
  150.00, 2, 2, 'visible',
  (select id from product_types where slug='skulptura'),
  (select id from themes where slug='zeme'),
  (select id from firing_styles where slug='dabigs-mals'),
  (select id from clay_locations where slug='latgales-mals'),
  'Augstums 22 cm', 1900,
  'Dekoratīvs objekts. Slaucīt ar sausu drānu.'
),
(
  'Krūze "Mežs"', 'kruze-mezs',
  'Maza krūze ar meža noskaņu.',
  'Krūze no Vidzemes māla ar matētu melnu glazūru un meža motīvu.',
  29.00, 10, 7, 'visible',
  (select id from product_types where slug='kruze'),
  (select id from themes where slug='mezs'),
  (select id from firing_styles where slug='mateta-melna-glazura'),
  (select id from clay_locations where slug='vidzemes-mals'),
  'Tilpums 250 ml', 380,
  'Mazgāt ar rokām.'
),
(
  'Bļoda "Upe"', 'bloda-upe',
  'Sekla bļoda ar ūdens rakstu.',
  'Sekla bļoda no Kurzemes māla ar pelnu glazūru, kas atgādina ūdens virsmu.',
  44.00, 5, 3, 'visible',
  (select id from product_types where slug='bloda'),
  (select id from themes where slug='upe'),
  (select id from firing_styles where slug='pelnu-glazura'),
  (select id from clay_locations where slug='kurzemes-mals'),
  'Ø 20 cm, augstums 5 cm', 560,
  'Mazgāt ar rokām.'
)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Demo product images.
-- NOTE: storage_path values are placeholders. Upload real images
-- through the admin page; the frontend builds alt text from file_name.
-- file_name uses dashes so alt text reads naturally, e.g.
--   "melna bloda latgales mals"
-- ------------------------------------------------------------
insert into product_images (product_id, storage_path, file_name, is_main, sort_order)
select p.id,
       'product-images/' || p.slug || '-1.jpg',
       replace(p.slug, '-', ' ') || ' 1.jpg',
       true, 0
from products p
where not exists (
  select 1 from product_images pi where pi.product_id = p.id
);

-- ------------------------------------------------------------
-- Example site setting.
-- ------------------------------------------------------------
insert into site_settings (key, value) values
  ('shop_intro', '{"lv": "Unikāli keramikas darbi no Latvijas māla."}')
on conflict (key) do nothing;
