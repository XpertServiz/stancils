import Link from "next/link";

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "mint" | "coral" | "mustard" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink3">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular ${tone === "mint" ? "text-mint" : tone === "coral" ? "text-accent" : tone === "mustard" ? "text-mustard" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink3">{sub}</p>}
    </div>
  );
}

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active === t.key ? "border-accent text-ink" : "border-transparent text-ink3 hover:text-ink"}`}>{t.label}</Link>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-ink3">{children}</p>;
}

const TONES: Record<string, string> = {
  PENDING_PAYMENT: "badge-mustard", CONFIRMED: "badge-mustard", PAID: "badge-mint", IN_PRODUCTION: "badge-coral", QUALITY_CHECK: "badge-coral",
  PACKED: "badge-muted", SHIPPED: "badge-mint", DELIVERED: "badge-mint", FULFILLED: "badge-mint", CANCELLED: "badge-danger", REFUNDED: "badge-danger",
  PARTIALLY_REFUNDED: "badge-mustard", RETURNED: "badge-danger", ACTIVE: "badge-mint", DRAFT: "badge-mustard", ARCHIVED: "badge-muted",
  paid: "badge-mint", unpaid: "badge-mustard", refunded: "badge-danger", partial_refund: "badge-mustard", published: "badge-mint", pending: "badge-mustard",
  hidden: "badge-muted", rejected: "badge-danger", open: "badge-coral", in_progress: "badge-mustard", closed: "badge-muted", approved: "badge-mint",
  queued: "badge-muted", cutting: "badge-coral", cleaning: "badge-coral", quality_check: "badge-mustard", ready_to_pack: "badge-mint", done: "badge-mint", needs_review: "badge-mustard", locked: "badge-muted", draft: "badge-muted",
};

export function StatusBadge({ s }: { s: string }) {
  return <span className={`badge ${TONES[s] ?? "badge-muted"}`}>{s.replace(/_/g, " ").toLowerCase()}</span>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink3">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn btn-ghost btn-sm" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn btn-ghost btn-sm" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink3">{hint}</span>}
    </label>
  );
}
