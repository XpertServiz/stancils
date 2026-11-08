import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { companionOf, googleFontsHref, themeById, themeCss } from "@/lib/themes";
import { Splash } from "@/components/store/Splash";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(SITE),
    title: { default: s.seo.title, template: `%s | ${s.business.name}` },
    description: s.seo.description,
    applicationName: s.business.name,
    openGraph: { type: "website", siteName: s.business.name, title: s.seo.title, description: s.seo.description },
    twitter: { card: "summary_large_image", title: s.seo.title, description: s.seo.description },
    alternates: { canonical: "/" },
    icons: { icon: "/icon.svg" },
  };
}

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#0E2F28", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const theme = themeById(s.theme.preset);
  return (
    <html lang="en" data-theme={theme.id} data-owner={theme.id} data-alt={companionOf(theme)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontsHref(s.theme.displayFont, s.theme.bodyFont)} />
        <style dangerouslySetInnerHTML={{ __html: themeCss(s.theme) }} />
        {s.splash.enabled && (
          <script
            // repeat visit, reduced motion or a crawler: hide the splash before the first paint (shop and admin are counted separately)
            dangerouslySetInnerHTML={{ __html: `try{var k=location.pathname.indexOf('/admin')===0?'cc_splash_a':'cc_splash_s';if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches||/bot|crawl|spider|lighthouse|slurp/i.test(navigator.userAgent))document.documentElement.dataset.splash='skip'}catch(e){document.documentElement.dataset.splash='skip'}` }}
          />
        )}
        <script
          // visitor light/dark override, applied before paint to avoid a flash
          dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('cc_alt')==='1'){var d=document.documentElement;d.dataset.theme=d.dataset.alt}}catch(e){}` }}
        />
      </head>
      <body className="min-h-screen">
        {s.splash.enabled && <Splash name={s.business.name} style={s.splash.style} />}
        {children}
      </body>
    </html>
  );
}
