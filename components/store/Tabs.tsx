"use client";
import { useState } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" className="mb-6 inline-flex rounded-xl border border-line p-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active === t.id ? "bg-accent text-onaccent" : "text-ink2 hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => <div key={t.id} role="tabpanel" hidden={active !== t.id}>{t.content}</div>)}
    </div>
  );
}
