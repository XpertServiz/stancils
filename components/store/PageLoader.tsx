import { LogoMark } from "./BrandLogo";

/** Shown by Next.js while a page loads: the round logo turns slowly inside a gold dashed ring on a soft green wash. */
export function PageLoader() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[60vh] place-items-center bg-bg">
      <style>{`@keyframes pl-spin{to{transform:rotate(360deg)}}@keyframes pl-flip{0%,100%{transform:rotateY(0)}50%{transform:rotateY(180deg)}}@keyframes pl-dots{0%,80%,100%{opacity:.25}40%{opacity:1}}`}</style>
      <div className="flex flex-col items-center gap-5" style={{ perspective: 600 }}>
        <div className="relative grid h-[120px] w-[120px] place-items-center">
          <svg className="absolute inset-0" viewBox="0 0 120 120" style={{ animation: "pl-spin 5s linear infinite" }} aria-hidden>
            <circle cx="60" cy="60" r="57" fill="none" stroke="#D4AF5A" strokeWidth="2" strokeDasharray="6 9" />
          </svg>
          <div style={{ animation: "pl-flip 1.8s ease-in-out infinite" }}><LogoMark size={84} /></div>
        </div>
        <p className="font-display text-xl text-ink2">Loading<span style={{ animation: "pl-dots 1.2s infinite" }}>.</span><span style={{ animation: "pl-dots 1.2s .2s infinite" }}>.</span><span style={{ animation: "pl-dots 1.2s .4s infinite" }}>.</span></p>
      </div>
    </div>
  );
}
