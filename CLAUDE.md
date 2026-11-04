# CLAUDE.md — Stencil Commerce OS (v1)

> Master brief for Claude Code. Read this file fully before writing any code.
> Build in the phase order in §14. When something isn't covered, choose the
> simplest option that keeps the ledger correct and auditable, and leave a
> `// DECISION:` comment explaining it.
>
> **Lineage:** this project reuses the back-office architecture of the StarTech
> Electronics OS brief (checkout, order tracking, bulk inventory and media upload,
> double-entry accounting, reporting, Content Manager, reviews, themes, roles and
> permissions, audit log). It **drops** everything that only made sense for a
> walk-in repair shop: **no POS, no offline POS, no cash drawers, no repair
> tickets, no IMEI/serials, no buyback.** It **adds** what a stencil brand needs:
> a Custom Stencil Studio, made-to-order production, raw-material (BOM) costing,
> digital downloads, multi-currency selling and international shipping.
>
> **Working brand name:** `Stencilry` *(placeholder — replace via Settings →
> Business profile; the name must never be hard-coded in components).*

---

## 0. One-Line Vision

**The easiest place in the world to get a stencil that is exactly right — pick
one from a beautiful library or turn your own idea into a cut-ready stencil in
two minutes, see it on your wall, cake or coffee before you pay, and have it
at your door (or in your downloads) fast.**

---

## 1. Business Context

| Item | Detail |
|---|---|
| Business | Online-only stencil brand (no physical counter) |
| Products | Ready-made stencils (wall, furniture, floor/tile, lettering, craft, cake/cookie, coffee/latte, airbrush, signage), custom stencils (upload a logo/photo/text), multi-layer stencil sets, digital downloads (SVG/PDF/DXF cut files), tools & kits (brushes, rollers, adhesive spray, paints, tape) |
| Customers | DIY home decorators, crafters, bakers, cafés & baristas, small businesses (logo stencils for signage/pavement/merch), interior designers and painters, schools |
| Channels | Website (primary) · WhatsApp · Instagram/Facebook/Pinterest shop links · B2B wholesale accounts (cafés, bakeries, craft retailers) |
| Markets | Home market + international (shipping and digital) *(confirm: client country and legal entity, see §16)* |
| Currencies | Owner-selectable **base currency** and any number of **selling currencies** (USD, PKR, EUR, GBP, AED, CAD, AUD … ). See §5.6 |
| Money storage | Integer minor units (`bigint`) + ISO currency code. Never floats |
| Timezone | Owner-selectable (default Asia/Karachi). All "business day" logic in that zone |
| Languages | English first; i18n-ready (`next-intl`), Urdu/Arabic RTL optional later |
| Owner | Single owner = Super Admin |

### Non-negotiable core rule
**No event may change stock or money without writing a balanced ledger entry
in the same database transaction.** If the journal fails, the order fails.

---

## 2. Competitor Research & Gap Analysis

### 2.0 Research note (read before building)
The four reference sites (imartdecor.com, cuttingedgestencils.com,
stencilarts.com, stencilstop.com/collections/coffee-stencils) **could not be
fetched from the build environment** (network policy blocked the hosts). The
analysis below combines what is publicly known about these brands and the
stencil category in general. Before Phase 2 UI work, **re-audit each site
live** and update this table (§2.4 checklist) — do not treat any price or
feature claim below as verified.

### 2.1 Reference competitors

| Competitor | Positioning (as generally known) | What they do well | Where they fall short (our opening) |
|---|---|---|---|
| **Cutting Edge Stencils** (US) | Premium large-format **wall & furniture stencils**, allover/Moroccan/damask patterns, designer-made, "made in USA" | Huge pattern library; room-scale lifestyle photography; how-to videos & blog; customer project gallery; kits (stencil + roller + paint); free small "filler" stencils with some patterns | No way to *see the pattern on your own wall* before buying; no live repeat calculator for your room size; custom work is quote-by-email, not instant; one currency; desktop-era UX |
| **StencilStop** (US) | Wide catalog, many niches incl. **coffee/latte stencils**, lettering, holiday, signs | Breadth; niche collections (coffee, cookies, holidays); simple Shopify buying; custom stencil option | Generic Shopify look; no live custom preview or instant price; food-safe claims hard to verify; no café/B2B reorder portal |
| **Stencil Arts** | Craft / decor / mixed-media stencils | Collection-based browsing; affordable small formats | Thin storytelling; weak search/filtering by surface, size, technique; little tutorial depth |
| **iMartDecor** | Decor-led store with stencils among home-décor products | Lifestyle merchandising; promo-driven (bundles, sales) | Stencils are not the core; little technical info (material, thickness, bridges, reuse count); no customization depth |
| Marketplaces (Etsy, Amazon, Walmart, Daraz) | Thousands of sellers, PET/mylar sheets, cheap packs | Reach, price, reviews | Inconsistent cut quality; no custom preview; no after-sale help; copied designs |
| Custom-logo specialists (coffee/latte, signage) | Setup fee + per-unit, proof by email | Real custom capability | Slow proof loop (days), fixed setup fees, no self-serve preview or reorder |

### 2.2 Patterns every strong stencil site shares (we must match)
1. Shop by **use / surface** (wall, furniture, floor, fabric, cake & cookie, coffee, craft, signage) *and* by **style** (Moroccan, floral, geometric, lettering, mandala, seasonal).
2. Product page with **size options**, material/thickness, "reusable" claim, pattern repeat dimensions, room/lifestyle photos, how-to video, reviews.
3. Tutorials, blog, project gallery (UGC) — stencils sell on inspiration.
4. Kits and bundles (stencil + roller/brush + adhesive + paint).
5. Free-shipping threshold, seasonal promos, newsletter discount.
6. Custom stencil service (logo / text / image).

### 2.3 Feature gap verdict
Nobody in this category combines: **instant self-serve custom stencils with
auto-bridging and a live price + see-it-on-your-surface preview + repeat/paint
calculator + digital or physical delivery + multi-currency checkout + a
self-running ledger.** That combination is the moat.

### 2.4 Live re-audit checklist (fill in before Phase 2)
For each competitor record: hero type · nav/categories · price range & currency · sizes · material/thickness stated · custom flow (steps, setup fee, proof time) · shipping & free-ship threshold · reviews provider · tutorials/videos · UGC gallery · loyalty · B2B/wholesale · mobile Lighthouse score · schema.org markup present · page speed (LCP).

---

## 3. The 12 Differentiators (things competitors do not have)

