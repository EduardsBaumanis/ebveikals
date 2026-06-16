// ============================================================
// product.js
//
// Controls product.html?id=...
// Loads one product, renders the image gallery and all details,
// handles "add to cart" (disabled when sold out), and shows
// related products.
// ============================================================

import { fetchProductById, fetchRelatedProducts } from "./products.js";
import {
  formatPrice, escapeHtml, availabilityLabel, isSoldOut,
  getQueryParam, showAlert
} from "./utils.js";
import { addToCart, updateCartBadge } from "./cart.js";

const container = document.getElementById("product-detail");
const statusBox = document.getElementById("product-status");
const relatedBox = document.getElementById("related-products");

// ------------------------------------------------------------
// galleryHtml(product)
// Main image plus clickable thumbnails.
// ------------------------------------------------------------
function galleryHtml(product) {
  const main = product.mainImage;
  if (!main || !main.url) {
    return `
      <div class="gallery">
        <div class="gallery-placeholder">[ photograph ]</div>
      </div>
    `;
  }

  const thumbs = product.images.filter((img) => img.url).map((img, index) => `
    <button class="gallery-thumb ${index === 0 ? "is-active" : ""}"
            data-url="${escapeHtml(img.url)}"
            data-alt="${escapeHtml(img.alt)}"
            aria-label="Rādīt attēlu ${index + 1}">
      <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" loading="lazy" />
    </button>
  `).join("");

  return `
    <div class="gallery">
      <img id="gallery-main" class="gallery-main"
           src="${escapeHtml(main.url)}" alt="${escapeHtml(main.alt)}" />
      ${product.images.length > 1 ? `<div class="gallery-thumbs">${thumbs}</div>` : ""}
    </div>
  `;
}

// ------------------------------------------------------------
// detailRow(label, value)
// One labelled line in the product spec list (only if value exists).
// ------------------------------------------------------------
function detailRow(label, value) {
  if (!value) return "";
  return `<div class="spec-row"><dt>${escapeHtml(label)}</dt>` +
         `<dd>${escapeHtml(value)}</dd></div>`;
}

// ------------------------------------------------------------
// renderProduct(product)
// ------------------------------------------------------------
function renderProduct(product) {
  document.title = product.title_lv + " – ebKERAMIKA";

  const soldOut = isSoldOut(product);
  const type = product.product_types ? product.product_types.name_lv : "";
  const theme = product.themes ? product.themes.name_lv : "";
  const firing = product.firing_styles ? product.firing_styles.name_lv : "";
  const clay = product.clay_locations ? product.clay_locations.name_lv : "";

  container.innerHTML = `
    <div class="product-layout">
      <div class="product-media">
        ${galleryHtml(product)}
      </div>
      <div class="product-info">
        <p class="product-tagline">Unikāls keramikas darbs</p>
        <h1 class="product-title">${escapeHtml(product.title_lv)}</h1>
        <p class="product-price">${formatPrice(product.price_eur)}</p>
        <p class="product-availability ${soldOut ? "is-sold-out" : ""}">
          ${escapeHtml(availabilityLabel(product))}
        </p>
        <p class="product-made">Izgatavots: ${product.original_quantity} ·
           Pieejams: ${Math.max(product.quantity_left, 0)}</p>

        <p class="product-short">${escapeHtml(product.short_description_lv || "")}</p>

        <div class="product-actions">
          <button id="add-to-cart" class="btn btn-primary" ${soldOut ? "disabled" : ""}>
            ${soldOut ? "Pārdots" : "Pievienot grozam"}
          </button>
          <a class="btn btn-secondary" href="cart.html">Skatīt grozu</a>
        </div>
        <p id="add-status" class="add-status" aria-live="polite"></p>

        <dl class="product-specs">
          ${detailRow("Veids", type)}
          ${detailRow("Tēma", theme)}
          ${detailRow("Glazēšanas / apdedzināšanas stils", firing)}
          ${detailRow("Māla izcelsme", clay)}
          ${detailRow("Izmēri", product.dimensions_lv)}
          ${detailRow("Svars", product.weight_grams ? product.weight_grams + " g" : "")}
          ${detailRow("Kopšana", product.care_instructions_lv)}
        </dl>
      </div>
    </div>

    ${product.long_description_lv ? `
      <section class="product-story">
        <h2>Stāsts</h2>
        <p>${escapeHtml(product.long_description_lv)}</p>
      </section>` : ""}
  `;

  // Gallery thumbnail switching.
  const mainImg = document.getElementById("gallery-main");
  container.querySelectorAll(".gallery-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainImg.src = thumb.getAttribute("data-url");
      mainImg.alt = thumb.getAttribute("data-alt");
      container.querySelectorAll(".gallery-thumb")
        .forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
    });
  });

  // Add to cart.
  const addBtn = document.getElementById("add-to-cart");
  const addStatus = document.getElementById("add-status");
  if (addBtn && !soldOut) {
    addBtn.addEventListener("click", () => {
      const qty = addToCart(product, 1);
      updateCartBadge();
      showAlert(addStatus,
        `Pievienots grozam (${qty} gab.). Grozā: skatīt augšā.`, "success");
    });
  }
}

// ------------------------------------------------------------
// renderRelated(products)
// ------------------------------------------------------------
function renderRelated(products) {
  if (!relatedBox || products.length === 0) return;
  const cards = products.map((p) => `
    <a class="related-card" href="product.html?id=${encodeURIComponent(p.id)}">
      ${p.mainImage && p.mainImage.url
        ? `<img src="${escapeHtml(p.mainImage.url)}" alt="${escapeHtml(p.mainImage.alt)}" loading="lazy" />`
        : '<span class="related-placeholder">[ photograph ]</span>'}
      <span class="related-title">${escapeHtml(p.title_lv)}</span>
      <span class="related-price">${formatPrice(p.price_eur)}</span>
    </a>
  `).join("");
  relatedBox.innerHTML =
    '<h2 class="section-title">Saistītie darbi</h2>' +
    '<div class="related-grid">' + cards + "</div>";
}

// ------------------------------------------------------------
// init()
// ------------------------------------------------------------
async function init() {
  updateCartBadge();
  const id = getQueryParam("id");
  if (!id) {
    showAlert(statusBox, "Nav norādīts darba identifikators.", "error");
    return;
  }

  try {
    const product = await fetchProductById(id);
    if (!product) {
      showAlert(statusBox, "Šāds darbs nav atrasts.", "error");
      return;
    }
    statusBox.innerHTML = "";
    renderProduct(product);

    const related = await fetchRelatedProducts(product, 3);
    renderRelated(related);
  } catch (err) {
    console.error(err);
    showAlert(statusBox, "Neizdevās ielādēt darbu. Lūdzu mēģiniet vēlreiz.", "error");
  }
}

init();
