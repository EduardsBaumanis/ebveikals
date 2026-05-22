// ============================================================
// admin.js
//
// The custom CMS / admin panel for admin.html.
//
// SECURITY MODEL:
//   * Login uses Supabase Auth (email + password).
//   * After login we check the admin_users table. If the user is
//     NOT listed there, we deny access.
//   * The REAL protection is Row Level Security in the database:
//     even if someone bypassed this UI, RLS blocks writes from
//     non-admin users. The frontend check is only for nice UX.
// ============================================================

import { supabase, appConfig, publicImageUrl } from "./supabaseClient.js";
import { formatPrice, escapeHtml, altTextFromFileName, showAlert } from "./utils.js";

// --- DOM sections ---
const loginSection = document.getElementById("admin-login");
const panelSection = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const logoutBtn = document.getElementById("logout-btn");
const adminEmailLabel = document.getElementById("admin-email");

// Reference data cache, loaded once after login.
let reference = { types: [], themes: [], firing: [], clay: [] };

// ============================================================
// AUTH
// ============================================================

// Check whether the logged-in user is an admin (row in admin_users).
async function checkIsAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

// Show either the login screen or the admin panel.
async function refreshAuthUi() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    loginSection.hidden = false;
    panelSection.hidden = true;
    return;
  }

  const admin = await checkIsAdmin(session.user.id);
  if (!admin) {
    loginSection.hidden = false;
    panelSection.hidden = true;
    showAlert(loginStatus,
      "Šim lietotājam nav administratora tiesību. Sazinieties ar veikala īpašnieku.",
      "error");
    await supabase.auth.signOut();
    return;
  }

  loginSection.hidden = true;
  panelSection.hidden = false;
  if (adminEmailLabel) adminEmailLabel.textContent = session.user.email;

  await loadEverything();
}

function initAuth() {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showAlert(loginStatus, "Pieslēdzas...", "info");
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert(loginStatus, "Nepareizs e-pasts vai parole.", "error");
      return;
    }
    loginStatus.innerHTML = "";
    await refreshAuthUi();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      await refreshAuthUi();
    });
  }
}

// ============================================================
// LOAD DATA
// ============================================================

async function loadEverything() {
  await loadReference();
  await Promise.all([
    loadDashboard(),
    loadProducts(),
    loadOrders(),
    renderReferenceManager()
  ]);
}

async function loadReference() {
  const [types, themes, firing, clay] = await Promise.all([
    supabase.from("product_types").select("*").order("sort_order"),
    supabase.from("themes").select("*").order("sort_order"),
    supabase.from("firing_styles").select("*").order("sort_order"),
    supabase.from("clay_locations").select("*").order("sort_order")
  ]);
  reference = {
    types: types.data || [],
    themes: themes.data || [],
    firing: firing.data || [],
    clay: clay.data || []
  };
}

// ------------------------------------------------------------
// Dashboard summary counts.
// ------------------------------------------------------------
async function loadDashboard() {
  const box = document.getElementById("dashboard");
  if (!box) return;

  // head:true + count:'exact' returns only the count, not the rows.
  const counts = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "sold_out"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid")
  ]);

  const [products, soldOut, pending, paid] = counts.map((c) => c.count || 0);

  box.innerHTML = `
    <div class="stat"><span class="stat-num">${products}</span><span class="stat-label">Darbi</span></div>
    <div class="stat"><span class="stat-num">${soldOut}</span><span class="stat-label">Pārdoti</span></div>
    <div class="stat"><span class="stat-num">${pending}</span><span class="stat-label">Gaida apmaksu</span></div>
    <div class="stat"><span class="stat-num">${paid}</span><span class="stat-label">Apmaksāti</span></div>
  `;
}

// ============================================================
// PRODUCTS
// ============================================================

function refSelect(name, items, selectedId) {
  let html = `<option value="">—</option>`;
  items.forEach((item) => {
    const sel = item.id === selectedId ? "selected" : "";
    html += `<option value="${escapeHtml(item.id)}" ${sel}>${escapeHtml(item.name_lv)}</option>`;
  });
  return `<select name="${name}">${html}</select>`;
}

