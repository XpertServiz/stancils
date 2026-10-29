import { db } from "@/lib/db";
import { getActiveCurrency, getUnits } from "@/lib/currency";
import { Studio } from "./Studio";

export async function StudioPage({ h1, intro, material, text, faqs = [] }: { h1: string; intro: string; material?: string; text?: string; faqs?: [string, string][] }) {
  const [mats, units, { cur }] = await Promise.all([
    db.material.findMany({ where: { active: true, kind: { in: ["MYLAR", "PET", "STEEL", "VINYL"] } }, orderBy: [{ kind: "asc" }, { thicknessUm: "asc" }] }),
    getUnits(),
    getActiveCurrency(),
  ]);
  const ld = faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <p className="eyebrow mb-2">Custom Stencil Studio</p>
      <h1 className="text-4xl font-bold md:text-5xl">{h1}</h1>
      <p className="mb-8 mt-3 max-w-3xl text-lg text-ink2">{intro}</p>
      <Studio
        materials={mats.map((m) => ({ id: m.id, name: m.name, kind: m.kind, foodSafe: m.foodSafe, minBridgeMm: m.minBridgeMm, thicknessUm: m.thicknessUm }))}
        defaultMaterialKind={material}
        units={units}
        currency={cur.code}
        initialText={text}
      />
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {[["1. Upload or type", "Any logo, sketch, photo or words. We convert it to a clean cut path."], ["2. We bridge & check", "Floating centres get bridges automatically; tiny details are flagged before cutting."], ["3. Cut & shipped", "Laser-cut in 2–3 business days, photographed, packed flat and shipped worldwide."]].map(([t, d]) => (
          <div key={t} className="card p-6"><p className="font-bold">{t}</p><p className="mt-2 text-sm text-ink2">{d}</p></div>
        ))}
      </div>
      {faqs.length > 0 && (
        <div className="mt-12 max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold">Questions</h2>
          {faqs.map(([q, a]) => (
            <details key={q} className="border-b border-line py-3"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-ink2">{a}</p></details>
          ))}
        </div>
      )}
    </div>
  );
}
