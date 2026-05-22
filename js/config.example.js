// ============================================================
// config.example.js
//
// COPY this file to "config.js" and fill in your own values.
//   cp js/config.example.js js/config.js
//
// config.js is git-ignored so your values are never committed.
//
// ⚠️ NEVER paste secret keys into any frontend file. ⚠️
// The browser can ONLY use:
//   * the Supabase project URL
//   * the Supabase ANON (public) key
// These are safe to expose because Row Level Security protects data.
//
// The SERVICE ROLE key, Klix secrets and email secrets must ONLY
// live in Cloudflare environment variables (server-side).
// See docs/CLOUDFLARE_SETUP.md.
// ============================================================

window.APP_CONFIG = {
  // Found in Supabase: Project Settings > API > Project URL
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",

  // Found in Supabase: Project Settings > API > Project API keys > anon public
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",

  // Name of the public Storage bucket that holds product images.
  STORAGE_BUCKET: "product-images",

  // Base path for the Cloudflare Pages Functions (usually "/api").
  API_BASE: "/api"
};