async function loadProducts() {
  const tbody = document.getElementById("products-tbody");
  if (!tbody) return;

  const { data, error } = await supabase
    .from("products")
    .select("id, title_lv, price_eur, original_quantity, quantity_left, status")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Neizdevās ielādēt darbus.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Vēl nav neviena darba.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((p) => `
    <tr>
      <td>${escapeHtml(p.title_lv)}</td>
      <td>${formatPrice(p.price_eur)}</td>
      <td>${p.quantity_left} / ${p.original_quantity}</td>
      <td><span class="status-tag status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
      <td>
        <button class="btn btn-small" data-edit="${escapeHtml(p.id)}">Rediģēt</button>
        <button class="btn btn-small btn-danger" data-delete="${escapeHtml(p.id)}">Dzēst</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openProductEditor(btn.getAttribute("data-edit"))));
  tbody.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteProduct(btn.getAttribute("data-delete"))));
}

// Open the editor for a new product (id = null) or existing one.
async function openProductEditor(id) {
  const editor = document.getElementById("product-editor");
  if (!editor) return;

  let product = {
    title_lv: "", slug: "", short_description_lv: "", long_description_lv: "",
    price_eur: 0, original_quantity: 1, quantity_left: 1, status: "hidden",
    product_type_id: "", theme_id: "", firing_style_id: "", clay_location_id: "",
    dimensions_lv: "", weight_grams: "", care_instructions_lv: ""
  };
  let images = [];

  if (id) {
    const { data } = await supabase.from("products").select("*").eq("id", id).single();
    if (data) product = data;
    const imgRes = await supabase.from("product_images")
      .select("*").eq("product_id", id).order("sort_order");
    images = imgRes.data || [];
  }

  const statusOptions = ["visible", "hidden", "sold_out", "archived"]
    .map((s) => `<option value="${s}" ${product.status === s ? "selected" : ""}>${s}</option>`)
    .join("");

  editor.innerHTML = `
    <form id="product-form" class="admin-form">
      <input type="hidden" name="id" value="${escapeHtml(id || "")}" />
      <h3>${id ? "Rediģēt darbu" : "Jauns darbs"}</h3>

      <label>Nosaukums
        <input name="title_lv" value="${escapeHtml(product.title_lv)}" required />
      </label>
      <label>Slug (URL daļa, neobligāts)
        <input name="slug" value="${escapeHtml(product.slug || "")}" />
      </label>
      <label>Īss apraksts
        <textarea name="short_description_lv" rows="2">${escapeHtml(product.short_description_lv || "")}</textarea>
      </label>
      <label>Garais stāsts
        <textarea name="long_description_lv" rows="4">${escapeHtml(product.long_description_lv || "")}</textarea>
      </label>

      <div class="form-row">
        <label>Cena (EUR)
          <input name="price_eur" type="number" step="0.01" min="0" value="${product.price_eur}" required />
        </label>
        <label>Izgatavots (kopā)
          <input name="original_quantity" type="number" min="0" value="${product.original_quantity}" required />
        </label>
        <label>Atlikuši
          <input name="quantity_left" type="number" min="0" value="${product.quantity_left}" required />
        </label>
      </div>

      <div class="form-row">
        <label>Statuss <select name="status">${statusOptions}</select></label>
        <label>Veids ${refSelect("product_type_id", reference.types, product.product_type_id)}</label>
        <label>Tēma ${refSelect("theme_id", reference.themes, product.theme_id)}</label>
      </div>
      <div class="form-row">
        <label>Apdedzinājums ${refSelect("firing_style_id", reference.firing, product.firing_style_id)}</label>
        <label>Māla vieta ${refSelect("clay_location_id", reference.clay, product.clay_location_id)}</label>
      </div>

      <div class="form-row">
        <label>Izmēri <input name="dimensions_lv" value="${escapeHtml(product.dimensions_lv || "")}" /></label>
        <label>Svars (g) <input name="weight_grams" type="number" min="0" value="${product.weight_grams || ""}" /></label>
      </div>
      <label>Kopšanas norādes
        <textarea name="care_instructions_lv" rows="2">${escapeHtml(product.care_instructions_lv || "")}</textarea>
      </label>

      <div class="admin-actions">
        <button type="submit" class="btn btn-primary">Saglabāt</button>
        <button type="button" id="cancel-edit" class="btn btn-secondary">Aizvērt</button>
      </div>
      <p id="product-form-status" aria-live="polite"></p>
    </form>

    ${id ? `
    <div class="image-manager">
      <h4>Attēli</h4>
      <div id="image-list" class="image-list"></div>
      <label class="upload-label">Augšupielādēt attēlus
        <input id="image-upload" type="file" accept="image/*" multiple />
      </label>
      <p class="hint">Pirmais attēls vai atzīmētais kļūst par galveno. Alt teksts tiek veidots no faila nosaukuma.</p>
    </div>` : `<p class="hint">Saglabājiet darbu, lai pievienotu attēlus.</p>`}
  `;

  editor.hidden = false;
  editor.scrollIntoView({ behavior: "smooth" });

  document.getElementById("cancel-edit").addEventListener("click", () => {
    editor.hidden = true;
    editor.innerHTML = "";
  });

  document.getElementById("product-form").addEventListener("submit", saveProduct);

  if (id) {
    renderImageList(id, images);
    document.getElementById("image-upload").addEventListener("change", (e) =>
      uploadImages(id, e.target.files));
  }
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const statusBox = document.getElementById("product-form-status");
  const id = form.id.value;

  const payload = {
    title_lv: form.title_lv.value.trim(),
    slug: form.slug.value.trim() || null,
    short_description_lv: form.short_description_lv.value.trim() || null,
    long_description_lv: form.long_description_lv.value.trim() || null,
    price_eur: Number(form.price_eur.value),
    original_quantity: Number(form.original_quantity.value),
    quantity_left: Number(form.quantity_left.value),
    status: form.status.value,
    product_type_id: form.product_type_id.value || null,
    theme_id: form.theme_id.value || null,
    firing_style_id: form.firing_style_id.value || null,
    clay_location_id: form.clay_location_id.value || null,
    dimensions_lv: form.dimensions_lv.value.trim() || null,
    weight_grams: form.weight_grams.value ? Number(form.weight_grams.value) : null,
    care_instructions_lv: form.care_instructions_lv.value.trim() || null
  };

  if (payload.quantity_left > payload.original_quantity) {
    showAlert(statusBox, "Atlikušais daudzums nevar pārsniegt izgatavoto daudzumu.", "error");
    return;
  }

  let result;
  if (id) {
    result = await supabase.from("products").update(payload).eq("id", id);
  } else {
    result = await supabase.from("products").insert(payload).select("id").single();
  }

  if (result.error) {
    console.error(result.error);
    showAlert(statusBox, "Neizdevās saglabāt: " + result.error.message, "error");
    return;
  }

  showAlert(statusBox, "Saglabāts.", "success");
  await Promise.all([loadProducts(), loadDashboard()]);

  // For a brand-new product, reopen the editor so images can be added.
  if (!id && result.data && result.data.id) {
    openProductEditor(result.data.id);
  }
}

// Delete safely: if the product has paid orders, archive instead.
async function deleteProduct(id) {
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (count && count > 0) {
    const ok = confirm(
      "Šim darbam ir saistīti pasūtījumi, tāpēc to nevar dzēst. " +
      "Vai arhivēt to (paslēpt no veikala)?"
    );
    if (!ok) return;
    const { error } = await supabase.from("products")
      .update({ status: "archived" }).eq("id", id);
    if (error) alert("Neizdevās arhivēt: " + error.message);
  } else {
    const ok = confirm("Vai tiešām dzēst šo darbu? Šo darbību nevar atsaukt.");
    if (!ok) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("Neizdevās dzēst: " + error.message);
  }
  await Promise.all([loadProducts(), loadDashboard()]);
}

// ============================================================
// PRODUCT IMAGES
// ============================================================

function renderImageList(productId, images) {
  const box = document.getElementById("image-list");
  if (!box) return;
  if (images.length === 0) {
    box.innerHTML = "<p>Vēl nav attēlu.</p>";
    return;
  }
  box.innerHTML = images.map((img) => `
    <figure class="image-item ${img.is_main ? "is-main" : ""}">
      <img src="${escapeHtml(publicImageUrl(img.storage_path))}"
           alt="${escapeHtml(altTextFromFileName(img.file_name))}" />
      <figcaption>${escapeHtml(img.file_name)}</figcaption>
      <div class="image-item-actions">
        <button class="btn btn-small" data-main="${escapeHtml(img.id)}"
                ${img.is_main ? "disabled" : ""}>
          ${img.is_main ? "Galvenais" : "Padarīt galveno"}
        </button>
        <button class="btn btn-small btn-danger" data-imgdel="${escapeHtml(img.id)}">Dzēst</button>
      </div>
    </figure>
  `).join("");

  box.querySelectorAll("[data-main]").forEach((btn) =>
    btn.addEventListener("click", () => setMainImage(productId, btn.getAttribute("data-main"))));
  box.querySelectorAll("[data-imgdel]").forEach((btn) =>
    btn.addEventListener("click", () => deleteImage(productId, btn.getAttribute("data-imgdel"))));
}

async function reloadImages(productId) {
  const { data } = await supabase.from("product_images")
    .select("*").eq("product_id", productId).order("sort_order");
  renderImageList(productId, data || []);
}

async function uploadImages(productId, fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  // How many images already exist (to set sort_order and is_main).
  const { count } = await supabase.from("product_images")
    .select("id", { count: "exact", head: true }).eq("product_id", productId);
  let existing = count || 0;

  for (const file of files) {
    // Keep the original file name (it powers the alt text) but make
    // the storage path unique to avoid collisions.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `${productId}/${Date.now()}-${safeName}`;

    const upload = await supabase.storage
      .from(appConfig.STORAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (upload.error) {
      alert("Neizdevās augšupielādēt " + file.name + ": " + upload.error.message);
      continue;
    }

    await supabase.from("product_images").insert({
      product_id: productId,
      storage_path: path,
      file_name: file.name,        // original name -> readable alt text
      is_main: existing === 0,     // first image becomes main
      sort_order: existing
    });
    existing += 1;
  }

  await reloadImages(productId);
}

// Ensure only ONE main image per product.
async function setMainImage(productId, imageId) {
  await supabase.from("product_images")
    .update({ is_main: false }).eq("product_id", productId);
  await supabase.from("product_images")
    .update({ is_main: true }).eq("id", imageId);
  await reloadImages(productId);
}

async function deleteImage(productId, imageId) {
  const { data } = await supabase.from("product_images")
    .select("storage_path, is_main").eq("id", imageId).single();
  if (data) {
    await supabase.storage.from(appConfig.STORAGE_BUCKET).remove([data.storage_path]);
  }
  await supabase.from("product_images").delete().eq("id", imageId);

  // If we removed the main image, promote the first remaining one.
  if (data && data.is_main) {
    const { data: rest } = await supabase.from("product_images")
      .select("id").eq("product_id", productId).order("sort_order").limit(1);
    if (rest && rest.length > 0) {
      await supabase.from("product_images").update({ is_main: true }).eq("id", rest[0].id);
    }
  }
  await reloadImages(productId);
}

// ============================================================
// ORDERS
// ============================================================

async function loadOrders() {
  const tbody = document.getElementById("orders-tbody");
  const filter = document.getElementById("orders-filter");
  if (!tbody) return;

  const statusFilter = filter ? filter.value : "";
  let query = supabase
    .from("orders")
    .select("id, public_order_number, customer_name, customer_email, total_eur, status, created_at")
    .order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Neizdevās ielādēt pasūtījumus.</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nav pasūtījumu.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((o) => `
    <tr>
      <td>${escapeHtml(o.public_order_number || o.id)}</td>
      <td>${escapeHtml(o.customer_name)}</td>
      <td>${formatPrice(o.total_eur)}</td>
      <td><span class="status-tag status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
      <td>${new Date(o.created_at).toLocaleDateString("lv-LV")}</td>
      <td><button class="btn btn-small" data-order="${escapeHtml(o.id)}">Detaļas</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-order]").forEach((btn) =>
    btn.addEventListener("click", () => openOrder(btn.getAttribute("data-order"))));

  if (filter && !filter.dataset.wired) {
    filter.addEventListener("change", loadOrders);
    filter.dataset.wired = "1";
  }
}

