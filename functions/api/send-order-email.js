// ============================================================
// functions/api/send-order-email.js
//
// Server-side email helper (Cloudflare Pages Function).
//
// Plain static frontends cannot send email securely, so all email
// goes through this server-side code where secrets stay safe.
//
// PROVIDER-NEUTRAL: this file does not assume a specific email
// provider. It builds the Latvian email content and then either:
//   * logs the payload (DEVELOPMENT MODE) when EMAIL_PROVIDER_API_KEY
//     is missing, or
//   * sends via your chosen provider (fill in the TODO).
//
// It is imported by klix-webhook.js. It also exposes an onRequestPost
// handler so it can be tested directly during development.
//
// ⚠️ Never put email secrets in frontend files. Use Cloudflare
//    environment variables only.
// ============================================================

// ------------------------------------------------------------
// buildCustomerEmail(order, items, parcelMachine, ownerEmail)
// Returns { subject, text } in Latvian for the customer.
// ------------------------------------------------------------
function buildCustomerEmail(order, items, parcelMachine, ownerEmail) {
  const lines = items.map(
    (it) => `  • ${it.title_snapshot_lv} × ${it.quantity} — ${formatEur(it.line_total_eur)}`
  ).join("\n");

  const pm = parcelMachine
    ? `${parcelMachine.city_lv} · ${parcelMachine.name_lv} (${parcelMachine.address_lv || ""})`
    : "—";

  const subject = `Jūsu pasūtījums ${order.public_order_number} ir apmaksāts`;
  const text =
`Sveiki, ${order.customer_name}!

Paldies par pirkumu mūsu keramikas darbnīcā. Maksājums ir saņemts.

Pasūtījuma numurs: ${order.public_order_number}

Pasūtītie darbi:
${lines}

Kopā: ${formatEur(order.total_eur)}

Piegāde uz Latvijas Pasta pakomātu:
${pm}

Ja rodas jautājumi, rakstiet mums: ${ownerEmail}

Ar cieņu,
ebKeramika`;

  return { subject, text };
}

// ------------------------------------------------------------
// buildOwnerEmail(order, items, parcelMachine)
// Returns { subject, text } in Latvian for the shop owner.
// ------------------------------------------------------------
function buildOwnerEmail(order, items, parcelMachine) {
  const lines = items.map(
    (it) => `  • ${it.title_snapshot_lv} × ${it.quantity} — ${formatEur(it.line_total_eur)}`
  ).join("\n");

  const pm = parcelMachine
    ? `${parcelMachine.city_lv} · ${parcelMachine.name_lv} (${parcelMachine.address_lv || ""})`
    : "—";

  const subject = `Jauns apmaksāts pasūtījums ${order.public_order_number}`;
  const text =
`Saņemts jauns apmaksāts pasūtījums.

Pasūtījuma numurs: ${order.public_order_number}

Klients: ${order.customer_name}
E-pasts: ${order.customer_email}
Telefons: ${order.customer_phone || "—"}

Pakomāts: ${pm}

Darbi:
${lines}

Kopā: ${formatEur(order.total_eur)}

Klienta komentārs:
${order.customer_comment || "—"}`;

  return { subject, text };
}

function formatEur(value) {
  return Number(value || 0).toFixed(2).replace(".", ",") + " €";
}

// ------------------------------------------------------------
// sendEmail(env, { to, subject, text })
//
// The single place where email is actually delivered.
//
// DEVELOPMENT MODE: if EMAIL_PROVIDER_API_KEY is not set, we just
// log the email and return success. This lets students build and
// test the whole flow without a paid email account.
//
// PRODUCTION: replace the TODO block with a real provider call
// (Resend, Mailgun, SendGrid, Postmark, or SMTP via a worker-
// compatible library). See docs for guidance.
// ------------------------------------------------------------
export async function sendEmail(env, { to, subject, text }) {
  const apiKey = env.EMAIL_PROVIDER_API_KEY;

  if (!apiKey) {
    // Development fallback - log instead of send.
    console.log("[DEV EMAIL] (EMAIL_PROVIDER_API_KEY trūkst, e-pasts netiek sūtīts)");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Text:\n", text);
    return { ok: true, dev: true };
  }

  // ----------------------------------------------------------
  // TODO (PRODUCTION): call your chosen email provider here.
  //
  // Example shape for an HTTP API provider (pseudo - adjust to the
  // real provider's docs):
  //
  //   const res = await fetch("https://api.provider.com/v1/send", {
  //     method: "POST",
  //     headers: {
  //       "Authorization": `Bearer ${apiKey}`,
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       from: env.EMAIL_FROM || "info@example.lv",
  //       to,
  //       subject,
  //       text
  //     })
  //   });
  //   if (!res.ok) {
  //     const body = await res.text();
  //     return { ok: false, error: `Email provider error: ${body}` };
  //   }
  //   return { ok: true };
  // ----------------------------------------------------------

  return {
    ok: false,
    error: "Email provider nav konfigurēts (skat. TODO send-order-email.js)."
  };
}

// ------------------------------------------------------------
// logEmail(supabase, row)
// Records an attempt in the email_log table.
// supabase here is a service-role client passed in by the caller.
// ------------------------------------------------------------
export async function logEmail(supabase, row) {
  try {
    await supabase.from("email_log").insert(row);
  } catch (e) {
    console.error("Neizdevās ierakstīt email_log:", e);
  }
}

// ------------------------------------------------------------
// sendOrderEmails(env, supabase, order, items, parcelMachine)
// High-level helper used by the webhook: sends BOTH the customer
// confirmation and the owner notification, logging each attempt.
// ------------------------------------------------------------
export async function sendOrderEmails(env, supabase, order, items, parcelMachine) {
  const ownerEmail = env.OWNER_EMAIL || "eduards.baumanis0@gmail.com";

  // Customer email.
  const customer = buildCustomerEmail(order, items, parcelMachine, ownerEmail);
  const cRes = await sendEmail(env, { to: order.customer_email, ...customer });
  await logEmail(supabase, {
    order_id: order.id,
    recipient: order.customer_email,
    subject: customer.subject,
    status: cRes.ok ? (cRes.dev ? "dev_logged" : "sent") : "failed",
    error_message: cRes.ok ? null : cRes.error
  });

  // Owner email.
  const owner = buildOwnerEmail(order, items, parcelMachine);
  const oRes = await sendEmail(env, { to: ownerEmail, ...owner });
  await logEmail(supabase, {
    order_id: order.id,
    recipient: ownerEmail,
    subject: owner.subject,
    status: oRes.ok ? (oRes.dev ? "dev_logged" : "sent") : "failed",
    error_message: oRes.ok ? null : oRes.error
  });
}

// ------------------------------------------------------------
// onRequestPost - allows manual testing of the email content.
// POST /api/send-order-email  { "to": "...", "subject": "...", "text": "..." }
// ------------------------------------------------------------
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const result = await sendEmail(env, {
      to: body.to,
      subject: body.subject || "Tests",
      text: body.text || "Testa e-pasts"
    });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
}
