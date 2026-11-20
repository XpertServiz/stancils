import type { Metadata } from "next";
import { getActiveCurrency, getCountry } from "@/lib/currency";
import { availableMethods } from "@/lib/payments";
import { getCustomer } from "@/lib/auth";
import { banksFor, getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { COUNTRIES } from "@/lib/countries";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  const [{ cur }, country, customer, settings] = await Promise.all([getActiveCurrency(), getCountry(), getCustomer(), getSettings()]);
  const biz = customer?.business?.status === "approved" ? customer.business : null;
  const methods = await availableMethods(cur.code, country, { b2bTerms: Boolean(biz && biz.termsDays > 0) });
  return (
    <>
      {sp.cancelled && <p className="mx-auto mt-4 max-w-[1100px] rounded-lg bg-mustard/20 p-3 text-sm">Payment for {sp.cancelled} was cancelled — your cart is still here.</p>}
      <CheckoutForm
        currency={cur.code}
        defaultCountry={country}
        countries={COUNTRIES}
        initialMethods={methods}
        banks={banksFor(settings.payments.banks, cur.code)}
        bankInstructions={settings.payments.bankInstructions}
        customer={customer ? { email: customer.email, name: customer.name ?? "", phone: customer.phone ?? "" } : null}
      />
    </>
  );
}
