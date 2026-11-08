import { googleFontsHref } from "@/lib/themes";

/** The admin panel keeps its original look (Creative Corner colours, Fraunces + Inter) whatever the shop theme is. */
export function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="corner" className="min-h-screen bg-bg text-ink" style={{ "--font-display": '"Fraunces",Georgia,serif', "--font-body": '"Inter",system-ui,sans-serif', fontFamily: "var(--font-body)" } as React.CSSProperties}>
      <link rel="stylesheet" href={googleFontsHref("Fraunces", "Inter")} precedence="default" />
      {children}
    </div>
  );
}
