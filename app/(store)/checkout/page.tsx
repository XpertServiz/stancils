import type { Metadata } from "next";
import { getActiveCurrency, getCountry } from "@/lib/currency";
import { availableMethods } from "@/lib/payments";
import { getCustomer } from "@/lib/auth";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { COUNTRIES } from "@/lib/countries";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  const [{ cur }, country, customer] = await Promise.all([getActiveCurrency(), getCountry(), getCustomer()]);
  const biz = customer?.business?.status === "approved" ? customer.business : null;
  const methods = await availableMethods(cur.code, country, { b2bTerms: Boolean(biz && biz.termsDays > 0) });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold">Checkout</h1>
      {sp.cancelled && <p className="mb-4 rounded-xl bg-mustard/15 p-3 text-sm text-mustard">Payment for {sp.cancelled} was cancelled — your cart is still here.</p>}
      <CheckoutForm
        currency={cur.code}
        defaultCountry={country}
        countries={COUNTRIES}
        initialMethods={methods}
        customer={customer ? { email: customer.email, name: customer.name ?? "", phone: customer.phone ?? "" } : null}
      />
    </div>
  );
}
