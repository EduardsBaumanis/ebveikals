// ============================================================
// functions/api/create-klix-purchase.js
//
// Cloudflare Pages Function: POST /api/create-klix-purchase
//
// This is the SECURE checkout endpoint. The browser sends only
// product ids + quantities + customer details. This server code:
//   1. validates the input;
//   2. loads the REAL product data from Supabase (service role key);
//   3. recalculates the total server-side (never trust the browser);
//   4. confirms each product is still available;
//   5. creates the order (status = pending_payment) + order_items;
//   6. asks Klix to create a payment and stores the result;
//   7. returns { ok, checkout_url, order_id }.
//
// Stock is NOT reduced here. Stock is reduced only after Klix
// confirms payment, in klix-webhook.js.
//
// ⚠️ Secrets (SERVICE ROLE key, Klix API key) come ONLY from
//    Cloudflare environment variables. Never expose them to the
//    browser.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // --- Create a SERVICE ROLE Supabase client (server-side only). ---
  // This client bypasses RLS, so it must never be exposed to the browser.
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // --- 1. Parse and validate the request body. ---
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "Nederīgs pieprasījums." }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const customer = body.customer || {};

  if (items.length === 0) {
    return json({ ok: false, error: "Grozs ir tukšs." }, 400);
  }
  if (!customer.name || !customer.email || !customer.parcel_machine_id) {
    return json({ ok: false, error: "Trūkst obligāto klienta datu." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return json({ ok: false, error: "Nederīga e-pasta adrese." }, 400);
  }

  // --- 2. Load real product data for the requested ids. ---
  const ids = items.map((it) => it.product_id);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, title_lv, price_eur, quantity_left, status")
    .in("id", ids);

  if (prodErr) {
    console.error(prodErr);
    return json({ ok: false, error: "Neizdevās ielādēt produktus." }, 500);
  }

  // --- 3 & 4. Recalculate prices and confirm availability. ---
  const orderItems = [];
  let total = 0;

  for (const requested of items) {
    const product = products.find((p) => p.id === requested.product_id);
    if (!product) {
      return json({ ok: false, error: "Kāds darbs vairs nav pieejams." }, 409);
    }
    const qty = Math.floor(Number(requested.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      return json({ ok: false, error: "Nederīgs daudzums." }, 400);
    }
    if (product.status !== "visible" || product.quantity_left < qty) {
      return json({
        ok: false,
        error: `Darbs "${product.title_lv}" vairs nav pieejams pieprasītajā daudzumā.`
      }, 409);
    }

    const unit = Number(product.price_eur);
    const lineTotal = +(unit * qty).toFixed(2);
    total += lineTotal;

    orderItems.push({
      product_id: product.id,
      title_snapshot_lv: product.title_lv,
      unit_price_eur: unit,
      quantity: qty,
      line_total_eur: lineTotal
    });
  }
  total = +total.toFixed(2);

  // --- 5. Create the order (pending_payment) and its items. ---
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      parcel_machine_id: customer.parcel_machine_id,
      customer_comment: customer.comment || null,
      status: "pending_payment",
      payment_provider: "klix",
      total_eur: total
    })
    .select("*")
    .single();

  if (orderErr || !order) {
    console.error(orderErr);
    return json({ ok: false, error: "Neizdevās izveidot pasūtījumu." }, 500);
  }

  const itemsToInsert = orderItems.map((it) => ({ ...it, order_id: order.id }));
  const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);
  if (itemsErr) {
    console.error(itemsErr);
    return json({ ok: false, error: "Neizdevās saglabāt pasūtījuma rindas." }, 500);
  }

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "order_created",
    event_data: { total_eur: total, item_count: orderItems.length }
  });

  // --- 6. Create the Klix purchase. ---
  // The exact request/response shape depends on your Klix merchant
  // documentation. Fill in the TODOs using the official Klix docs.
  // See docs/KLIX_SETUP.md.
  const siteBase = env.SITE_BASE_URL || new URL(request.url).origin;

  try {
    const klix = await createKlixPurchase(env, {
      order,
      total,
      orderItems,
      successUrl: `${siteBase}/checkout-success.html?order=${encodeURIComponent(order.public_order_number)}`,
      cancelUrl: `${siteBase}/cart.html`,
      failureUrl: `${siteBase}/cart.html`
    });

    // Store Klix references on the order.
    await supabase.from("orders").update({
      klix_purchase_id: klix.purchaseId,
      klix_checkout_url: klix.checkoutUrl
    }).eq("id", order.id);

    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "klix_purchase_created",
      event_data: { purchase_id: klix.purchaseId }
    });

    // --- 7. Return the checkout URL to the browser. ---
    return json({ ok: true, checkout_url: klix.checkoutUrl, order_id: order.id });
  } catch (e) {
    console.error("Klix kļūda:", e);
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "klix_purchase_failed",
      event_data: { message: String(e) }
    });
    return json({ ok: false, error: "Neizdevās izveidot maksājumu pie Klix." }, 502);
  }
}

// ------------------------------------------------------------
// createKlixPurchase(env, params)
//
// Calls the Klix "create purchase" endpoint.
//
// ⚠️ IMPORTANT: The exact endpoint path, authentication header and
//    request fields below are PLACEHOLDERS. You MUST replace them
//    with the values from your official Klix by Citadele merchant
//    documentation. Do not assume these are correct.
//
// Required env vars:
//   KLIX_API_BASE_URL  e.g. https://api.klix.app  (sandbox or prod)
//   KLIX_MERCHANT_ID   your merchant id
//   KLIX_API_KEY       your secret API key (server-side only!)
//
// Returns { purchaseId, checkoutUrl }.
// ------------------------------------------------------------
async function createKlixPurchase(env, params) {
  const baseUrl = env.KLIX_API_BASE_URL;
  const apiKey = env.KLIX_API_KEY;
  const merchantId = env.KLIX_MERCHANT_ID;

  if (!baseUrl || !apiKey || !merchantId) {
    throw new Error("Trūkst Klix konfigurācijas (KLIX_API_BASE_URL / KLIX_API_KEY / KLIX_MERCHANT_ID).");
  }

  // TODO (KLIX): Confirm the correct endpoint path from Klix docs.
  const endpoint = `${baseUrl}/api/v1/purchases`;

  // TODO (KLIX): Confirm the correct request body fields. Klix likely
  // expects amounts in CENTS and a currency code. Adjust as documented.
  const requestBody = {
    merchant_id: merchantId,
    amount: Math.round(params.total * 100), // EUR cents - TODO confirm
    currency: "EUR",
    reference: params.order.public_order_number,
    // TODO (KLIX): confirm the field names for redirect URLs.
    success_redirect: params.successUrl,
    cancel_redirect: params.cancelUrl,
    failure_redirect: params.failureUrl,
    // Optional line items - include if Klix supports/needs them.
    items: params.orderItems.map((it) => ({
      title: it.title_snapshot_lv,
      quantity: it.quantity,
      unit_price: Math.round(it.unit_price_eur * 100)
    }))
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      // TODO (KLIX): confirm the correct auth scheme (Bearer? Basic?).
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Klix atbildēja ar ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // TODO (KLIX): map the real response fields to these two values.
  const purchaseId = data.id || data.purchase_id;
  const checkoutUrl = data.checkout_url || data.url || data.redirect_url;

  if (!checkoutUrl) {
    throw new Error("Klix atbildē nav checkout URL (pārbaudiet lauku nosaukumus).");
  }
  return { purchaseId, checkoutUrl };
}
