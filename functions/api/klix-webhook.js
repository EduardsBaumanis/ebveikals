// ============================================================
// functions/api/klix-webhook.js
//
// Cloudflare Pages Function: POST /api/klix-webhook
//
// Klix calls this URL after a payment is completed (or fails).
// This endpoint:
//   1. verifies the request is genuinely from Klix;
//   2. finds the matching order;
//   3. on success: reduces stock ONCE (idempotent DB function),
//      marks the order paid, logs an event, sends emails;
//   4. on failure/cancel: updates the order status and logs.
//
// IDEMPOTENCY: Klix may send the same notification more than once.
// The database function reduce_stock_after_payment only acts on
// orders still in 'pending_payment', so repeated calls are safe and
// never reduce stock twice.
//
// ⚠️ Secrets come ONLY from Cloudflare environment variables.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrderEmails } from "./send-order-email.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Read the raw body first - signature verification often needs the
  // exact bytes, not the parsed object.
  const rawBody = await request.text();

  // --- 1. Verify authenticity. ---
  const verified = await verifyKlixSignature(env, request, rawBody);
  if (!verified) {
    return json({ ok: false, error: "Nederīgs paraksts." }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return json({ ok: false, error: "Nederīgs JSON." }, 400);
  }

  // TODO (KLIX): map these to the real fields in the Klix webhook.
  const purchaseId = payload.id || payload.purchase_id;
  const reference = payload.reference;       // our public_order_number
  const status = payload.status;             // e.g. "paid" / "completed" / "failed"

  // --- 2. Find the matching order (by Klix id or our reference). ---
  let order = null;
  if (purchaseId) {
    const res = await supabase.from("orders").select("*")
      .eq("klix_purchase_id", purchaseId).maybeSingle();
    order = res.data;
  }
  if (!order && reference) {
    const res = await supabase.from("orders").select("*")
      .eq("public_order_number", reference).maybeSingle();
    order = res.data;
  }

  if (!order) {
    // Log nothing sensitive; just acknowledge so Klix stops retrying
    // an unknown reference, but report 404 for our own logs.
    console.error("Webhook: pasūtījums nav atrasts", { purchaseId, reference });
    return json({ ok: false, error: "Pasūtījums nav atrasts." }, 404);
  }

  // Always record that we received a webhook (audit trail).
  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "klix_webhook_received",
    event_data: { status, purchase_id: purchaseId }
  });

  // --- 3. Handle the payment outcome. ---
  // TODO (KLIX): adjust these status strings to match Klix docs.
  const isPaid = ["paid", "completed", "approved", "success"].includes(
    String(status).toLowerCase()
  );
  const isFailed = ["failed", "cancelled", "declined", "error"].includes(
    String(status).toLowerCase()
  );

  if (isPaid) {
    // Reduce stock and mark paid - returns false if already processed.
    const { data: reduced, error: rpcErr } = await supabase
      .rpc("reduce_stock_after_payment", { p_order_id: order.id });

    if (rpcErr) {
      console.error("reduce_stock_after_payment kļūda:", rpcErr);
      return json({ ok: false, error: "Krājuma atjaunošana neizdevās." }, 500);
    }

    // Only send emails the FIRST time (when stock was actually reduced).
    if (reduced === true) {
      // Reload the order (now it has paid_at) and its items.
      const { data: freshOrder } = await supabase
        .from("orders")
        .select("*, parcel_machines ( name_lv, city_lv, address_lv )")
        .eq("id", order.id).single();
      const { data: items } = await supabase
        .from("order_items").select("*").eq("order_id", order.id);

      await sendOrderEmails(
        env, supabase, freshOrder, items || [], freshOrder.parcel_machines
      );
    }

    return json({ ok: true, processed: reduced === true });
  }

  if (isFailed) {
    // Only move a still-pending order to failed/cancelled.
    if (order.status === "pending_payment") {
      const newStatus = String(status).toLowerCase() === "cancelled"
        ? "cancelled" : "failed";
      await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
      await supabase.from("order_events").insert({
        order_id: order.id,
        event_type: "payment_" + newStatus,
        event_data: { status }
      });
    }
    return json({ ok: true, processed: false });
  }

  // Unknown / intermediate status - acknowledge without changes.
  return json({ ok: true, ignored: true });
}

// ------------------------------------------------------------
// verifyKlixSignature(env, request, rawBody)
//
// Confirms the webhook really came from Klix.
//
// ⚠️ IMPORTANT: The exact verification method is defined by Klix.
//    Common patterns are an HMAC-SHA256 signature in a header, or a
//    shared secret. Replace the placeholder below with the official
//    Klix method. Do NOT ship to production with the placeholder
//    that only checks a shared secret header.
//
// Required env var: KLIX_WEBHOOK_SECRET
// ------------------------------------------------------------
async function verifyKlixSignature(env, request, rawBody) {
  const secret = env.KLIX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Trūkst KLIX_WEBHOOK_SECRET - webhook netiek pārbaudīts!");
    return false;
  }

  // TODO (KLIX): replace with the official signature scheme.
  //
  // Example HMAC-SHA256 verification (pseudo - confirm header name
  // and encoding from Klix docs):
  //
  //   const signatureHeader = request.headers.get("X-Klix-Signature");
  //   const key = await crypto.subtle.importKey(
  //     "raw", new TextEncoder().encode(secret),
  //     { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  //   );
  //   const mac = await crypto.subtle.sign(
  //     "HMAC", key, new TextEncoder().encode(rawBody)
  //   );
  //   const expected = [...new Uint8Array(mac)]
  //     .map((b) => b.toString(16).padStart(2, "0")).join("");
  //   return timingSafeEqual(expected, signatureHeader);
  //
  // PLACEHOLDER (development only): compare a shared secret header.
  const provided = request.headers.get("X-Webhook-Secret");
  return provided === secret;
}
