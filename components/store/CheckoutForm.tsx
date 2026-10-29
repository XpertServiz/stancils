"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Lock, Tag } from "lucide-react";
import { useCart } from "./CartContext";
import { useQuote } from "./useQuote";
import { DesignArtClient } from "./DesignArtClient";
import { checkout, methodsFor } from "@/app/actions/checkout";
import type { Method } from "@/lib/payments";

type Props = {
  currency: string;
  defaultCountry: string;
  countries: [string, string][];
  initialMethods: Method[];
  customer: { email: string; name: string; phone: string } | null;
};

export function CheckoutForm({ currency, defaultCountry, countries, initialMethods, customer }: Props) {
  const { lines, clear, ready } = useCart();
  const [country, setCountry] = useState(defaultCountry);
  const [methods, setMethods] = useState(initialMethods);
  const [method, setMethod] = useState(initialMethods[0]?.id);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState(customer?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const idem = useMemo(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random())), []);
  const { quote, loading } = useQuote(lines, { country, shippingId, discountCode: code, email: email.includes("@") ? email : null });

  useEffect(() => {
    methodsFor(country).then((m) => {
      setMethods(m);
      setMethod((cur) => (m.some((x) => x.id === cur) ? cur : m[0]?.id));
    });
  }, [country]);

  if (ready && lines.length === 0) {
    return <div className="card p-10 text-center text-ink2">Your cart is empty. <a href="/shop" className="text-accent underline">Browse stencils</a></div>;
  }

  const submit = (fd: FormData) => {
    setError(null);
    start(async () => {
      const r = await checkout({
        idempotencyKey: idem,
        lines,
        email: String(fd.get("email")),
        name: String(fd.get("name")),
        phone: String(fd.get("phone") || "") || undefined,
        line1: String(fd.get("line1")),
        line2: String(fd.get("line2") || "") || undefined,
        city: String(fd.get("city")),
        state: String(fd.get("state") || "") || undefined,
        postcode: String(fd.get("postcode") || "") || undefined,
        country,
        shippingId: quote?.shippingId ?? shippingId,
        discountCode: code,
        paymentMethod: method,
        notes: String(fd.get("notes") || "") || undefined,
        marketing: fd.get("marketing") === "on",
      });
      if (!r.ok) return setError(r.error);
      clear();
      window.location.href = r.redirect;
    });
  };

  return (
    <form action={submit} className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-8">
        <fieldset className="card space-y-3 p-6">
          <legend className="px-1 text-lg font-bold">Contact</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="label">Email</span><input name="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label><span className="label">Phone {method === "cod" && "(required)"}</span><input name="phone" type="tel" className="input" defaultValue={customer?.phone} autoComplete="tel" required={method === "cod"} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" name="marketing" /> Email me new designs and offers</label>
        </fieldset>

        <fieldset className="card space-y-3 p-6">
          <legend className="px-1 text-lg font-bold">{quote?.needsShipping === false ? "Billing details" : "Delivery address"}</legend>
          <label><span className="label">Full name</span><input name="name" required className="input" defaultValue={customer?.name} autoComplete="name" /></label>
          <label><span className="label">Country</span>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
              {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label><span className="label">Address</span><input name="line1" required className="input" autoComplete="address-line1" /></label>
          <input name="line2" className="input" placeholder="Apartment, suite (optional)" autoComplete="address-line2" aria-label="Address line 2" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="label">City</span><input name="city" required className="input" autoComplete="address-level2" /></label>
            <label><span className="label">State / Province</span><input name="state" className="input" autoComplete="address-level1" /></label>
            <label><span className="label">Postcode</span><input name="postcode" className="input" autoComplete="postal-code" /></label>
          </div>
        </fieldset>

        {quote?.needsShipping && (
          <fieldset className="card space-y-2 p-6">
            <legend className="px-1 text-lg font-bold">Shipping</legend>
            {quote.shippingOptions.length === 0 && <p className="text-sm text-danger">{quote.errors.join(" ")}</p>}
            {quote.shippingOptions.map((o) => (
              <label key={o.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${quote.shippingId === o.id ? "border-accent bg-accent/5" : "border-line"}`}>
                <span className="flex items-center gap-3"><input type="radio" name="ship" checked={quote.shippingId === o.id} onChange={() => setShippingId(o.id)} /><span><span className="block font-semibold">{o.name}</span><span className="text-xs text-ink3">{o.days}</span></span></span>
                <span className="font-semibold tabular">{o.price}</span>
              </label>
            ))}
          </fieldset>
        )}

        <fieldset className="card space-y-2 p-6">
          <legend className="px-1 text-lg font-bold">Payment</legend>
          {methods.length === 0 && <p className="text-sm text-danger">No payment methods are available for {currency}. Try another currency.</p>}
          {methods.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === m.id ? "border-accent bg-accent/5" : "border-line"}`}>
              <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
              <span><span className="block font-semibold">{m.label}</span><span className="text-xs text-ink3">{m.hint}</span></span>
            </label>
          ))}
          <label className="block pt-2"><span className="label">Order notes (optional)</span><textarea name="notes" rows={2} className="textarea" /></label>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Order summary</h2>
          {!quote && <div className="skeleton h-40 rounded-xl" />}
          <ul className="space-y-3">
            {quote?.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3">
                <div className="art-tile relative h-14 w-14 shrink-0 rounded-lg p-1.5 text-accent">
                  <DesignArtClient svg={l.svg} uid={`co${l.key}`} />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink3 text-[11px] font-bold text-bg">{l.qty}</span>
                </div>
                <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-semibold">{l.name}</p><p className="line-clamp-1 text-xs text-ink3">{l.variantName}</p>{l.error && <p className="text-xs text-danger">{l.error}</p>}</div>
                <span className="text-sm tabular">{l.total}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <div className="relative flex-1"><Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="Discount code" className="input pl-8 !py-2 text-sm" aria-label="Discount code" /></div>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setCode(codeInput || null)}>Apply</button>
          </div>
          {quote?.discountError && <p className="text-xs text-danger">{quote.discountError}</p>}
          {quote && (
            <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink2">Subtotal</dt><dd className="tabular">{quote.subtotal}</dd></div>
              {quote.discount && <div className="flex justify-between text-mint"><dt>Discount ({quote.discountLabel})</dt><dd className="tabular">−{quote.discount}</dd></div>}
              {quote.shippingFee && <div className="flex justify-between"><dt className="text-ink2">Shipping</dt><dd className="tabular">{quote.shippingFee}</dd></div>}
              {quote.tax && <div className="flex justify-between"><dt className="text-ink2">Tax {quote.taxInclusive && "(included)"}</dt><dd className="tabular">{quote.tax}</dd></div>}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-bold"><dt>Total</dt><dd className="tabular">{quote.total}</dd></div>
            </dl>
          )}
          {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
          <button className="btn btn-primary w-full !py-3.5 text-base" disabled={pending || loading || !quote || !method || (quote?.errors.length ?? 0) > 0}>
            <Lock size={16} />{pending ? "Placing order…" : `Pay ${quote?.total ?? ""}`}
          </button>
          <p className="text-center text-xs text-ink3">Charged in {currency}. Your details are encrypted.</p>
        </div>
      </aside>
    </form>
  );
}