async function openOrder(id) {
  const box = document.getElementById("order-detail");
  if (!box) return;

  const { data: order } = await supabase
    .from("orders")
    .select("*, parcel_machines ( name_lv, city_lv, address_lv )")
    .eq("id", id).single();
  const { data: items } = await supabase
    .from("order_items").select("*").eq("order_id", id);

  if (!order) return;

  const pm = order.parcel_machines;
  const itemRows = (items || []).map((it) => `
    <tr><td>${escapeHtml(it.title_snapshot_lv)}</td>
        <td>${it.quantity}</td>
        <td>${formatPrice(it.unit_price_eur)}</td>
        <td>${formatPrice(it.line_total_eur)}</td></tr>
  `).join("");

  box.innerHTML = `
    <h3>Pasūtījums ${escapeHtml(order.public_order_number || order.id)}</h3>
    <p><strong>Vārds:</strong> ${escapeHtml(order.customer_name)}</p>
    <p><strong>E-pasts:</strong> ${escapeHtml(order.customer_email)}</p>
    <p><strong>Telefons:</strong> ${escapeHtml(order.customer_phone || "—")}</p>
    <p><strong>Pakomāts:</strong> ${pm ? escapeHtml(pm.city_lv + " · " + pm.name_lv + " (" + (pm.address_lv || "") + ")") : "—"}</p>
    <p><strong>Komentārs:</strong> ${escapeHtml(order.customer_comment || "—")}</p>
    <p><strong>Statuss:</strong> ${escapeHtml(order.status)}</p>
    <table class="admin-table">
      <thead><tr><th>Darbs</th><th>Skaits</th><th>Cena</th><th>Summa</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p><strong>Kopā:</strong> ${formatPrice(order.total_eur)}</p>
    <div class="admin-actions">
      ${order.status === "pending_payment"
        ? `<button class="btn btn-danger" id="cancel-order">Atcelt pasūtījumu</button>` : ""}
      <button class="btn btn-secondary" id="close-order">Aizvērt</button>
    </div>
    <p class="hint">Pasūtījumu NEDRĪKST manuāli atzīmēt kā apmaksātu, izņemot dokumentētu ārkārtas gadījumu. Apmaksu apstiprina Klix maksājuma sistēma.</p>
    <p id="order-status" aria-live="polite"></p>
  `;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth" });

  document.getElementById("close-order").addEventListener("click", () => {
    box.hidden = true; box.innerHTML = "";
  });
  const cancelBtn = document.getElementById("cancel-order");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      if (!confirm("Atcelt šo pasūtījumu?")) return;
      const { error } = await supabase.from("orders")
        .update({ status: "cancelled" }).eq("id", id);
      const st = document.getElementById("order-status");
      if (error) { showAlert(st, "Neizdevās: " + error.message, "error"); return; }
      showAlert(st, "Pasūtījums atcelts.", "success");
      await Promise.all([loadOrders(), loadDashboard()]);
    });
  }
}

