// ============================================================
// checkout.js
//
// Controls the checkout form on cart.html.
//
// FLOW:
//   1. Validate customer fields in the browser (friendly Latvian
//      messages). This is convenience only - the server validates
//      again and is the real source of truth.
//   2. POST the cart + customer data to /api/create-klix-purchase.
//   3. The server recalculates prices, creates the order and asks
//      Klix for a checkout URL.
//   4. The browser redirects the customer to that Klix URL.
//
// We NEVER call Klix directly and NEVER hold any secret here.
// ============================================================

import { supabase, appConfig } from "./supabaseClient.js";
import { escapeHtml, showAlert } from "./utils.js";
import { readCart, clearCart } from "./cart.js";

// ------------------------------------------------------------
// loadParcelMachines(selectEl, searchEl)
// Fills the parcel-machine selector and supports simple searching.
// The machines come from the Supabase parcel_machines table
// (demo data - see ADMIN_GUIDE.md for how to maintain the list).
// ------------------------------------------------------------
export async function loadParcelMachines(selectEl, searchEl) {
  if (!selectEl) return;

  const { data, error } = await supabase
    .from("parcel_machines")
    .select("id, name_lv, city_lv, address_lv, postal_code")
    .eq("active", true)
    .order("city_lv");

  if (error) {
    console.error(error);
    selectEl.innerHTML = '<option value="">Neizdevās ielādēt pakomātus</option>';
    return;
  }

  const machines = data || [];

  function render(list) {
    let html = '<option value="">— Izvēlieties pakomātu —</option>';
    list.forEach((m) => {
      const label = `${m.city_lv} · ${m.name_lv} (${m.address_lv || ""})`;
      html += `<option value="${escapeHtml(m.id)}">${escapeHtml(label)}</option>`;
    });
    selectEl.innerHTML = html;
  }

  render(machines);

  // Simple client-side filtering of the list as the user types.
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const term = searchEl.value.trim().toLowerCase();
      const filtered = machines.filter((m) =>
        (m.city_lv + " " + m.name_lv + " " + (m.address_lv || ""))
          .toLowerCase().includes(term)
      );
      render(filtered);
    });
  }
}

// ------------------------------------------------------------
// validateForm(form)
// Returns { ok, message }. Required: name, email, parcel machine.
// Phone and comment are optional.
// ------------------------------------------------------------
function validateForm(form) {
  const name = form.customer_name.value.trim();
  const email = form.customer_email.value.trim();
  const parcel = form.parcel_machine_id.value;

  if (!name) return { ok: false, message: "Lūdzu ievadiet vārdu un uzvārdu." };
  if (!email) return { ok: false, message: "Lūdzu ievadiet e-pastu." };
  // Very basic email shape check (server validates properly).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Lūdzu ievadiet derīgu e-pasta adresi." };
  }
  if (!parcel) return { ok: false, message: "Lūdzu izvēlieties Latvijas Pasta pakomātu." };
  return { ok: true };
}

// ------------------------------------------------------------
// submitCheckout(form, statusBox)
// Sends the order to the server function and redirects to Klix.
// ------------------------------------------------------------
async function submitCheckout(form, statusBox) {
  const cart = readCart();
  if (cart.length === 0) {
    showAlert(statusBox, "Jūsu grozs ir tukšs.", "error");
    return;
  }

  const check = validateForm(form);
  if (!check.ok) {
    showAlert(statusBox, check.message, "error");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  showAlert(statusBox, "Sagatavo maksājumu...", "info");

  // Only send product id + quantity. The server looks up real prices.
  const payload = {
    items: cart.map((it) => ({ product_id: it.id, quantity: it.quantity })),
    customer: {
      name: form.customer_name.value.trim(),
      email: form.customer_email.value.trim(),
      phone: form.customer_phone.value.trim() || null,
      parcel_machine_id: form.parcel_machine_id.value,
      comment: form.customer_comment.value.trim() || null
    }
  };

  try {
    const response = await fetch(appConfig.API_BASE + "/create-klix-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      const msg = result && result.error
        ? result.error
        : "Neizdevās izveidot maksājumu. Lūdzu mēģiniet vēlreiz.";
      showAlert(statusBox, msg, "error");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    // Remember the order number for the success page (best effort).
    if (result.order_id) {
      sessionStorage.setItem("last_order_id", result.order_id);
    }

    // The cart can be cleared - the order is stored server-side.
    clearCart();

    // Redirect the browser to the Klix hosted checkout.
    window.location.href = result.checkout_url;
  } catch (err) {
    console.error(err);
    showAlert(statusBox,
      "Radās savienojuma kļūda. Lūdzu pārbaudiet internetu un mēģiniet vēlreiz.", "error");
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ------------------------------------------------------------
// initCheckout(form, statusBox)
// Wires up the form submit handler.
// ------------------------------------------------------------
export function initCheckout(form, statusBox) {
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitCheckout(form, statusBox);
  });
}
