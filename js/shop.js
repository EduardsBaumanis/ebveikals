// ============================================================
// shop.js
//
// Controls shop.html: builds filter dropdowns, reads the user's
// choices, asks products.js for matching products and renders the
// product grid. Sold-out products are clearly marked and cannot be
// added to the cart from the grid.
// ============================================================

import {
  fetchProducts, fetchProductTypes, fetchThemes,
  fetchFiringStyles, fetchClayLocations
} from "./products.js";
import {
  formatPrice, escapeHtml, availabilityLabel, isSoldOut,
  showAlert, debounce
} from "./utils.js";
import { updateCartBadge } from "./cart.js";

// Cache DOM references once.
const grid = document.getElementById("product-grid");
const statusBox = document.getElementById("shop-status");

const filters = {
  search: document.getElementById("filter-search"),
  type: document.getElementById("filter-type"),
  theme: document.getElementById("filter-theme"),
  firing: document.getElementById("filter-firing"),
  clay: document.getElementById("filter-clay"),
  availability: document.getElementById("filter-availability"),
  sort: document.getElementById("filter-sort")
};

// ------------------------------------------------------------
// fillSelect(select, items, placeholder)
// Populates a <select> with options built from reference data.
// ------------------------------------------------------------
function fillSelect(select, items, placeholder) {
  if (!select) return;
  let html = `<option value="">${escapeHtml(placeholder)}</option>`;
  items.forEach((item) => {
    html += `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name_lv)}</option>`;
  });
  select.innerHTML = html;
}

// ------------------------------------------------------------
// productCard(product)
// Returns the HTML for one product card in the grid.
// ------------------------------------------------------------
function productCard(product) {
  const soldOut = isSoldOut(product);
  const typeName = product.product_types ? product.product_types.name_lv : "";
  const themeName = product.themes ? product.themes.name_lv : "";
  const image = product.mainImage && product.mainImage.url
    ? `<img class="product-card-image" src="${escapeHtml(product.mainImage.url)}"
               alt="${escapeHtml(product.mainImage.alt)}" loading="lazy" />`
    : '<div class="product-image-placeholder">[ photograph ]</div>';

  return `
    <article class="product-card ${soldOut ? "is-sold-out" : ""}">
      <a class="product-card-link" href="product.html?id=${encodeURIComponent(product.id)}">
        <div class="product-card-image-wrap">
          ${image}
          ${soldOut ? '<span class="badge badge-sold">Pārdots</span>' : ""}
        </div>
        <h3 class="product-card-title">${escapeHtml(product.title_lv)}</h3>
      </a>
      <p class="product-card-meta">
        ${escapeHtml(typeName)}${themeName ? " · " + escapeHtml(themeName) : ""}
      </p>
      <p class="product-card-price">${formatPrice(product.price_eur)}</p>
      <p class="product-card-availability">${escapeHtml(availabilityLabel(product))}</p>
      <a class="btn btn-secondary product-card-cta"
         href="product.html?id=${encodeURIComponent(product.id)}">
        ${soldOut ? "Apskatīt darbu" : "Apskatīt un pirkt"}
      </a>
    </article>
  `;
}

// ------------------------------------------------------------
// loadProducts()
// Reads current filter values and renders the matching products.
// ------------------------------------------------------------
async function loadProducts() {
  showAlert(statusBox, "Ielādē darbus...", "info");
  try {
    const products = await fetchProducts({
      search: filters.search ? filters.search.value.trim() : "",
      productTypeId: filters.type ? filters.type.value : "",
      themeId: filters.theme ? filters.theme.value : "",
      firingStyleId: filters.firing ? filters.firing.value : "",
      clayLocationId: filters.clay ? filters.clay.value : "",
      availability: filters.availability ? filters.availability.value : "",
      sort: filters.sort ? filters.sort.value : "newest"
    });

    if (products.length === 0) {
      grid.innerHTML = "";
      showAlert(statusBox, "Nav atrasts neviens darbs ar šiem filtriem.", "info");
      return;
    }

    statusBox.innerHTML = "";
    grid.innerHTML = products.map(productCard).join("");
  } catch (err) {
    console.error(err);
    grid.innerHTML = "";
    showAlert(statusBox, "Neizdevās ielādēt darbus. Lūdzu mēģiniet vēlreiz.", "error");
  }
}

// ------------------------------------------------------------
// init()
// Loads reference data into the filter dropdowns, wires up events
// and shows the first batch of products.
// ------------------------------------------------------------
async function init() {
  updateCartBadge();

  try {
    const [types, themes, firing, clay] = await Promise.all([
      fetchProductTypes(), fetchThemes(), fetchFiringStyles(), fetchClayLocations()
    ]);
    fillSelect(filters.type, types, "Visi veidi");
    fillSelect(filters.theme, themes, "Visas tēmas");
    fillSelect(filters.firing, firing, "Visi apdedzinājumi");
    fillSelect(filters.clay, clay, "Visas māla vietas");
  } catch (err) {
    console.error("Neizdevās ielādēt filtrus", err);
  }

  // Re-run search as the user types (debounced).
  if (filters.search) {
    filters.search.addEventListener("input", debounce(loadProducts, 300));
  }
  // Re-run immediately when a dropdown changes.
  ["type", "theme", "firing", "clay", "availability", "sort"].forEach((key) => {
    if (filters[key]) filters[key].addEventListener("change", loadProducts);
  });

  // Pre-select a clay location if linked from the homepage map.
  const params = new URLSearchParams(window.location.search);
  if (params.get("clay") && filters.clay) filters.clay.value = params.get("clay");
  if (params.get("theme") && filters.theme) filters.theme.value = params.get("theme");

  await loadProducts();
}

init();
