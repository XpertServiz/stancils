import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Markdown } from "@/components/Markdown";
import { getSettings } from "@/lib/settings";

const DEFAULTS: Record<string, { title: string; body: (n: string, e: string) => string }> = {
  privacy: { title: "Privacy policy", body: (n, e) => `${n} collects the details you give us at checkout (name, email, phone, address) to fulfil your order, and your email if you subscribe to our newsletter.\n\n## What we share\nWe share delivery details with couriers and payment details are handled directly by our payment providers. We never sell your data.\n\n## Custom uploads\nArtwork you upload to the Studio is used only to make your stencil and is deleted if no order is placed.\n\n## Your rights\nEmail ${e} to access, correct or delete your data.` },
  terms: { title: "Terms of service", body: (n) => `By ordering from ${n} you agree to these terms.\n\n## Orders\nPrices are shown in the currency you select. Orders are confirmed once payment is received (or for cash on delivery, once confirmed).\n\n## Custom designs\nYou confirm you own or have permission to use any artwork you upload. We may decline designs that infringe others' rights.` },
  shipping: { title: "Shipping", body: () => `In-stock stencils ship within 1 business day; made-to-order and custom stencils within 2–3 business days.\n\nShipping options and delivery estimates for your country are shown at checkout. International orders may be subject to import duties in your country.` },
  returns: { title: "Returns & refunds", body: () => `Unused stock stencils can be returned within 30 days.\n\nCustom stencils and digital files are made for you and can't be returned — unless they arrive damaged or incorrect, in which case we'll remake them free.\n\nRefunds are issued in the currency you paid in.` },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = DEFAULTS[(await params).slug];
  return d ? { title: d.title, alternates: { canonical: `/legal/${(await params).slug}` } } : {};
}

export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = DEFAULTS[slug];
  if (!d) notFound();
  const s = await getSettings();
  const override = await db.pageSection.findFirst({ where: { page: `legal:${slug}`, deletedAt: null } });
  const body = (override?.data as { body?: string } | null)?.body || d.body(s.business.name, s.business.email);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl font-bold">{override?.title ?? d.title}</h1>
      <Markdown text={body} />
    </div>
  );
}