// ============================================================
// REFERENCE MANAGER (types, themes, styles, clay, parcel machines)
// ============================================================

const REF_TABLES = [
  { table: "product_types",  title: "Produktu veidi",  fields: ["name_lv", "slug", "sort_order"] },
  { table: "themes",         title: "Tēmas",           fields: ["name_lv", "slug", "description_lv", "sort_order"] },
  { table: "firing_styles",  title: "Apdedzināšanas stili", fields: ["name_lv", "slug", "description_lv", "sort_order"] },
  { table: "clay_locations", title: "Māla vietas",     fields: ["name_lv", "slug", "region_lv", "latitude", "longitude", "description_lv", "story_lv", "sort_order"] },
  { table: "parcel_machines",title: "Pakomāti",        fields: ["name_lv", "city_lv", "address_lv", "postal_code", "active"] }
];

async function renderReferenceManager() {
  const root = document.getElementById("reference-manager");
  if (!root) return;

  let html = "";
  for (const def of REF_TABLES) {
    const { data } = await supabase.from(def.table).select("*").limit(200);
    const rows = (data || []).map((row) => `
      <li class="ref-row">
        <span>${escapeHtml(row.name_lv || "")}</span>
        <button class="btn btn-small btn-danger" data-reftable="${def.table}" data-refid="${escapeHtml(row.id)}">Dzēst</button>
      </li>`).join("");

    const inputs = def.fields.map((f) =>
      `<input name="${f}" placeholder="${f}" ${f === "active" ? 'value="true"' : ""} />`
    ).join("");

    html += `
      <details class="ref-block">
        <summary>${escapeHtml(def.title)}</summary>
        <ul class="ref-list">${rows || "<li>Nav ierakstu.</li>"}</ul>
        <form class="ref-form" data-reftable="${def.table}">
          ${inputs}
          <button type="submit" class="btn btn-small btn-primary">Pievienot</button>
        </form>
      </details>`;
  }
  root.innerHTML = html;

  root.querySelectorAll(".ref-form").forEach((form) =>
    form.addEventListener("submit", (e) => addReferenceRow(e, form)));
  root.querySelectorAll("[data-reftable][data-refid]").forEach((btn) =>
    btn.addEventListener("click", () => deleteReferenceRow(
      btn.getAttribute("data-reftable"), btn.getAttribute("data-refid"))));
}

async function addReferenceRow(e, form) {
  e.preventDefault();
  const table = form.getAttribute("data-reftable");
  const payload = {};
  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    let value = el.value.trim();
    if (value === "") return;
    if (el.name === "active") value = (value === "true" || value === "1");
    if (["sort_order", "latitude", "longitude"].includes(el.name)) value = Number(value);
    payload[el.name] = value;
  });
  const { error } = await supabase.from(table).insert(payload);
  if (error) { alert("Neizdevās pievienot: " + error.message); return; }
  await loadReference();
  await renderReferenceManager();
}

async function deleteReferenceRow(table, id) {
  if (!confirm("Dzēst šo ierakstu?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) { alert("Neizdevās dzēst: " + error.message); return; }
  await loadReference();
  await renderReferenceManager();
}

// ============================================================
// "New product" button + boot
// ============================================================
const newProductBtn = document.getElementById("new-product-btn");
if (newProductBtn) newProductBtn.addEventListener("click", () => openProductEditor(null));

initAuth();
refreshAuthUi();
