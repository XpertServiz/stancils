export function Section({ children, stone = false, className = "", id }: { children: React.ReactNode; stone?: boolean; className?: string; id?: string }) {
  return (
    <section id={id} className={`${stone ? "band-stone" : ""} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">{children}</div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, sub, action }: { eyebrow?: string; title?: string | null; sub?: string | null; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        {title && <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>}
        {sub && <p className="muted mt-3 text-base text-ink2 md:text-lg">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
