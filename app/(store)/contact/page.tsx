import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { InquiryForm } from "@/components/store/SimpleForms";

export const metadata: Metadata = { title: "Contact us", description: "Questions about stencils, custom orders or shipping? We reply within one business day.", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const s = await getSettings();
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="mt-3 text-ink2">Questions about a design, a custom order or shipping? We reply within one business day.</p>
        <dl className="mt-6 space-y-3 text-sm">
          <div><dt className="text-ink3">Email</dt><dd><a className="text-accent" href={`mailto:${s.business.email}`}>{s.business.email}</a></dd></div>
          <div><dt className="text-ink3">WhatsApp</dt><dd><a className="text-accent" href={`https://wa.me/${s.business.whatsapp}`}>{s.business.phone}</a></dd></div>
          <div><dt className="text-ink3">Studio</dt><dd>{s.business.address}</dd></div>
        </dl>
      </div>
      <InquiryForm />
    </div>
  );
}
