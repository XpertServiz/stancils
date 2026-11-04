import { CartProvider } from "@/components/store/CartContext";
import { CartDrawer } from "@/components/store/CartDrawer";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { Announcement } from "@/components/store/Announcement";
import { WhatsAppBubble } from "@/components/store/WhatsApp";
import { Track } from "@/components/store/Track";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const org = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: s.business.name,
    url: process.env.NEXT_PUBLIC_SITE_URL,
    email: s.business.email,
    telephone: s.business.phone,
    sameAs: [s.business.instagram, s.business.pinterest, s.business.facebook, s.business.youtube].filter(Boolean),
  };
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent">Skip to content</a>
      <Announcement />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppBubble />
      <Track />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, "\u003c") }} />
    </CartProvider>
  );
}
