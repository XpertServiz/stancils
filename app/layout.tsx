import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

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

export const viewport: Viewport = { themeColor: "#2E3140", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en" data-theme={s.theme.preset || "dusk"} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&family=Big+Shoulders+Stencil+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Saira+Stencil+One&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
        <script
          // visitor light/dark override, applied before paint to avoid a flash
          dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('cc_theme');if(t)document.documentElement.dataset.theme=t}catch(e){}` }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