1. **Custom Stencil Studio** — upload a logo, photo, sketch or type text → auto-trace to vector → **auto-bridge "islands"** (the inside of O, A, B, R etc. that would fall out) with a visible before/after → choose size, material, thickness, layers → **instant live price** → approve → straight to production. No email quote loop. (§5.3)
2. **See It On Your Surface (AR + photo preview)** — drop the stencil on a sample room/cake/latte/furniture scene, or **upload a photo of your own wall** and see the painted result in your chosen colour; on mobile, WebXR/Quick Look AR places it on the real wall at true scale.
3. **Repeat & Paint Calculator** — enter wall width × height → we show how many repeats, how many stencil placements, estimated time and paint quantity; suggests "buy 2 sheets to go twice as fast".
4. **Layer Explorer** — multi-layer stencils shown as exploded 3D layers with colour pickers per layer; customer sees the final multi-colour result before buying.
5. **Cut-Quality Passport** — every product lists material, thickness (mil/micron), min bridge width, finest detail, reuse estimate, food-safe certificate (for cake/coffee lines), and cleaning instructions in one standard block. Competitors rarely publish this.
6. **Physical + Digital in one cart** — any design can be sold as a cut stencil and/or as a **licensed digital cut file** (SVG/DXF/PDF/PNG for Cricut, Silhouette, laser cutters), delivered instantly with download limits and a licence (personal / commercial).
7. **Café & Business Portal (B2B)** — cafés, bakeries and brands save their logo once, reorder custom coffee/cookie stencils in one tap, tiered bulk pricing, invoices in their currency.
8. **Multi-currency everything** — customer picks currency (auto-detected by geo-IP, overridable); prices are either auto-converted with rounding rules or **hand-set per currency**; checkout, invoices, emails and refunds all honour it; ledger converts to base currency with FX gain/loss. (§5.6)
9. **Project Wallet** — each customer account keeps their custom designs, past colours, wall sizes and downloads; "reorder exactly this" and "make it 20% bigger" in one click.
10. **Live Order Tracker with production stages** — `Design approved → Cutting → Quality check → Packed → Shipped → Delivered`, with a photo of the actual cut stencil before dispatch (custom orders).
11. **Tutorial-to-cart** — every how-to video/reel is shoppable: tagged stencils, tools and paints appear beside the video with live price and stock.
12. **Owner Copilot** — plain-language questions over read-only reports ("best-selling coffee stencils in GBP last month?", "which custom orders are late?"), nightly brief and anomaly alerts (refund spikes, discount abuse, failed payments, late production).

---

## 4. UI / UX System — "Dusk Atelier"

### 4.1 Benchmarks

| Benchmark | What we take | What we avoid |
|---|---|---|
| Apple product pages | Scroll-linked 3D storytelling in the hero | Heavy image sequences (we use real-time 3D) |
| Cutting Edge Stencils-style décor sites | Big lifestyle room photography, pattern-first browsing | Cluttered promo bars, desktop-only layouts |
| Canva / Kittl | Instant, friendly design editor for non-designers (inspiration for the Studio) | Feature overload |
| IKEA Kreativ / paint-brand visualisers | "See it in your room" preview | Account walls before preview |
| Shopify best-in-class stores | Fast PLPs, sticky add-to-cart, clean checkout | Theme-store sameness |

### 4.2 Theme principle — "not too light, not too dark"
A **mid-tone dusk palette**: slate-plum stage colours (darker than a light
theme, noticeably lighter than "midnight"), warm paper-stone section bands for
rhythm, and paint-colour accents. Sections alternate **Dusk ↔ Stone** like
layers of a stencil being painted, which is the brand idea in colour form.

| Token | Value / rule |
|---|---|
| `--bg` | `#2E3140` (dusk slate — page) |
| `--surface-1` | `#383C4D` (cards) |
| `--surface-2` | `#434860` (raised, inputs) |
| `--band-stone` | `#E8E2D6` (alternating light band) · ink on stone `#22242E` |
| `--line` | `#525873` (hairlines on dusk) · `#CFC7B8` on stone |
| `--ink` | `#F5F2EC` · `--ink-2` `#CBC8D6` · `--ink-3` `#A3A1B5` |
| `--accent` | Paint coral `#FF7A59` (primary actions) — dark text `#1B1D24` on it |
| `--accent-2` | Mint `#5EE6C0` (in stock, success, "food safe") |
| `--accent-3` | Mustard `#F5C451` (badges, highlights) |
| `--danger` | `#FF6B6B` |
| `--glow` | `0 0 0 1px rgba(255,122,89,.35), 0 0 40px rgba(255,122,89,.18)` |
| Display | Clash Display / Space Grotesk 600–700, tight tracking (−0.02em) |
| Body | Inter or IBM Plex Sans 400/500/600 |
| Technical | IBM Plex Mono (sizes, mil/micron, SKUs) |
| Numbers | Tabular figures for money and stock |
| Radius | 18px cards, 12px controls, pill badges |
| Texture | Very subtle paper grain (2–3% noise) on stone bands only |
| Motion | 200–400ms `cubic-bezier(.2,.8,.2,1)`; ambient loops 6–10s |

Rules: one glowing element per viewport; contrast ≥ 4.5:1 for body text on
every surface (verify every token pair in CI); no gradient wash behind text.
Owner can switch presets in Appearance (§5.18).

### 4.3 Signature 3D moments

1. **Hero — "Light Through the Stencil" (brand moment)**
   - A laser-cut stencil sheet (semi-translucent mylar, slightly curled edges) floats in 3D over a wall surface. A soft moving light behind it **projects the cut pattern as light and shadow** onto the wall (gobo effect), so the pattern "paints itself" in light as the sheet sways.
   - On scroll (desktop) / on view (mobile): a **paint roller sweeps** across → the sheet **peels away** in 3D (cloth-like bend) → revealing a crisp painted pattern on the wall, in the colour the visitor picked from 5 paint swatches beside the CTA.
   - Second state: the sheet **explodes into its layers** (Layer Explorer for a 3-colour stencil) with labels linking to categories ("Wall · 240 patterns", "Coffee · 60 designs", "Custom · upload yours").
   - Controls: *Auto · Peel · Layers* + drag to rotate; pattern and colour swap from Content Manager (the owner chooses which product the hero shows).
   - Build: React Three Fiber + drei. Stencil sheet = plane with an **alpha mask generated from the product's SVG** (so any product can be the hero without a new 3D model), projected-texture spotlight for the shadow, vertex-shader bend for the peel. GSAP ScrollTrigger maps scroll to peel progress.
   - Fallback: CSS-3D layered version for mid-range devices; static poster for low-end, Save-Data and `prefers-reduced-motion`.
2. **Splash screen — "Laser Cut Reveal"** (first visit per session only, ≤ 1.6s, skippable on any tap/key)
   - A laser dot traces the brand logo on a 3D sheet with tiny spark particles → the cut-out piece drops away with a physics tumble → a spray burst fills the logo through the opening in `--accent` → fades into the hero.
   - Never blocks LCP: the hero poster renders underneath; splash is an overlay drawn on a lightweight canvas (no three.js needed — 2.5D canvas/WebGL shader under 25 KB). Disabled for reduced motion, bots/crawlers and repeat visits in the same session.
   - Route-change micro-splash: a 300ms stencil-wipe transition (a pattern mask sweeps across) between major sections — optional, off by default.
