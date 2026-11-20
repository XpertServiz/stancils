import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };

export default async function About() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">About {s.business.name}</h1>
      <div className="prose-cc mt-6">
        <p>We design and laser-cut reusable stencils for walls, furniture, floors, cakes, coffee, fabric and signs — and we make it easy to turn your own logo or lettering into a stencil that actually works.</p>
        <p>Every design is original, every stencil lists exactly what it&apos;s made of, and every custom order is checked before it&apos;s cut.</p>
      </div>
    </div>
  );
}
