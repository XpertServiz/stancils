import { db } from "./db";
import { formatMoney } from "./money";
import { banksFor, getSettings } from "./settings";

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Resend when RESEND_API_KEY is set; otherwise logs (mock provider for local dev). */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Creative Corner <orders@creativecorner.shop>";
  if (!key) {
    console.log(`[email:mock] to=${to} subject=${subject}`);
    return { mocked: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status}`);
  return res.json();
}

const COPY: Record<string, { subject: string; lead: string }> = {
  placed: { subject: "We've got your order", lead: "Thanks for your order! We'll email you as soon as payment is confirmed." },
  paid: { subject: "Payment received — your order is confirmed", lead: "Payment received. Here's what happens next." },
  shipped: { subject: "Your stencils are on the way", lead: "Good news — your order has shipped." },
  delivered: { subject: "Delivered! Show us your project", lead: "Your order was delivered. We'd love to see what you make — reply with a photo or leave a review." },
};

export async function sendOrderEmail(orderId: string, kind: keyof typeof COPY) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { downloads: true } } } });
  if (!order) return;
  const s = await getSettings();
  const cur = await db.currency.findUnique({ where: { code: order.currency } });
  const exp = cur?.exponent ?? 2;
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.qty} × ${escape(i.name)}</td><td style="text-align:right">${formatMoney(i.total, order.currency, exp)}</td></tr>`)
    .join("");
  const downloads = order.items.flatMap((i) => i.downloads.map((d) => `<li><a href="${SITE()}/download/${d.token}">${escape(i.name)}</a></li>`)).join("");
  const c = COPY[kind];
  const row = (k: string, v: string) => (v ? `<tr><td style="padding:3px 12px 3px 0;color:#666">${k}</td><td><strong>${escape(v)}</strong></td></tr>` : "");
  const accounts = banksFor(s.payments.banks, order.currency)
    .map((b) => `<table style="margin:6px 0 10px">${row("Bank", b.bankName)}${row("Account title", b.accountTitle)}${row("Account number", b.accountNumber)}${row("IBAN", b.iban)}${row("Branch code", b.branchCode)}${row("SWIFT / BIC", b.swift)}</table>`)
    .join("");
  const bankBlock =
    kind === "placed" && order.paymentMethod === "bank" && order.paymentStatus !== "paid" && accounts
      ? `<div style="border:1px solid #F5C451;border-radius:10px;padding:12px;margin:16px 0"><p style="margin:0 0 8px"><strong>Please transfer to${s.payments.banks.length > 1 ? " any of these accounts" : ""}:</strong></p>${accounts}<table>${row("Amount", formatMoney(order.total, order.currency, exp))}${row("Payment reference", order.number)}</table>${s.payments.bankInstructions ? `<p style="margin:8px 0 0">${escape(s.payments.bankInstructions)}</p>` : ""}</div>`
      : "";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#22242E">
    <h2 style="margin:0 0 8px">${escape(s.business.name)}</h2>
    <p>${c.lead}</p>
    <p><strong>Order ${order.number}</strong></p>
    <table style="width:100%;border-collapse:collapse">${rows}
      <tr><td style="border-top:1px solid #ddd;padding-top:8px"><strong>Total</strong></td><td style="border-top:1px solid #ddd;text-align:right"><strong>${formatMoney(order.total, order.currency, exp)}</strong></td></tr>
    </table>
    ${bankBlock}
    ${order.trackingNumber ? `<p>Tracking: ${escape(order.carrier ?? "")} ${escape(order.trackingNumber)}</p>` : ""}
    ${downloads ? `<p>Your downloads:</p><ul>${downloads}</ul>` : ""}
    <p><a href="${SITE()}/track?order=${order.number}&email=${encodeURIComponent(order.email)}">${bankBlock ? "Upload your receipt / track your order" : "Track your order"}</a></p>
  </div>`;
  await sendEmail(order.email, `${c.subject} (${order.number})`, html);
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