3. **Surface Finder command bar** — glass bar under the hero: "What are you stencilling?" chips (Wall · Furniture · Floor · Cake · Coffee · Fabric · Sign · Craft) + search. Once chosen, the store reshapes (sizes, materials and filters relevant to that surface) and a slim "Shopping for: Walls ✕" bar follows the visitor.
4. **Bento "Shop by style" grid** — tiles tilt toward the cursor; the pattern inside slowly animates as if being painted.
5. **Live Studio preview** — the Custom Stencil Studio shows the uploaded design as a 3D sheet with bridges highlighted in mint; toggles to "painted result".
6. **Pattern repeat visualiser** — infinite tiling of an allover pattern across a room photo, drag to adjust scale.
7. **Holographic Cut-Quality Passport card** — tilted card with light sheen listing material, thickness, food-safe status.
8. **Production tracker** — progress timeline with pulsing "now" dot and the cut-photo before dispatch.
9. **Owner Cockpit** — dashboards in the same tokens.

### 4.4 3D performance budget (non-negotiable)
- 3D lazy-loads **after LCP**; first paint is a poster of the same scene; LCP < 2.5s on 4G, CLS < 0.1, INP < 200ms.
- No heavy GLB needed for the hero (procedural plane + SVG mask); any extra models < 1 MB Draco/KTX2. DPR capped at 1.5; render loop pauses off-screen or tab hidden.
- GPU tiering with `detect-gpu`: high → WebGL; mid → CSS-3D; low/Save-Data/reduced motion → static poster.
- Storefront initial JS < 170 KB; 3D, Studio and AR bundles load on demand.
- Every animation respects `prefers-reduced-motion`; every 3D control has a button equivalent.

### 4.5 UX rules
- Mobile-first; no scroll-jacking outside the hero (mobile hero auto-plays on view).
- **Three-tap checkout** for returning customers; guest checkout always allowed.
- Honest stock & lead time: "In stock — ships in 24h", "Made to order — ships in 2–3 days", "Instant download", "Only 3 left".
- Search tolerant of typos and synonyms ("stensil", "mandala", "latte art", "cookie", "alphabet", "letters").
- Units toggle **cm / inches** everywhere (remembered per visitor; default by country).
- Skeleton, empty and error states designed for every screen.
- WCAG 2.2 AA, visible focus rings, keyboard navigation.

### 4.6 Homepage structure (landing-page framework)
Order follows the proven framework **Hero → Problem/Solution → Shop → Case
Studies → Testimonials → Portfolio → Why Us → FAQ → Final CTA**, with shopping
sections slotted in. Every section is a CMS block (§5.17): edit, hide, delete,
duplicate, reorder, or add from the section library.

