// ============================================================
// utils.js
//
// Small reusable helper functions used across the site.
// Kept deliberately simple and well commented for teaching.
// ============================================================

// ------------------------------------------------------------
// formatPrice(value)
// Formats a number as a Latvian-style EUR price, e.g. "48,00 €".
// ------------------------------------------------------------
export function formatPrice(value) {
  const number = Number(value || 0);
  // Latvian uses a comma as the decimal separator.
  return number.toFixed(2).replace(".", ",") + " €";
}

// ------------------------------------------------------------
// altTextFromFileName(fileName)
// Generates readable alt text from an image file name.
// Example:
//   "melna-bloda-latgales-mals.jpg"  ->  "melna bloda latgales mals"
// This means admins never have to type alt text by hand.
// ------------------------------------------------------------
export function altTextFromFileName(fileName) {
  if (!fileName) return "Keramikas darba attēls";
  return fileName
    .replace(/\.[^.]+$/, "")   // remove extension (.jpg, .png, ...)
    .replace(/[_-]+/g, " ")    // dashes / underscores become spaces
    .replace(/\s+/g, " ")      // collapse multiple spaces
    .trim();
}

// ------------------------------------------------------------
// availabilityLabel(product)
// Returns the Latvian "X left of Y" phrasing for a product.
// ------------------------------------------------------------
export function availabilityLabel(product) {
  if (!product) return "";
  if (product.status === "sold_out" || product.quantity_left <= 0) {
    return "Pārdots";
  }
  return "Atlikuši " + product.quantity_left + " no " + product.original_quantity;
}

// ------------------------------------------------------------
// isSoldOut(product)
// True when a product cannot be bought.
// ------------------------------------------------------------
export function isSoldOut(product) {
  return !product || product.status === "sold_out" || product.quantity_left <= 0;
}

// ------------------------------------------------------------
// getQueryParam(name)
// Reads a value from the page URL, e.g. product.html?id=123 -> "123".
// ------------------------------------------------------------
export function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ------------------------------------------------------------
// escapeHtml(text)
// Prevents HTML injection when we insert text into the page.
// Always use this for any value that came from the database.
// ------------------------------------------------------------
export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

// ------------------------------------------------------------
// showAlert(container, message, type)
// Shows a polite Latvian message inside the given element.
// type can be "info", "success" or "error".
// ------------------------------------------------------------
export function showAlert(container, message, type = "info") {
  if (!container) return;
  container.innerHTML =
    '<div class="alert alert-' + type + '" role="status">' +
    escapeHtml(message) +
    "</div>";
}

// ------------------------------------------------------------
// debounce(fn, delayMs)
// Delays running a function until the user stops typing.
// Used for the search box so we do not query on every keystroke.
// ------------------------------------------------------------
export function debounce(fn, delayMs = 250) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}
