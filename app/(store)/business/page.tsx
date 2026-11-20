import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Repeat, Receipt, Percent } from "lucide-react";
import { BusinessForm } from "@/components/store/SimpleForms";

export const metadata: Metadata = {
  title: "Stencils for Cafés, Bakeries & Brands",
  description: "Custom logo coffee and cookie stencils with one-tap reorders, bulk pricing and invoices in your currency.",
  alternates: { canonical: "/business" },
};

export default function Business() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow mb-2">For business</p>
      <h1 className="max-w-3xl text-4xl font-bold md:text-5xl">Your logo on every cup, cookie and sign.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink2">Save your logo once, reorder in one tap, and get bulk pricing with invoices in your currency.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {[[Coffee, "Café-grade steel", "Dishwasher-safe stainless stencils built for service."], [Repeat, "One-tap reorders", "Your approved designs live in your Project Wallet."], [Percent, "Business pricing", "Automatic discount on every order once approved."], [Receipt, "Invoices & terms", "Invoices in your currency; net terms for regular accounts."]].map(([Icon, t, d]) => {
          const I = Icon as typeof Coffee;
          return <div key={t as string} className="card p-5"><I className="mb-3 text-accent" /><p className="font-semibold">{t as string}</p><p className="mt-1 text-sm text-ink2">{d as string}</p></div>;
        })}
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <BusinessForm />
        <div className="space-y-3 text-ink2">
          <h2 className="text-xl font-bold text-ink">How it works</h2>
          <p>1. <Link href="/account/login?next=/business" className="text-accent underline">Create an account</Link> and apply here.</p>
          <p>2. We approve your account (usually within a day) and set your business discount.</p>
          <p>3. Make your logo stencil in the <Link href="/custom-stencils/coffee" className="text-accent underline">Studio</Link> — it&apos;s saved for reorders.</p>
        </div>
      </div>
    </div>
  );
}