| # | Section | Content | Managed in |
|---|---|---|---|
| 0 | Announcement bar | Free-shipping threshold in visitor's currency, promo code, countdown | Promotions |
| 1 | **Hero** | Headline, sub-text, primary CTA "Shop stencils", secondary CTA "Make a custom stencil", paint-swatch picker, Surface Finder, trust bar (real figures only: orders shipped, rating, countries) and hero media (3D / video / image / offer carousel) | Content Manager · Hero media |
| 2 | **Problem / Solution** | "Paint bleeds under cheap stencils" → thicker mylar + Cut-Quality Passport · "Will it fit my wall?" → Repeat Calculator & AR · "Custom takes weeks" → Studio + instant price · "Not sure it'll look good" → See It On Your Surface | Content Manager |
| 3 | Shop by surface (bento) | Wall, Furniture, Floor/Tile, Cake & Cookie, Coffee, Fabric, Sign & Logo, Craft & Journal | Content Manager + Catalog |
| 4 | Best sellers / New arrivals / Trending tabs | Live from inventory; owner can pin | Inventory + Content Manager |
| 5 | **Custom Stencil Studio teaser** | Drag-drop upload box right on the homepage → opens Studio with the file loaded | Studio settings |
| 6 | Shop by style | Moroccan, Floral, Geometric, Mandala, Lettering, Seasonal, Kids, Nature | Catalog |
| 7 | **Case Studies — Project Stories** | Before/after room makeovers, café logo latte art, bakery cookies: what was used, time taken, quote | Project Stories Manager |
| 8 | **Testimonials** | Live Google rating + on-site reviews with photos/videos; "Write a review" | Reviews Manager |
| 9 | **Portfolio / UGC gallery** | Customer projects (#hashtag submissions, approved), shoppable reel strip "Watch it painted" | Portfolio Manager · Video & reels |
| 10 | Kits & bundles | Starter kit, Wall makeover kit, Barista kit, Baker kit | Bundles |
| 11 | Cut-Quality Passport | Materials explainer + holographic card | Content Manager |
| 12 | **Why Us** | Differentiators + comparison table: us vs marketplace stencils vs typical stencil shop | Content Manager |
| 13 | Business / Café portal pitch | Custom logo stencils in bulk | Content Manager |
| 14 | Tutorials & blog | Latest guides with video | Blog |
| 15 | **FAQ** | 8–12 Qs (materials, reuse, cleaning, food safety, sizes, custom proof, shipping times by region, duties, digital licence, returns) with FAQ schema | FAQ Manager |
| 16 | **Final CTA** | Shop now · Make custom · WhatsApp · newsletter (welcome discount) | Content Manager |
| — | Persistent | Currency + units switcher, cart drawer, WhatsApp bubble, "Shopping for" surface bar | Settings |

Category, collection, product, style and SEO landing pages ("Moroccan wall
stencils", "custom logo coffee stencils UK") reuse the same framework.

---

## 5. Modules

### 5.1 Storefront (public)
- Home (§4.6), Shop (all), Collections by surface / style / occasion, Product page, Custom Stencil Studio, Kits, Digital downloads, Tutorials, Blog, Gallery, Business portal, About, Contact, FAQ, Track order, Account, legal pages.
- **Filters:** surface, style, size range (cm/in), material, thickness, layers (1/2/3+), food-safe, reusable, physical/digital, price (in selected currency), in stock / made to order, rating.
- **Sort:** best selling, newest, price, rating, trending.
- **Product page:** gallery (studio + lifestyle + in-use video), size selector with dimension diagram (overall size, design area, repeat size), material/thickness selector, layer colour preview, **See It On Your Surface**, Repeat & Paint Calculator (wall stencils), Cut-Quality Passport, "Also as digital download", frequently bought together (roller, adhesive, paint), reviews with photos, Q&A, delivery estimate by country, stock/lead-time badge, sticky add-to-cart.
- Cart drawer with free-shipping progress bar (in selected currency), upsell kits, saved for later.
- Wishlist, recently viewed, "notify me when back in stock".
- Customer account (email magic link / OTP / Google sign-in): orders, tracking, Project Wallet (custom designs), downloads, addresses, wishlist, reviews, loyalty points, referral link.

### 5.2 Product types
| Type | Stock behaviour | Fulfilment |
|---|---|---|
| `stock_physical` | Finished-goods stock per variant (size × material × thickness) | Pick, pack, ship |
| `made_to_order` | No finished stock; consumes raw materials via BOM at production | Production queue → ship |
| `custom` | Created by the Studio per order; consumes raw materials | Proof (auto or manual) → production → ship |
| `digital` | Unlimited; licence + download limits | Instant signed download link |
| `bundle` | Component stock | Ship together |
| `gift_card` | Liability on sale | Email code |

### 5.3 Custom Stencil Studio
- **Inputs:** image upload (PNG/JPG/HEIC/SVG/PDF/AI-exported SVG), text with font library, or start from a library design and edit.
- **Pipeline:** client-side downscale → server trace (potrace / vtracer) to SVG → smoothing & threshold slider → **island detection** (enclosed shapes that would fall out) → **auto-bridge** generation with adjustable bridge width (min set per material) → stencil-font substitution for text → **min-detail check** (warns where lines are thinner than the material can cut) → multi-layer split by colour (optional).
- **Options:** width/height (lock ratio), material (mylar 5/7/10/14 mil, food-grade PET, stainless steel for coffee, adhesive vinyl), quantity, layers, registration marks, border margin.
- **Live price** = base + area × material rate + cut-complexity factor (path length / node count) + layers, converted to the visitor's currency; quantity breaks; setup fee configurable (0 by default — a differentiator).
- **Preview:** 2D, 3D sheet, painted result on surface scenes (wall/cake/latte/wood/fabric/t-shirt), AR on mobile.
- **Rights check:** customer ticks "I own or have rights to this artwork"; trademark/keyword watchlist flags orders for manual review.
- **Proof workflow:** auto-approved if all checks pass, else `needs_review` → staff adjusts → customer approves via email/WhatsApp link → locked.
- **Outputs:** production-ready SVG + DXF with cut layer, bridge layer and order ID engraving; job sheet PDF. Saved to customer's Project Wallet for reorder/resizing.

### 5.4 Inventory (bulk-first, like StarTech)
- Products → variants (size, material, thickness, layers, pack size) with SKU + barcode; label printing for packaging.
- **Raw materials** (mylar rolls/sheets by thickness, PET, steel blanks, vinyl, packaging, backing boards) as their own stock items with units (sheet, m², roll).
- **BOM per variant** (e.g. 30×30 cm 10-mil stencil = 0.1 m² mylar + 1 backing board + 1 sleeve) → made-to-order and custom jobs consume materials at production; finished stock items consume at purchase/assembly.
- `stock_movements` single source of truth: `opening`, `purchase`, `sale`, `online_reserve`, `online_release`, `return_in`, `return_out`, `production_consume`, `production_output`, `scrap`, `adjustment`, `transfer`.
- Locations: studio stock, packing area, warehouse / 3PL (optional).
- Weighted-average costing with **landed cost** (freight, customs, FX) for imported materials and tools; purchase in supplier currency with FX rate.
- Purchase orders → GRN (partial) → supplier bill.
- Stock counts, adjustments with reason + approval.
- **Bulk operations** (the StarTech feature the owner loves): CSV/Excel import & export of products, variants, prices per currency, stock, SEO fields; **bulk image upload** (drag a folder → images matched to SKUs by filename, auto WebP/AVIF, alt text drafted by AI for review); bulk edit grid (price, stock, status, collections, tags); bulk publish/unpublish; bulk price change by % per currency or collection.
- Smart reorder for raw materials (usage velocity × lead time + safety stock), dead-stock report, low-stock alerts.

### 5.5 Catalog seeding & import (go-live fill)
The store must launch **fully stocked and visible**, with every item editable, deletable and modifiable afterwards.

> **Legal rule — do not copy competitor catalogs.** Product photos, design
> artwork and descriptions on the reference sites are those companies'
> copyrighted work. The build must **not** scrape and republish them. Use them
> only as a reference for structure and categories. *(The client may import
> catalogs they own or are licensed to sell — see Importers below.)*

- **Seed library (original, generated):** a seed script creates **≈ 300 original stencil products** across all surfaces and styles, with artwork **generated procedurally as SVG** (geometric tilings, mandalas, Moroccan-style lattices, floral silhouettes, alphabets in stencil fonts, coffee motifs — hearts, leaves, stars, cups, seasonal shapes), product photos rendered from those SVGs onto surface mock-ups (the same renderer the Studio uses), original descriptions drafted from templates + AI and flagged `needs_review`, realistic variants, prices per currency, stock and raw materials. All seeded items carry `source = 'seed'` so the owner can filter, bulk-edit or bulk-delete them.
- **Importers** (Admin → Inventory → Import):
  1. CSV / Excel (template download, column mapping, dry-run preview with errors, then commit).
  2. **Shopify / WooCommerce product export** files (for the client's own existing store or a supplier's licensed feed).
  3. Supplier feed URL (CSV/JSON/XML) on a schedule, for licensed dropship/wholesale suppliers.
  4. Folder of SVG/PNG designs → one product per file (name from filename, auto-variants from a size/material template).
- Every import is a batch with a report and **one-click rollback**.

### 5.6 Multi-currency (Admin → Settings → Currencies)
- **Base (functional) currency** chosen at setup (USD, PKR, EUR, GBP, …); locked after the first journal (changing later requires a migration tool and owner confirmation).
- **Selling currencies:** add/remove any ISO currency; set default per country; toggle visible in the switcher.
- **Pricing mode per currency:** `auto` (base price × FX rate + markup % + rounding rule, e.g. `.99`, nearest 5, PKR to nearest 10/50) or `manual` (per-variant price list). Manual overrides beat auto.
- **FX rates:** daily auto-fetch from a rates provider (behind `FxProvider` interface) or manual entry; rate history stored; owner can freeze rates.
- Geo-IP default currency + visitor switcher; cart re-prices on switch; prices shown with correct symbol, decimals and position (`Rs 1,250`, `$12.99`, `€12,99`, `£11.99`).
- **Order snapshot:** order stores currency, amounts in order currency, FX rate to base and amounts in base. Refunds are in the original currency.
- **Ledger:** journals in base currency with original-currency columns; gateway settlement differences → **FX Gain / FX Loss** automatically.
- Gateway currency capability map (which gateway accepts which currency); checkout only offers methods that support the cart currency.
- Tax/VAT display per country (inclusive/exclusive), configurable.

### 5.7 Checkout & orders
- One-page checkout: contact → address (country-aware form, autocomplete) → shipping method with live rates and delivery estimate → payment → review. Express wallets (Apple Pay / Google Pay via Stripe) on top.
- Discount codes, gift cards, loyalty points, store credit.
- Order statuses: `pending_payment → paid → in_production (custom/MTO) → quality_check → packed → shipped → delivered` (+ `cancelled`, `refunded`, `partially_refunded`, `returned`). Digital lines → `fulfilled` instantly after payment.
- Stock reserved at checkout; unpaid manual-payment orders expire (default 24h) and release stock.
- COD (home market only, optional): WhatsApp/SMS confirmation buttons; risk score (new number, past refusals, high value) → may require partial advance.
- **Order tracking page** `/track` (order number + email/phone) and in account: timeline, carrier tracking, production photo, downloads.
- Emails/WhatsApp at every stage (templated, branded, in customer's currency).
- Abandoned cart recovery (email, WhatsApp opt-in).
- Returns/RMA portal with reasons; custom items non-returnable unless defective (configurable).

### 5.8 Payments
`PaymentProvider` interface; webhooks signature-verified, idempotent, logged.
- **Stripe** (cards, Apple/Google Pay, Link, multi-currency) — primary for international. *(Stripe requires a business entity in a supported country; confirm — §16.)*
- **PayPal** (international).
- **PayFast / Safepay** (PKR cards, Raast, wallets) if the home market is Pakistan.
- Bank transfer with proof upload → staff verification (fallback).
- COD (home market).
- Gift card / store credit.

### 5.9 Shipping & fulfilment
- `ShippingProvider` interface: rates, label, tracking (webhook or polling).
- Zones by country/region with flat, weight-based, price-based or live-carrier rates; **free-shipping threshold per currency**.
- International: DHL/FedEx/UPS via an aggregator (e.g. Shippo/EasyPost/ShipStation), local couriers for home market.
- Flat-pack rules: stencils ship flat with backing board — dimensional weight from the largest sheet size in the order.
- Customs: HS code per product, customs description, CN22/CN23 generation, DDP/DAP option.
- Pick/pack list, packing slip, batch label printing.
- COD remittance reconciliation for local couriers.

### 5.10 Production (replaces repairs)
- Production queue for `made_to_order` and `custom` lines: `queued → cutting → weeding/cleaning → quality_check → ready_to_pack`.
- Machine assignment (laser / plotter), material, estimated cut time, batch nesting (combine small jobs on one sheet to cut waste).
- Cut-file download per job; job sheet with barcode; QC checklist (bridges intact, edges clean, size ±1 mm); photo before pack (shown on the customer's tracker).
- Material consumption + scrap posted to inventory and ledger.
- Throughput, late jobs, scrap % and machine utilisation reports.

### 5.11 Accounting engine (double-entry, auto-posting)
Same architecture as StarTech §5.12, minus cash drawers.

**Chart of accounts (seed; owner can extend), 5-digit blocks:**
10000 Assets · 20000 Liabilities · 30000 Equity · 40000 Revenue · 50000 Cost of sales · 60000 Operating expenses. Each account has a `subtype`.
- Assets: Bank (per account & currency), Gateway Clearing (Stripe, PayPal, PayFast…), COD Receivable – Courier, Accounts Receivable – B2B, Inventory – Finished Goods, Inventory – Raw Materials, Work in Progress, Inventory in Transit, Fixed Assets (laser cutter, plotter, computers), Accumulated Depreciation, Prepaid
- Liabilities: Accounts Payable, Sales Tax/VAT Payable, Customer Deposits, Gift Card Liability, Store Credit Liability, Loyalty Points Liability, Accrued Expenses
- Equity: Owner's Capital, Drawings, Retained Earnings
- Revenue: Sales – Stencils, Sales – Custom, Sales – Digital, Sales – Tools & Kits, Sales – B2B, Shipping Income, Sales Discounts (contra), Sales Returns (contra), FX Gain
- Cost of sales: COGS – Materials, COGS – Production Labour (optional), Scrap & Wastage, Shipping Cost, Packaging
- Expenses: Gateway Fees, Marketing/Ads, Software & Hosting, Rent, Salaries, Utilities, Bank Charges, Chargebacks, FX Loss, Depreciation, Misc

**Auto-posting rules (Postgres functions, one transaction each):**

| Event | Debit | Credit |
|---|---|---|
| Online order paid via gateway | Gateway Clearing | Sales (by type); Shipping Income; Tax Payable |
| Stock item shipped | COGS | Inventory – Finished Goods |
| Production consumes materials | WIP | Inventory – Raw Materials |
| Production completes / ships | COGS | WIP |
| Digital sale | Gateway Clearing | Sales – Digital |
| Gateway payout | Bank; Gateway Fees; FX Loss (or Cr FX Gain) | Gateway Clearing |
| COD delivered / remitted | COD Receivable → Bank; Courier charges | Sales → COD Receivable |
| B2B sale on terms | AR – B2B | Sales – B2B |
| Refund | Sales Returns; (Inventory if restocked) | Gateway Clearing / Store Credit; (COGS) |
| Chargeback | Chargebacks; Gateway Clearing fee | Gateway Clearing |
| Gift card sold / redeemed | Gateway Clearing → Gift Card Liability | Gift Card Liability → Sales |
| Purchase (landed) | Inventory | Accounts Payable; Accrued freight/customs |
| Supplier payment | Accounts Payable | Bank |
| Scrap / write-off | Scrap & Wastage | Inventory |
| Expense | Expense | Bank / Payable |
| Depreciation (monthly, auto) | Depreciation | Accumulated Depreciation |

- Journals balance (DB-enforced), are immutable, corrections by reversal only; every journal links to its source document.
- **Daily auto-close** (no cash drawers): at the configured time the system locks the day, reconciles gateway charges vs orders, and emails the **Daily Report** (sales by currency/channel/product type, refunds, production, top items, stock alerts, payouts expected).
- Month-end and **year-end close** (closing entries to Retained Earnings, reversible until final lock), fixed-asset register & depreciation, **bank reconciliation** (import statement, auto-match), **gateway reconciliation** (Stripe/PayPal payout reports import), comparatives (vs previous period / same period last year), notes to accounts, **annual report pack PDF**.
- Expenses module with receipt upload (private storage) and recurring expenses (hosting, ads).

### 5.12 Reports (live from ledger & ops views; PDF + Excel export)
Trial Balance · P&L (margin by product type/collection/currency/country) · Balance Sheet · Cash Flow (indirect) · Statement of Changes in Equity · General Ledger · Bank Book · AR/AP aging · Inventory valuation (finished, raw, WIP) · Stock aging / dead stock · Sales by product / collection / surface / style / country / currency / channel / discount code · Custom Studio funnel (uploads → priced → ordered) · Conversion funnel · AOV & repeat rate · Production throughput & scrap · Shipping cost vs charged · Refunds & chargebacks · Gateway & FX reconciliation · Tax/VAT by country · Marketing ROAS (with UTM capture) · Fixed asset register · Bank reconciliation.

### 5.13 Alerts
Low stock (finished & raw), production late, payment failed spike, refund/chargeback, high-value order review, rights-check flag on custom upload, manual payment awaiting verification > 2h, payout mismatch, FX rate fetch failed, negative review (≤ 3★). Channels: in-app bell, email, WhatsApp; recipients per alert type.

### 5.14 B2B / Café & Business Portal
- Apply online (business name, country, VAT/tax ID optional); owner approves.
- Price tiers by category markup or per-variant; quantity breaks; MOQ.
- Saved logos & approved designs; **one-tap reorder**; net terms with credit limit; statement and invoices in their currency; payment links.

### 5.15 Reviews (as StarTech §5.17)
Live Google rating (Business Profile API primary, Places API fallback — live only, with attribution), on-site reviews with up to 6 photos + 1 video uploaded to UploadThing, verified-purchase badge, owner replies, moderation queue, featured reviews, "share on Google" follow-up, post-delivery review request. Optional import from Etsy/Trustpilot exports the owner owns.

### 5.16 Promotions, loyalty & referrals
Discount codes (%, fixed per currency, free shipping, BOGO, collection-specific, first-order), automatic discounts, tiered cart discounts, scheduled sales, announcement bar, hero offer carousel, gift cards, loyalty points (liability), referral credit, newsletter welcome code, spin-free "mystery stencil" on threshold (no gambling mechanics).

### 5.17 Website Content Manager (as StarTech §5.20)
Nothing on the storefront is hard-coded. Pages & sections (section library, add/delete/reorder/duplicate/hide, 30-day trash), edit-on-page mode, draft → preview (desktop/phone) → publish → version history & rollback, scheduling, FAQ Manager (feeds FAQ schema + AI answer bank), per-page SEO fields, hero media modes (3D stencil · 3D + video projected *through* the stencil · full video · image · offer carousel), muted-autoplay YouTube/uploaded reels with sound button, Project Stories & Portfolio managers, UGC gallery moderation, splash screen on/off and logo, i18n fields.

### 5.18 Appearance & themes
Presets: **Dusk Atelier** (default, mid-tone) · Stone Day (lighter) · Ink Night (darker) · Terracotta · Sage Studio · Seasonal (Christmas / Eid / Halloween / Diwali). Swatch grid, live preview, apply without flash (theme read server-side), advanced overrides (colours, logo, favicon, fonts). Visitors may toggle lighter/darker.

### 5.19 Inbox, WhatsApp, email
Unified inquiries inbox (contact forms, custom-quote questions, B2B requests, WhatsApp, inbound email via Resend) with assignment and notes; rules-first email gate (never auto-reply to notification/social/spam senders; complaints go to owner). WhatsApp Cloud API templates for order updates, proof approval, abandoned cart, back in stock. Newsletter & flows (welcome, browse abandon, post-purchase tutorial, win-back) via Resend or an ESP integration.

### 5.20 Instagram, Pinterest & social commerce
Shoppable posts/reels on site (§5.17), Instagram Graph sync (Phase 4), **Pinterest Rich Pins + product catalog feed**, Google Merchant Center feed (per country & currency), Meta catalog feed — all auto-generated from inventory.

### 5.21 AI layer
- Shop assistant (web + WhatsApp): answers from live data only via tool calls (search, stock, price in currency, order status, shipping estimate); FAQ/answer-bank first; hands off to human.
- Studio helper: "clean up my logo", "make this stencil-friendly", suggest bridge placement; never auto-approves rights-flagged artwork.
- Content helper: draft descriptions, alt text, SEO meta, blog outlines — always `needs_review`.
- Owner Copilot over whitelisted read-only views; anomaly watch.
- Provider behind an interface; per-feature token budgets logged in `ai_usage_log`.

### 5.22 Staff, roles & permissions
Roles: `super_admin`, `manager`, `inventory_clerk`, `production_operator`, `order_handler`, `accountant`, `content_editor`, `social_media`, `support_agent`, `b2b_manager`.
Granular keys (e.g. `inventory.import`, `inventory.bulk_edit`, `inventory.adjust`, `pricing.edit`, `currency.manage`, `orders.refund`, `orders.verify_payment`, `production.manage`, `studio.approve_proof`, `accounts.journal.create`, `accounts.period.close`, `reports.financial.view`, `content.edit`, `content.publish`, `content.delete`, `media.upload`, `reviews.moderate`, `promotions.manage`, `appearance.manage`, `b2b.credit_limit.edit`, `staff.manage`). Role defaults + per-employee overrides (toggle matrix); enforced in RLS, server actions (`requirePermission()`) and UI; full audit log with before/after values; 2FA for staff.

### 5.23 Super Admin menu (final)
Cockpit · Orders · Production · Custom Studio (proofs, rules, pricing) · Inventory (products, variants, raw materials, BOM, import/export, bulk media, counts) · Purchases · Customers · B2B accounts · Shipping · **Website** (Pages & sections, Hero media, Splash, Video & reels, Project stories, Portfolio/UGC, FAQ, Blog, Promotions, Appearance, SEO) · Reviews · Social & feeds · Inbox · Accounts (journals, periods & closing, fixed assets, bank & gateway reconciliation, expenses) · Reports · Staff & permissions · Audit log · Settings (business profile, **currencies & FX**, tax, payments, shipping zones, units, notifications, legal) · Data export.

---

## 6. SEO & Indexing (every page)

- **Rendering:** all public pages server-rendered/ISR (Next.js App Router); no content that only appears after client JS. 3D/Studio are progressive enhancements over real HTML.
- **URL scheme:** `/` · `/shop` · `/c/[collection]` (surface/style/occasion) · `/p/[product-slug]` · `/custom-stencils` · `/custom-stencils/[use]` (logo, coffee, cookie, signage, wall-art) · `/digital` · `/kits` · `/tutorials/[slug]` · `/blog/[slug]` · `/gallery` · `/business` · `/faq` · `/about` · `/contact` · `/track` · `/legal/[slug]`.
- **International SEO:** country/currency handled with `?currency=` *not* indexed (canonical to the clean URL); if localized content is added later, use subfolders (`/en-gb/`, `/en-us/`) with `hreflang` and x-default.
- **Metadata:** unique `<title>` and meta description per page (template + override in CMS), Open Graph & Twitter cards (auto OG image generated per product with the design on a surface), canonical tags, `robots` meta for filtered/faceted URLs (`noindex,follow` for multi-filter combinations; selected high-value filter pages promoted to indexable landing pages).
- **Structured data (JSON-LD):** Organization, WebSite + SearchAction, Product + Offer (price in the page's default currency, availability, shippingDetails, hasMerchantReturnPolicy), AggregateRating/Review (on-site reviews only), BreadcrumbList, FAQPage, HowTo/VideoObject on tutorials, Article on blog, CollectionPage/ItemList on collections. Validated in CI.
- **Sitemaps:** `sitemap.xml` index → products, collections, pages, blog, tutorials, images and video sitemaps; auto-updated on publish; `lastmod` accurate. `robots.txt` generated (block `/account`, `/cart`, `/checkout`, `/admin`, search & filter params).
- **Indexing ops:** IndexNow ping (Bing/Yandex) and Search Console sitemap submission on publish; 301 manager for changed slugs (auto-created on slug change); 404 monitor; broken-link checker.
- **Content:** programmatic landing pages from real inventory (e.g. "Moroccan wall stencils", "custom logo coffee stencils", "alphabet stencils for signs") with unique intro copy, FAQs and tutorials — no thin duplicates.
- **Performance as SEO:** Core Web Vitals budgets (§4.4) checked by Lighthouse CI; images AVIF/WebP with `srcset`, lazy below the fold, explicit dimensions; fonts self-hosted with `font-display: swap`.
- **Feeds:** Google Merchant Center, Meta, Pinterest catalog feeds per currency/country.
- **Analytics:** GA4 + Meta Pixel + Pinterest tag with server-side purchase events (consent-aware); cookie consent banner (GDPR/UK).

---

## 7. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router, TypeScript, Server Actions; route groups `(store)`, `(account)`, `(business)`, `(admin)` |
| DB/Auth | Supabase (Postgres + RLS + Auth + pg_cron + pgvector) |
| Business logic | Postgres functions (RPC) for all stock + money operations |
| Media | UploadThing (public: product images, CMS, video, reels, review media, UGC); Supabase private buckets + signed URLs (custom uploads before approval, receipts, cut files, digital products) |
| Vector/Studio | potrace or vtracer (server, WASM build in a worker), `paper.js`/`clipper-lib` for boolean ops & bridges, `opentype.js` for stencil fonts, `sharp` for raster |
| 3D | three.js + React Three Fiber + drei; `detect-gpu`; `<model-viewer>`/WebXR/Quick Look for AR |
| Motion | GSAP + ScrollTrigger (hero), Motion for micro-interactions |
| UI | Tailwind CSS + shadcn/ui with §4.2 tokens, lucide icons |
| i18n | `next-intl`; `Intl.NumberFormat` for currency |
| Search | Postgres full-text + `pg_trgm` + synonyms; pgvector semantic |
| Payments | Stripe, PayPal, PayFast/Safepay behind `PaymentProvider` |
| Shipping | Aggregator (Shippo/EasyPost) + local courier behind `ShippingProvider` |
| FX | Rates API behind `FxProvider` |
| Email | Resend + React Email |
| WhatsApp | Meta WhatsApp Cloud API |
| PDFs | `@react-pdf/renderer` (invoices, packing slips, job sheets, reports) |
| Charts | Recharts |
| Validation | Zod shared schemas |
| Testing | Vitest, Playwright, SQL tests for RPCs, Lighthouse CI |
| Hosting | Vercel |
| Monitoring | Sentry |

---

## 8. Database Outline

```
-- identity & access
profiles, roles, permissions, role_permissions, employee_permissions, audit_log

-- settings & money
settings, currencies(code, symbol, exponent, enabled, is_base),
fx_rates(base, quote, rate, source, as_of), price_rounding_rules,
countries(code, default_currency, units, tax_mode), tax_rates

-- catalog
collections(type['surface','style','occasion','custom']), tags,
products(id, name, slug, type, description, passport jsonb, seo, status, source['seed','import','manual','studio']),
product_variants(id, product_id, sku, barcode, size_w_mm, size_h_mm, repeat_w_mm,
  repeat_h_mm, material_id, thickness_um, layers, food_safe, weight_g,
  base_price, avg_cost, reorder_level, lead_time_days),
variant_prices(variant_id, currency, price, compare_at, mode['auto','manual']),
product_media, product_designs(svg_url, layer_svgs[]), bundles, bundle_items,
digital_assets(product_id, files[], licence_type, download_limit)

-- materials & production
materials, raw_items, boms, bom_lines, machines,
production_jobs(order_item_id, status, machine_id, material_id, est_minutes, photo),
production_batches, job_events

-- custom studio
studio_sessions, custom_designs(customer_id, source_upload, svg, bridges, layers,
  checks jsonb, price_breakdown, status['draft','needs_review','approved','locked']),
proofs, rights_flags

-- stock
locations, stock_movements(item_type['variant','raw'], item_id, location_id, qty,
  unit_cost, type, ref_type, ref_id, created_by, created_at),
stock_alerts, stock_counts, stock_count_lines, stock_adjustments, transfers

-- purchasing
suppliers, purchase_orders, po_lines, grns, grn_lines,
supplier_bills(currency, fx_rate), landed_cost_charges

-- customers & b2b
customers, addresses, wishlists, b2b_accounts(tier_id, credit_limit, terms_days, status),
price_tiers, loyalty_ledger, referral_codes, gift_cards, store_credit_ledger

-- orders
carts, cart_items, orders(currency, fx_rate_to_base, totals_order_ccy, totals_base),
order_items, order_events, payments, payment_webhooks, refunds, returns, return_items,
shipments, shipping_zones, shipping_rates, courier_remittances, downloads

-- accounting
accounts, journal_entries(source_type, source_id, reversal_of, currency, fx_rate),
journal_lines(debit, credit bigint, debit_ccy, credit_ccy),
accounting_periods, business_days, expenses, recurring_expenses, fixed_assets,
depreciation_runs, bank_statements, bank_statement_lines, bank_matches,
gateway_payouts, gateway_payout_lines, financial_notes

-- content & engagement
site_pages, page_sections, content_blocks, content_versions, content_schedules,
hero_settings, splash_settings, media_assets, faqs, blog_posts, blog_categories,
tutorials, project_stories, portfolio_items, ugc_submissions,
reviews, review_media, google_reviews, review_requests,
discount_codes, discount_redemptions, announcements, site_themes, theme_overrides,
redirects, inquiries, email_threads, whatsapp_threads, whatsapp_messages,
notifications, import_batches, ai_usage_log
```

Views: `v_stock_on_hand`, `v_raw_on_hand`, `v_trial_balance`, `v_profit_loss`, `v_balance_sheet`, `v_general_ledger`, `v_ar_aging`, `v_ap_aging`, `v_dead_stock`, `v_daily_summary`, `v_sales_by_currency`, `v_production_queue`.

Key RPCs: `place_order`, `handle_payment_webhook`, `verify_manual_payment`, `expire_unpaid_orders`, `confirm_cod`, `create_custom_design`, `approve_proof`, `start_production_job`, `complete_production_job`, `ship_order`, `issue_refund`, `receive_grn`, `allocate_landed_cost`, `approve_adjustment`, `import_batch_commit`, `import_batch_rollback`, `refresh_fx_rates`, `reprice_auto_currencies`, `import_gateway_payout`, `run_daily_close`, `close_period`, `post_manual_journal`, `reverse_journal`, `grant_download`.

---

## 9. Engineering Rules
1. Money is integer minor units + currency code; formatting only in UI via `Intl.NumberFormat`.
2. Stock and money change only through RPCs inside one transaction; RLS denies direct writes.
3. Journals balance (DB-enforced), are immutable, corrected by reversal.
4. Every order stores its currency and FX snapshot; never recompute historical amounts with today's rate.
5. RLS on every table; storefront never sees cost, margin, supplier, or other customers' data.
6. Idempotency keys on checkout, payments, webhooks and imports.
7. Every third party (payments, shipping, FX, WhatsApp, AI, rates) behind an interface with retries, timeouts and a mock for local dev.
8. Sensitive actions audit-logged.
9. Seed script: ≈300 original procedurally generated products (§5.5), raw materials and BOMs, 4 currencies, a month of orders across countries, production jobs, refunds, B2B orders, payouts.
10. Integrity tests: after every accounting scenario, trial balance balances and stock = sum of movements. CI fails otherwise.
11. Performance, accessibility and SEO budgets (§4.4, §4.5, §6) checked in CI.
12. Never copy third-party product images, artwork or copy into the repo or seed data.

---

## 10. Security & Privacy
- Customer uploads to the Studio stay private until the order is approved; purged after N days if no order (configurable).
- Digital downloads via short-lived signed URLs with per-order limits and watermark/licence ID in file metadata.
- Rate limits on Studio uploads, order lookup and discount-code attempts; bot protection (Turnstile) on forms.
- Staff 2FA; sessions expire; re-auth for refunds, period close, currency base changes.
- GDPR/UK-GDPR: consent, data export and deletion requests; cookie banner.
- Daily automated backups + weekly export to owner storage.

---

## 11. Cost Model (monthly, early stage — verify current pricing at build time)
Supabase (free → Pro) · Vercel Pro · domain · Resend (free tier initially) · UploadThing (free → paid as video grows) · Stripe/PayPal per-transaction fees (+ currency conversion fees) · shipping aggregator per label · FX rates API (free tier usually enough) · WhatsApp per conversation · AI per token with budgets · Google APIs (Business Profile free with approval; Places pay-per-use).

---

## 12. KPIs on the Cockpit
Revenue & gross margin (base currency, plus by currency/country) · orders & AOV · conversion rate & funnel · Studio funnel (uploads → priced → ordered) · custom proof turnaround · production on-time % and scrap % · stock-outs on top 50 SKUs · raw-material days of cover · refund & chargeback rate · shipping cost vs charged · repeat-customer rate · B2B revenue & AR overdue · Google rating & review count · organic sessions & indexed pages · Core Web Vitals.

---

## 13. Folder Structure
```
/app
  /(store)  /(account)  /(business)  /(admin)
  /custom-stencils  /track  /download/[token]
  /api/webhooks/{payments,shipping,whatsapp,email}  /api/cron/*  /api/feeds/*
  /sitemap.ts  /robots.ts
/components  /components/ui (shadcn)  /components/3d  /components/studio
/lib
  /auth /accounting /inventory /production /studio /currency /payments
  /shipping /fx /whatsapp /email /ai /cms /media /reviews /seo /import
/supabase/migrations  /supabase/seed  /supabase/tests
/scripts/seed-designs   (procedural SVG generators + mock-up renderer)
/tests/e2e
```

---

## 14. Build Phases

**Phase 1 — Back office core**
Auth, roles/permissions, audit · currencies, FX, price lists · products, variants, raw materials, BOM · stock movements, GRN, landed cost, counts, adjustments · bulk import/export, bulk media upload, bulk edit grid, import rollback · **seed library (§5.5)** · chart of accounts + auto-posting · daily auto-close + report email · TB / P&L / BS · alerts · Owner Cockpit v1.

**Phase 2 — Storefront, checkout & content**
Design tokens + Dusk Atelier theme · splash screen · 3D "Light Through the Stencil" hero (+ CSS-3D and poster fallbacks) · Surface Finder · homepage framework (§4.6) · collections, filters, product page with Passport, calculator, layer preview · cart, multi-currency checkout, Stripe/PayPal/local gateway, manual transfer, COD option · order tracking · emails/WhatsApp notifications · shipping zones, rates, labels · digital downloads · Content Manager, themes, FAQ, blog, tutorials · reviews (on-site + Google) · promotions, gift cards · full SEO (§6) and feeds.

**Phase 3 — Custom Studio & production**
Studio (trace, auto-bridge, checks, live price, previews) · proof workflow · production queue, batching, QC photos · See It On Your Surface (photo upload) + AR · Project Wallet & reorder · B2B portal · loyalty & referrals · UGC gallery · inbox & email gate · month/year-end close, bank & gateway reconciliation, fixed assets.

**Phase 4 — Intelligence & scale**
AI shop assistant · Studio AI helper · Owner Copilot + anomaly watch · Instagram Graph & Pinterest sync · additional carriers/3PL · localized storefronts with hreflang · annual report pack.

---

## 15. Environment Variables
```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPLOADTHING_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
LOCAL_GATEWAY=payfast|safepay|none
LOCAL_GATEWAY_MERCHANT_ID=
LOCAL_GATEWAY_SECRET=
SHIPPING_PROVIDER=shippo|easypost
SHIPPING_API_KEY=
LOCAL_COURIER_PROVIDER=
LOCAL_COURIER_API_KEY=
FX_PROVIDER=
FX_API_KEY=
RESEND_API_KEY=
RESEND_INBOUND_WEBHOOK_SECRET=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
GOOGLE_PLACES_API_KEY=
GOOGLE_BUSINESS_CLIENT_ID=
GOOGLE_BUSINESS_CLIENT_SECRET=
GOOGLE_BUSINESS_REFRESH_TOKEN=
NEXT_PUBLIC_GOOGLE_PLACE_ID=
GOOGLE_SEARCH_CONSOLE_SITE=
INDEXNOW_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
AI_PROVIDER_API_KEY=
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_PINTEREST_TAG_ID=
SENTRY_DSN=
```

---

## 16. Open Questions (confirm with client)
- Brand name, domain, logo; approve the Dusk Atelier palette or supply brand colours.
- Client's country and legal entity (decides Stripe eligibility — e.g. Pakistan-registered businesses need a supported-country entity for Stripe; otherwise PayPal + local gateway).
- Base currency and launch selling currencies; auto vs manual pricing per currency.
- Target countries for shipping at launch; preferred carriers/aggregator; DDP or DAP.
- Production setup: own laser cutter/plotter (model, bed size, materials) or outsourced cutting? Max sheet size?
- Materials and thicknesses offered; food-safe certification documents for cake/coffee lines.
- Custom stencil pricing rules, setup fee policy, turnaround promise, rights/trademark policy.
- Digital download licence terms (personal vs commercial) and pricing.
- Does the client own an existing catalog or supplier feed to import? (Competitor images/copy will not be copied — §5.5.)
- Return/refund policy (stock vs custom vs digital).
- Tax/VAT registrations (home, UK, EU OSS, US states).
- Opening balances: stock, materials, bank, payables.
- Staff count and roles.
- Google Business Profile ownership and Place ID; existing reviews and UGC to import.
- Year-end date; opening fixed-asset list (cutters, computers).
- Reference zip "The Creative Corner — Stripe Payment Gateway": share it in the repo (or its key files) so its checkout/Stripe flow can be reviewed; it was not accessible from the build environment.

---

## 17. Implementation status & decisions (v1 build)

Built as one Next.js 15 app (store + admin) on Postgres via Prisma. Deviations from the brief, each chosen to keep the ledger correct while shipping everything at once:

- **Business logic in TypeScript services** (`lib/services/*`) inside Prisma transactions instead of Postgres RPCs; journal balance and immutability are still enforced by database triggers (see the init migration).
- **Auth**: signed-cookie sessions (jose) for staff and customers instead of Supabase Auth; staff permissions per §5.22 in `lib/permissions.ts`.
- **Content publishing**: edits publish immediately and every change is versioned with one-click rollback (no separate draft/preview state).
- **3D tiering**: lightweight heuristic (WebGL2 + cores + Save-Data + reduced motion) instead of `detect-gpu`.
- **Revenue & COGS** are recognised when payment is received; made-to-order/custom costs flow raw materials → WIP (job start) → COGS (job done).
- **Daily close** runs for the previous business day (nightly cron) so trading on the current day is never locked.
- **Not yet built** (Phase 4 / needs third-party accounts): AI shop assistant & Owner Copilot, WhatsApp Cloud API messaging (links + bubble only), Instagram/Pinterest sync, live Google reviews, carrier label APIs (tracking numbers are entered manually), AR on mobile, Urdu/RTL.
