// ============================================================
// cart.js
//
// The shopping cart, stored ONLY in localStorage.
// No cookies, no tracking, no server calls just to hold the cart.
//
// A cart item looks like:
//   { id, title, price, quantity, quantityLeft, imageUrl }
//
// Other pages import these functions to add/read/update the cart
// and to show the cart badge in the header.
// ============================================================

import { formatPrice, escapeHtml } from "./utils.js";

const STORAGE_KEY = "keramika_cart_v1";

// ------------------------------------------------------------
// readCart() / writeCart(items)
// Low-level access to localStorage with safe JSON parsing.
// ------------------------------------------------------------
export function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    // Corrupted data - start fresh rather than crash the page.
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  updateCartBadge();
}

// ------------------------------------------------------------
// addToCart(product, quantity)
// Adds a product or increases its quantity, never above quantityLeft.
// Returns the new quantity in the cart for that product.
// ------------------------------------------------------------
export function addToCart(product, quantity = 1) {
  const items = readCart();
  const existing = items.find((it) => it.id === product.id);
  const maxQty = product.quantity_left;

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, maxQty);
    existing.quantityLeft = maxQty;
  } else {
    items.push({
      id: product.id,
      title: product.title_lv,
      price: Number(product.price_eur),
      quantity: Math.min(quantity, maxQty),
      quantityLeft: maxQty,
      imageUrl: product.mainImage ? product.mainImage.url : ""
    });
  }
  writeCart(items);
  const found = items.find((it) => it.id === product.id);
  return found ? found.quantity : 0;
}

// ------------------------------------------------------------
// updateQuantity(productId, quantity)
// Sets an explicit quantity, clamped between 1 and quantityLeft.
// ------------------------------------------------------------
export function updateQuantity(productId, quantity) {
  const items = readCart();
  const item = items.find((it) => it.id === productId);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(quantity, item.quantityLeft));
  writeCart(items);
}

// ------------------------------------------------------------
// removeFromCart(productId) / clearCart()
// ------------------------------------------------------------
export function removeFromCart(productId) {
  writeCart(readCart().filter((it) => it.id !== productId));
}

export function clearCart() {
  writeCart([]);
}

// ------------------------------------------------------------
// cartTotal() / cartCount()
// ------------------------------------------------------------
export function cartTotal() {
  return readCart().reduce((sum, it) => sum + it.price * it.quantity, 0);
}

export function cartCount() {
  return readCart().reduce((sum, it) => sum + it.quantity, 0);
}

// ------------------------------------------------------------
// updateCartBadge()
// Updates any element with id="cart-badge" in the header.
// Call this on page load so the count is correct everywhere.
// ------------------------------------------------------------
export function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count > 0 ? String(count) : "";
  badge.hidden = count === 0;
}

// ------------------------------------------------------------
// renderCart(container)
// Draws the cart contents inside the given element (cart.html).
// Wires up quantity controls and remove buttons.
// onChange is called whenever the cart changes so the page can
// refresh the total.
// ------------------------------------------------------------
export function renderCart(container, onChange) {
  const items = readCart();

  if (items.length === 0) {
    container.innerHTML =
      '<p class="cart-empty">Jūsu grozs ir tukšs. ' +
      '<a href="shop.html">Doties uz veikalu</a></p>';
    if (onChange) onChange();
    return;
  }

  const rows = items.map((item) => `
    <li class="cart-item" data-id="${escapeHtml(item.id)}">
      <img class="cart-item-image" src="${escapeHtml(item.imageUrl)}"
           alt="${escapeHtml(item.title)}" loading="lazy" />
      <div class="cart-item-info">
        <h3 class="cart-item-title">${escapeHtml(item.title)}</h3>
        <p class="cart-item-price">${formatPrice(item.price)}</p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-action="decrease"
                aria-label="Samazināt daudzumu">−</button>
        <span class="qty-value" aria-live="polite">${item.quantity}</span>
        <button class="qty-btn" data-action="increase"
                aria-label="Palielināt daudzumu">+</button>
      </div>
      <p class="cart-item-line-total">${formatPrice(item.price * item.quantity)}</p>
      <button class="remove-btn" data-action="remove"
              aria-label="Noņemt no groza">Noņemt</button>
    </li>
  `).join("");

  container.innerHTML = '<ul class="cart-list">' + rows + "</ul>";

  // Attach click handlers using event delegation.
  container.querySelectorAll(".cart-item").forEach((row) => {
    const id = row.getAttribute("data-id");
    row.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const current = readCart().find((it) => it.id === id);
        if (!current) return;
        if (action === "increase") updateQuantity(id, current.quantity + 1);
        if (action === "decrease") updateQuantity(id, current.quantity - 1);
        if (action === "remove") removeFromCart(id);
        renderCart(container, onChange);
      });
    });
  });

  if (onChange) onChange();
}
