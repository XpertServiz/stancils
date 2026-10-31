# Creative Corner — Stencil Commerce OS

An online stencil store with a back office that runs itself: storefront with a 3D hero, custom stencil studio, multi-currency checkout, made-to-order production, inventory with raw-material costing, double-entry accounting, reports and a full website content manager.

The product brief is in [`CLAUDE.md`](./CLAUDE.md).

## What's inside

**Storefront**
- "Light Through the Stencil" 3D hero (three.js) with CSS-3D and poster fallbacks; 1.6s laser-cut splash screen
- Mid-tone **Dusk Atelier** theme (+ 4 presets switchable from admin; visitors can toggle lighter/darker)
- ~310 original, procedurally generated stencil designs seeded as real products (no copied images)
- Shop by surface / style / occasion, typo-tolerant search, filters, sorting
- Product page: sizes, multi-currency prices, **See It On Your Surface** (incl. your own photo), **Layer Explorer**, **Repeat & Paint Calculator**, **Cut-Quality Passport**, digital cut-file add-on, reviews
- **Custom Stencil Studio**: upload or type → threshold → automatic island detection and **auto-bridging** → fine-detail check → live price → server-side vector tracing (potrace) → cart
- Currency switcher (PKR, USD, EUR, GBP, AED…; geo-detected) and cm/inch toggle
- Checkout: Stripe, PayPal, bank transfer, cash on delivery, test card (dev), discount codes, business pricing
- Order page & tracking with production timeline, digital downloads (signed, limited)
- Account: orders, Project Wallet (reorder custom designs), wishlist; business account applications
- Tutorials/blog, FAQ, contact, policy pages
- SEO: server-rendered pages, JSON-LD (Product, Offer, FAQPage, Breadcrumb, HowTo/Article, WebSite search, OnlineStore), sitemap, robots, canonical URLs, noindex on filtered pages, 301s on slug changes, per-product share images, IndexNow pings

**Admin (`/admin`)**
- Cockpit (revenue, margin, currency mix, to-dos, alerts, top sellers)
- Orders (verify payments, status & tracking, refunds with restock, notes, invoices / packing slips, CSV export)
- Production queue (materials → WIP → COGS), custom-design checks, cut-file downloads
- Products with bulk actions (publish, archive, % price change, collections, delete), variants, manual per-currency prices, BOM, photos, SVG artwork, SEO
- Inventory: stock levels, adjustments (posted to the ledger), movements, raw materials, **CSV / Shopify import with dry-run and rollback**, export, **bulk image upload matched by SKU or slug**
- Purchases: suppliers, purchase orders, receiving with **landed cost** (freight/customs/FX), supplier payments
- Customers, business accounts (discounts, payment terms), promotions, reviews moderation, inbox, alerts
- Website: homepage sections (edit, hide, reorder, duplicate, delete with 30-day trash, version rollback), hero/announcement/splash/SEO, themes, collections, FAQ, blog, project stories, policy pages
- Accounts: journals (immutable, reversal-only), manual journals, chart of accounts, expenses with receipts, daily close (automatic nightly), month-end & year-end close, fixed assets & depreciation, gateway/courier payouts with FX gain/loss, bank reconciliation from CSV
- Reports: P&L (vs previous period), balance sheet, trial balance, cash flow, general ledger, sales by currency/country/method/collection/product, inventory valuation & stock age — all exportable to CSV/Excel
- Staff & roles with per-person permission overrides, audit log, settings (business, tax, currencies & FX, shipping zones, payment methods, studio pricing)

**Ledger integrity**: the database itself rejects unbalanced or edited journal lines; stock and money only move through services that write a balanced journal in the same transaction. `npm test` checks the trial balance, balance sheet and stock-equals-movements.

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
cp .env.example .env      # set DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate deploy
npm run db:seed           # catalogue, accounts, currencies, content, admin user
npm run dev
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin (the ADMIN_EMAIL / ADMIN_PASSWORD you set)

Optional demo orders for testing reports (never on production): `npm run db:seed:demo` (wipes and reseeds).

Tests: `npm test` · Typecheck: `npm run typecheck`

## Deploy (Vercel + Supabase)

1. Create a Supabase project. Copy the **Transaction pooler** connection string into `DATABASE_URL` (add `?pgbouncer=true`) and the **direct/session** string into `DIRECT_URL`.
2. Import this GitHub repo into Vercel. Add the environment variables from `.env.example`. Vercel uses `npm run vercel-build`, which runs database migrations automatically.
3. Seeding is automatic on the first deploy: `vercel-build` runs `prisma/seed-if-empty.ts`, which seeds the original catalogue, accounts and admin user **only when the database has no products and no orders** (it never touches a live store). It needs `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `SEED_BASE_CURRENCY` set in Vercel for that first build; remove `ADMIN_PASSWORD` from Vercel afterwards if you like. Set `SEED_ON_DEPLOY=false` to disable. (Manual alternative from your computer: `DATABASE_URL=... DIRECT_URL=... npm run db:seed:if-empty`.)
4. Add `UPLOADTHING_TOKEN` (media uploads), `RESEND_API_KEY` (emails), Stripe and/or PayPal keys, and `CRON_SECRET`.
5. In Stripe, add a webhook to `https://your-domain.com/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
6. In admin → Settings → Payments, turn **off** the test card before launch.
7. Submit `https://your-domain.com/sitemap.xml` in Google Search Console.

`vercel.json` schedules the nightly job (00:10 Pakistan time): FX refresh, expiring unpaid bank-transfer orders, daily close (report emailed to the business email), and monthly depreciation on the 1st.

## Notes

- Base currency is chosen at seed time (`SEED_BASE_CURRENCY`) and locks after the first journal.
- Stripe requires a business entity in a Stripe-supported country. Without it, use PayPal, bank transfer and COD (or add a local gateway behind `lib/payments`).
- Seeded product descriptions are flagged "needs review" so the owner can edit them before launch.
