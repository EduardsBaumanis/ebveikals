// ============================================================
// products.js
//
// Data-access layer for products. Every other page asks this
// module for product data instead of talking to Supabase directly.
// This keeps queries in one place and easy to teach.
// ============================================================

import { supabase, publicImageUrl } from "./supabaseClient.js";
import { altTextFromFileName } from "./utils.js";

// The columns we want, plus related reference data via foreign keys.
// Supabase lets us "join" related tables with this nested syntax.
const PRODUCT_SELECT = `
  id, title_lv, slug, short_description_lv, long_description_lv,
  price_eur, original_quantity, quantity_left, status,
  dimensions_lv, weight_grams, care_instructions_lv, created_at,
  product_type_id, theme_id, firing_style_id, clay_location_id,
  product_types ( id, name_lv, slug ),
  themes ( id, name_lv, slug ),
  firing_styles ( id, name_lv, slug ),
  clay_locations ( id, name_lv, slug, region_lv ),
  product_images ( id, storage_path, file_name, is_main, sort_order )
`;

// ------------------------------------------------------------
// attachImageHelpers(product)
// Adds convenient image fields (main image URL + alt text) so the
// rest of the app does not repeat this logic.
// ------------------------------------------------------------
function attachImageHelpers(product) {
  const images = (product.product_images || [])
    .slice()
    .sort((a, b) => (b.is_main - a.is_main) || (a.sort_order - b.sort_order));

  product.images = images.map((img) => ({
    url: publicImageUrl(img.storage_path),
    alt: altTextFromFileName(img.file_name),
    isMain: img.is_main
  }));

  product.mainImage = product.images[0] || {
    url: "",
    alt: product.title_lv || "Keramikas darbs"
  };
  return product;
}

// ------------------------------------------------------------
// fetchProducts(options)
// Returns the list of public products, with optional filters,
// search and sorting applied at the database level.
// ------------------------------------------------------------
export async function fetchProducts(options = {}) {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    // Only public statuses (RLS also enforces this on the server).
    .in("status", ["visible", "sold_out"]);

  // --- Filters ---
  if (options.productTypeId) query = query.eq("product_type_id", options.productTypeId);
  if (options.themeId)       query = query.eq("theme_id", options.themeId);
  if (options.firingStyleId) query = query.eq("firing_style_id", options.firingStyleId);
  if (options.clayLocationId) query = query.eq("clay_location_id", options.clayLocationId);

  if (options.availability === "available") {
    query = query.eq("status", "visible").gt("quantity_left", 0);
  } else if (options.availability === "sold_out") {
    query = query.or("status.eq.sold_out,quantity_left.eq.0");
  }

  // --- Search by title or description ---
  if (options.search) {
    const term = "%" + options.search + "%";
    query = query.or(
      `title_lv.ilike.${term},short_description_lv.ilike.${term},long_description_lv.ilike.${term}`
    );
  }

  // --- Sorting ---
  switch (options.sort) {
    case "price_asc":
      query = query.order("price_eur", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_eur", { ascending: false });
      break;
    case "quantity_left":
      query = query.order("quantity_left", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(attachImageHelpers);
}

// ------------------------------------------------------------
// fetchProductById(id)
// Returns a single product (for the product detail page).
// ------------------------------------------------------------
export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .in("status", ["visible", "sold_out"])
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachImageHelpers(data);
}

// ------------------------------------------------------------
// fetchFeaturedProducts(limit)
// A few visible products for the homepage.
// ------------------------------------------------------------
export async function fetchFeaturedProducts(limit = 4) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "visible")
    .gt("quantity_left", 0)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(attachImageHelpers);
}

// ------------------------------------------------------------
// fetchRelatedProducts(product, limit)
// Products that share the same theme or clay location.
// ------------------------------------------------------------
export async function fetchRelatedProducts(product, limit = 3) {
  if (!product) return [];
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("status", ["visible", "sold_out"])
    .neq("id", product.id)
    .limit(limit);

  // Match theme OR clay location when those exist.
  const orParts = [];
  if (product.theme_id) orParts.push(`theme_id.eq.${product.theme_id}`);
  if (product.clay_location_id) orParts.push(`clay_location_id.eq.${product.clay_location_id}`);
  if (orParts.length > 0) query = query.or(orParts.join(","));

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(attachImageHelpers);
}

// ------------------------------------------------------------
// Reference data loaders (used by filters and the map).
// ------------------------------------------------------------
export async function fetchProductTypes() {
  const { data, error } = await supabase
    .from("product_types").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function fetchThemes() {
  const { data, error } = await supabase
    .from("themes").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function fetchFiringStyles() {
  const { data, error } = await supabase
    .from("firing_styles").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function fetchClayLocations() {
  const { data, error } = await supabase
    .from("clay_locations").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}
