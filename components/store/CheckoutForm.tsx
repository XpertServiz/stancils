"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { useCart } from "./CartContext";
import { useQuote } from "./useQuote";
import { Thumb } from "./Thumb";
import { checkout, methodsFor } from "@/app/actions/checkout";
import type { Method } from "@/lib/payments";
import type { BankAccount } from "@/lib/settings";
import { BankDetailsCard } from "./BankDetailsCard";
import { NOTE_KEY } from "./CartPage";

type Props = {
  currency: string;
  defaultCountry: string;
  countries: [string, string][];
  initialMethods: Method[];
  customer: { email: string; name: string; phone: string } | null;
  banks: BankAccount[];
  bankInstructions: string;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3"><h2 className="text-lg font-bold">{title}</h2>{children}</section>
);
const Radio = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
  <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 ${on ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line"}`}>{children}</label>
);

/** A single-column, step-by-step checkout (Contact → Delivery → Shipping → Payment) with the order summary beside it. */
export function CheckoutForm({ currency, defaultCountry, countries, initialMethods, customer, banks, bankInstructions }: Props) {
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
  const [first, ...rest] = (customer?.name ?? "").split(" ");

  useEffect(() => {
    methodsFor(country).then((m) => {
      setMethods(m);
      setMethod((cur) => (m.some((x) => x.id === cur) ? cur : m[0]?.id));
    });
  }, [country]);

  if (ready && lines.length === 0) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-ink2">Your cart is empty. <Link href="/shop" className="font-semibold text-accent underline">Continue shopping</Link></div>;
  }

  const submit = (fd: FormData) => {
    setError(null);
    let note = String(fd.get("notes") || "");
    try { note = [sessionStorage.getItem(NOTE_KEY), note].filter(Boolean).join(" — "); } catch {}
    start(async () => {
      const r = await checkout({
        idempotencyKey: idem,
        lines,
        email: String(fd.get("email")),
        name: `${String(fd.get("first") || "").trim()} ${String(fd.get("last") || "").trim()}`.trim(),
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
        notes: note || undefined,
        marketing: fd.get("marketing") === "on",
      });
      if (!r.ok) return setError(r.error);
      clear();
      try { sessionStorage.removeItem(NOTE_KEY); } catch {}
      window.location.href = r.redirect;
    });
  };

  return (
    <form action={submit} className="mx-auto grid max-w-[1100px] grid-cols-1 lg:grid-cols-[1.15fr_1fr] [&>*]:min-w-0">
      <div className="space-y-8 px-4 py-8 md:px-6 lg:py-10 lg:pr-12">
        <Section title="Contact">
          <label><span className="sr-only">Email</span><input name="email" type="email" required placeholder="Email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" name="marketing" /> Email me with news and offers</label>
        </Section>

        <Section title={quote?.needsShipping === false ? "Billing details" : "Delivery"}>
          <label><span className="sr-only">Country/Region</span>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country" aria-label="Country/Region">
              {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="first" required placeholder="First name" aria-label="First name" className="input" defaultValue={first} autoComplete="given-name" />
            <input name="last" required placeholder="Last name" aria-label="Last name" className="input" defaultValue={rest.join(" ")} autoComplete="family-name" />
          </div>
          <input name="line1" required placeholder="Address" aria-label="Address" className="input" autoComplete="address-line1" />
          <input name="line2" placeholder="Apartment, suite, etc. (optional)" aria-label="Apartment, suite, etc." className="input" autoComplete="address-line2" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="city" required placeholder="City" aria-label="City" className="input" autoComplete="address-level2" />
            <input name="state" placeholder="State / Province" aria-label="State or province" className="input" autoComplete="address-level1" />
            <input name="postcode" placeholder="Postal code" aria-label="Postal code" className="input" autoComplete="postal-code" />
          </div>
          <input name="phone" type="tel" placeholder={method === "cod" ? "Phone (required)" : "Phone"} aria-label="Phone" className="input" defaultValue={customer?.phone} autoComplete="tel" required={method === "cod"} />
        </Section>

        {quote?.needsShipping && (
          <Section title="Shipping method">
            {quote.shippingOptions.length === 0 && <p className="rounded-lg border border-line bg-s1 p-3 text-sm text-ink2">{quote.errors.join(" ") || "Enter your address to see shipping options."}</p>}
            <div className="space-y-2">
              {quote.shippingOptions.map((o) => (
                <Radio key={o.id} on={quote.shippingId === o.id}>
                  <input type="radio" name="ship" checked={quote.shippingId === o.id} onChange={() => setShippingId(o.id)} />
                  <span className="flex-1"><span className="block font-semibold">{o.name}</span><span className="text-xs text-ink3">{o.days}</span></span>
                  <span className="font-semibold tabular">{o.price}</span>
                </Radio>
              ))}
            </div>
          </Section>
        )}

        <Section title="Payment">
          <p className="-mt-2 text-sm text-ink3">All transactions are secure and encrypted.</p>
          {methods.length === 0 && <p className="text-sm text-danger">No payment methods are available for {currency}. Try another currency.</p>}
          <div className="space-y-2">
            {methods.map((m) => (
              <Radio key={m.id} on={method === m.id}>
                <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                <span><span className="block font-semibold">{m.label}</span><span className="text-xs text-ink3">{m.hint}</span></span>
              </Radio>
            ))}
          </div>
          {method === "bank" && (
            <div className="pt-1">
              <BankDetailsCard banks={banks} instructions={bankInstructions} amount={quote?.total} />
              <p className="mt-2 text-xs text-ink3">After you place the order you&apos;ll get your order number to use as the payment reference, and a place to upload your receipt.</p>
            </div>
          )}
          <label className="block pt-1"><span className="sr-only">Order notes</span><textarea name="notes" rows={2} className="textarea" placeholder="Order notes (optional)" /></label>
        </Section>

        {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
        <div>
          <button className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-accent text-base font-bold text-onaccent transition hover:brightness-90 disabled:opacity-50" disabled={pending || loading || !quote || !method || (quote?.errors.length ?? 0) > 0}>
            <Lock size={16} />{pending ? "Placing order…" : method === "bank" || method === "cod" ? "Complete order" : `Pay now · ${quote?.total ?? ""}`}
          </button>
          <p className="mt-3 text-center text-xs text-ink3"><Link href="/cart" className="text-accent underline">Return to cart</Link> · Charged in {currency}</p>
        </div>
      </div>

      <aside className="border-t border-line bg-s1 px-4 py-8 md:px-6 lg:border-l lg:border-t-0 lg:py-10 lg:pl-10">
        <div className="space-y-5 lg:sticky lg:top-6">
          {!quote && <div className="skeleton h-40 rounded-xl" />}
          <ul className="space-y-4">
            {quote?.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3">
                <div className="relative">
                  <Thumb image={l.image} svg={l.svg} uid={`co${l.key}`} className="h-16 w-16 bg-bg" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink3 px-1 text-[11px] font-bold text-bg">{l.qty}</span>
                </div>
                <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{l.name}</p><p className="line-clamp-1 text-xs text-ink3">{l.variantName}</p>{l.error && <p className="text-xs text-danger">{l.error}</p>}</div>
                <span className="text-sm tabular">{l.total}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setCode(codeInput || null); } }} placeholder="Discount code" className="input" aria-label="Discount code" />
            <button type="button" className="rounded-lg bg-ink/10 px-5 text-sm font-semibold hover:bg-ink/15 disabled:opacity-50" disabled={!codeInput} onClick={() => setCode(codeInput || null)}>Apply</button>
          </div>
          {quote?.discountError && <p className="text-xs text-danger">{quote.discountError}</p>}
          {quote && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink2">Subtotal</dt><dd className="tabular">{quote.subtotal}</dd></div>
              {quote.discount && <div className="flex justify-between text-mint"><dt>Discount ({quote.discountLabel})</dt><dd className="tabular">−{quote.discount}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink2">Shipping</dt><dd className="tabular">{quote.shippingFee ?? (quote.needsShipping ? "Enter shipping address" : "—")}</dd></div>
              {quote.tax && <div className="flex justify-between"><dt className="text-ink2">Tax {quote.taxInclusive && "(included)"}</dt><dd className="tabular">{quote.tax}</dd></div>}
              <div className="flex items-baseline justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular"><span className="mr-2 text-xs font-normal text-ink3">{currency}</span>{quote.total}</dd></div>
            </dl>
          )}
        </div>
      </aside>
    </form>
  );
}
