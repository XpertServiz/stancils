import { bankReady, getSettings } from "../settings";

export type MethodId = "stripe" | "paypal" | "card_demo" | "bank" | "cod" | "b2b_terms";
export type Method = { id: MethodId; label: string; hint: string };

// Currencies each gateway can charge in (subset relevant to this store).
const PAYPAL_CCY = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const paypalEnabled = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export async function availableMethods(currency: string, country: string, opts: { b2bTerms?: boolean } = {}): Promise<Method[]> {
  const s = await getSettings();
  const m: Method[] = [];
  if (stripeEnabled()) m.push({ id: "stripe", label: "Card, Apple Pay or Google Pay", hint: "Secure checkout by Stripe" });
  if (paypalEnabled() && PAYPAL_CCY.has(currency)) m.push({ id: "paypal", label: "PayPal", hint: "Pay with your PayPal account" });
  if (!stripeEnabled() && s.payments.demoCard) m.push({ id: "card_demo", label: "Test card (demo mode)", hint: "No real payment — add STRIPE_SECRET_KEY to accept cards" });
  if (s.payments.bankTransfer && bankReady(s.payments.banks)) m.push({ id: "bank", label: "Bank transfer", hint: `Order is held for ${s.orders.expiryHours}h while we wait for your transfer` });
  if (s.payments.cod && s.payments.codCountries.includes(country)) m.push({ id: "cod", label: "Cash on delivery", hint: "Pay the courier when your order arrives" });
  if (opts.b2bTerms) m.push({ id: "b2b_terms", label: "Invoice (business terms)", hint: "Added to your business account statement" });
  return m;
}
