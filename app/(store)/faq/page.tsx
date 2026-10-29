import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "FAQ", description: "Materials, food safety, custom stencils, shipping, currencies and returns.", alternates: { canonical: "/faq" } };

export default async function Faq() {
  const faqs = await db.faq.findMany({ where: { visible: true }, orderBy: [{ page: "asc" }, { sort: "asc" }] });
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="mb-8 text-4xl font-bold">Frequently asked questions</h1>
      {faqs.map((f) => (
        <details key={f.id} className="group border-b border-line py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{f.question}<span className="text-xl transition-transform group-open:rotate-45">+</span></summary>
          <p className="mt-3 text-ink2">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
