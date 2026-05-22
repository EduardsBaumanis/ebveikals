// ============================================================
// supabaseClient.js
//
// Creates a single shared Supabase client for the whole frontend.
//
// We load the Supabase JavaScript library from a CDN using an ES
// module import. No build tool is required - the browser does it.
//
// This file ONLY uses the public anon key from config.js, which is
// safe to expose in the browser. Data is protected by Row Level
// Security on the server side.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// config.js must be loaded BEFORE this module (see the <script> tags
// in each HTML page). It defines window.APP_CONFIG.
const config = window.APP_CONFIG;

if (!config || !config.SUPABASE_URL || config.SUPABASE_URL.includes("YOUR-PROJECT")) {
  // Friendly Latvian message if the developer forgot to create config.js.
  console.error(
    "Trūkst konfigurācijas. Nokopējiet js/config.example.js uz js/config.js " +
    "un ievadiet savus Supabase datus."
  );
}

// The shared client instance used by every other module.
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

// Convenience export so other modules can read config values.
export const appConfig = config;

// Build the full public URL for an image stored in Supabase Storage.
// storagePath is the path saved in product_images.storage_path.
export function publicImageUrl(storagePath) {
  if (!storagePath) return "";
  // If a full URL was stored, just use it.
  if (storagePath.startsWith("http")) return storagePath;
  // Remove an accidental leading bucket prefix if present.
  const bucket = config.STORAGE_BUCKET;
  let path = storagePath;
  if (path.startsWith(bucket + "/")) {
    path = path.slice(bucket.length + 1);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
