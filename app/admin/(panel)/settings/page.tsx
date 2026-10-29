import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings, getCurrencies } from "@/lib/settings";
import { majorString } from "@/lib/money";
import { stripeEnabled, paypalEnabled } from "@/lib/payments";
import { PageHeader, Panel, Field, Tabs } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { changeBase, fxRefresh, saveBusiness, saveCurrency, savePayments, saveZone } from "@/app/admin/actions/settings";

const ROUNDING = ["NONE", "END_99", "NEAREST_1", "NEAREST_5", "NEAREST_10", "NEAREST_50", "NEAREST_100"];

export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("settings.manage");
  const tab = (await searchParams).tab ?? "business";
  const s = await getSettings();
  const { list, base } = await getCurrencies();
  const tabs = [["business", "Business & tax"], ["currencies", "Currencies & FX"], ["shipping", "Shipping"], ["payments", "Payments & Studio pricing"]].map(([key, label]) => ({ key, label, href: `/admin/settings?tab=${key}` }));

  if (tab === "currencies") {
    const journals = await db.journalEntry.count();
    const history = await db.fxRate.findMany({ orderBy: { asOf: "desc" }, take: 20 });
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Tabs tabs={tabs} active={tab} />
        <Panel title={`Base currency: ${base.code}`} actions={<ActionForm action={fxRefresh} className="contents"><button className="btn btn-soft btn-sm">Refresh FX rates now</button></ActionForm>}>
          <p className="mb-3 text-sm text-ink2">All accounting is kept in the base currency. Each order stores its own currency and the exchange rate at the moment of purchase, so historical amounts never change. Rates refresh automatically every night (frozen currencies are skipped).</p>
          {journals === 0 ? (
            <ActionForm action={changeBase} className="flex gap-2"><select name="code" defaultValue={base.code} className="select max-w-xs">{list.map((c) => <option key={c.code}>{c.code}</option>)}</select><button className="btn btn-soft">Set base currency</button></ActionForm>
          ) : <p className="text-xs text-ink3">Base currency is locked because the ledger already has entries.</p>}
        </Panel>
        <div className="card overflow-x-auto p-2">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th>Decimals</th><th>Rate (per 1 {base.code})</th><th>Freeze</th><th>Markup %</th><th>Rounding</th><th>Pricing</th><th>Order</th><th>On</th><th /></tr></thead>
            <tbody>
              {[...list, null].map((c) => (
                <tr key={c?.code ?? "new"}>
                  <td colSpan={12} className="!p-1">
                    <ActionForm action={saveCurrency} className="grid grid-cols-12 items-center gap-1">
                      <input name="code" defaultValue={c?.code} placeholder="NEW" readOnly={Boolean(c)} className="input !py-1 font-mono" />
                      <input name="name" defaultValue={c?.name} className="input !py-1" aria-label="Name" />
                      <input name="symbol" defaultValue={c?.symbol} className="input !py-1" aria-label="Symbol" />
                      <input name="exponent" type="number" min={0} max={3} defaultValue={c?.exponent ?? 2} className="input !py-1" aria-label="Decimals" />
                      <input name="rate" defaultValue={c?.rate} className="input !py-1" disabled={c?.isBase} aria-label="Rate" />
                      <label className="flex justify-center"><input type="checkbox" name="frozen" defaultChecked={c?.rateFrozen} aria-label="Freeze rate" /></label>
                      <input name="markup" type="number" step="0.1" defaultValue={c?.markupPct ?? 0} className="input !py-1" disabled={c?.isBase} aria-label="Markup" />
                      <select name="rounding" defaultValue={c?.rounding ?? "END_99"} className="select !py-1 text-xs" disabled={c?.isBase}>{ROUNDING.map((r) => <option key={r}>{r}</option>)}</select>
                      <select name="mode" defaultValue={c?.pricingMode ?? "AUTO"} className="select !py-1 text-xs" aria-label="Pricing mode"><option value="AUTO">auto</option><option value="MANUAL">manual first</option></select>
                      <input name="sort" type="number" defaultValue={c?.sort ?? 0} className="input !py-1" aria-label="Order" />
                      <label className="flex justify-center"><input type="checkbox" name="enabled" defaultChecked={c?.enabled ?? true} aria-label="Enabled" /></label>
                      <button className="btn btn-soft btn-sm">{c ? "Save" : "Add"}</button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink3">Manual per-currency prices are set on each product&apos;s variants and always win over automatic conversion.</p>
        <Panel title="Rate history"><ul className="grid gap-1 text-xs text-ink2 sm:grid-cols-2">{history.map((h) => <li key={h.id}>{h.asOf.toLocaleString()} · {h.code} {h.rate.toPrecision(6)} · {h.source}</li>)}</ul></Panel>
      </div>
    );
  }

  if (tab === "shipping") {
    const zones = await db.shippingZone.findMany({ orderBy: { sort: "asc" }, include: { rates: true } });
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" sub={`Rates are in ${base.code} and convert to the visitor's currency automatically. Use "*" for rest of world.`} />
        <Tabs tabs={tabs} active={tab} />
        {[...zones, null].map((z) => (
          <Panel key={z?.id ?? "new"} title={z ? z.name : "New zone"}>
            <ActionForm action={saveZone}>
              <input type="hidden" name="id" value={z?.id ?? ""} />
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_80px]">
                <input name="name" defaultValue={z?.name} placeholder="Zone name" required className="input" />
                <input name="countries" defaultValue={z?.countries.join(", ")} placeholder="Country codes: PK, GB, … or *" className="input" />
                <input name="sort" type="number" defaultValue={z?.sort ?? 0} className="input" aria-label="Order" />
              </div>
              {z?.rates.map((r) => (
                <div key={r.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-8">
                  <input type="hidden" name="rid" value={r.id} />
                  <input name={`name_${r.id}`} defaultValue={r.name} className="input !py-1 sm:col-span-2" />
                  <input name={`price_${r.id}`} defaultValue={majorString(r.priceBase)} className="input !py-1" aria-label="Price" />
                  <input name={`free_${r.id}`} defaultValue={r.freeOverBase ? majorString(r.freeOverBase) : ""} placeholder="Free over" className="input !py-1" />
                  <input name={`min_${r.id}`} defaultValue={r.minDays} className="input !py-1" aria-label="Min days" />
                  <input name={`max_${r.id}`} defaultValue={r.maxDays} className="input !py-1" aria-label="Max days" />
                  <label className="text-xs"><input type="checkbox" name={`active_${r.id}`} defaultChecked={r.active} /> active</label>
                  <label className="text-xs text-danger"><input type="checkbox" name={`del_${r.id}`} /> delete</label>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                <input name="new_name" placeholder="+ New rate name" className="input !py-1 sm:col-span-2" />
                <input name="new_price" placeholder="Price" className="input !py-1" />
                <input name="new_free" placeholder="Free over" className="input !py-1" />
                <input name="new_min" placeholder="Min days" className="input !py-1" />
                <input name="new_max" placeholder="Max days" className="input !py-1" />
              </div>
              <div className="flex gap-2"><button name="op" value="save" className="btn btn-soft btn-sm">Save zone</button>{z && <button name="op" value="delete" className="btn btn-ghost btn-sm text-danger">Delete zone</button>}</div>
            </ActionForm>
          </Panel>
        ))}
      </div>
    );
  }

  if (tab === "payments") {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Tabs tabs={tabs} active={tab} />
        <ActionForm action={savePayments} className="grid gap-6 xl:grid-cols-2">
          <Panel title="Payment methods">
            <ul className="mb-4 space-y-1 text-sm">
              <li>Stripe (cards, Apple/Google Pay): <b className={stripeEnabled() ? "text-mint" : "text-mustard"}>{stripeEnabled() ? "connected" : "add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET"}</b></li>
              <li>PayPal: <b className={paypalEnabled() ? "text-mint" : "text-mustard"}>{paypalEnabled() ? "connected" : "add PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET"}</b></li>
            </ul>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="demoCard" defaultChecked={s.payments.demoCard} />Test card (only shown while Stripe is not connected — turn off before launch)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="bankTransfer" defaultChecked={s.payments.bankTransfer} />Bank transfer</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="cod" defaultChecked={s.payments.cod} />Cash on delivery</label>
              <Field label="COD countries"><input name="codCountries" defaultValue={s.payments.codCountries.join(", ")} className="input" /></Field>
              <Field label="Bank details shown to customers"><textarea name="bankDetails" defaultValue={s.payments.bankDetails} rows={4} className="textarea font-mono text-sm" /></Field>
            </div>
          </Panel>
          <Panel title={`Custom Studio pricing (${base.code})`}>
            <p className="mb-3 text-sm text-ink2">Unit price = base fee + sheet area × material rate (set per material) + cut length × complexity rate + setup fee ÷ quantity. Bulk discounts: 5+ 10%, 10+ 15%, 25+ 25%.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Base fee"><input name="baseFee" defaultValue={majorString(s.studio.baseFeeBase)} className="input" /></Field>
              <Field label="Per metre of cut"><input name="perMeter" defaultValue={majorString(s.studio.complexityPerMeterBase)} className="input" /></Field>
              <Field label="Setup fee (per order line)"><input name="setupFee" defaultValue={majorString(s.studio.setupFeeBase)} className="input" /></Field>
            </div>
          </Panel>
          <div><button className="btn btn-primary">Save</button></div>
        </ActionForm>
      </div>
    );
  }

  const b = s.business;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Tabs tabs={tabs} active={tab} />
      <ActionForm action={saveBusiness} className="grid gap-6 xl:grid-cols-2">
        <Panel title="Business profile">
          <div className="grid gap-3 sm:grid-cols-2">
            {([["name", "Business name"], ["tagline", "Tagline"], ["email", "Email"], ["phone", "Phone"], ["whatsapp", "WhatsApp number (digits)"], ["address", "Address"], ["country", "Country (ISO-2)"], ["timezone", "Timezone (IANA)"], ["instagram", "Instagram URL"], ["pinterest", "Pinterest URL"], ["facebook", "Facebook URL"], ["youtube", "YouTube URL"]] as const).map(([k, l]) => (
              <Field key={k} label={l}><input name={k} defaultValue={b[k]} className="input" /></Field>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Tax">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Rate %"><input name="taxRate" type="number" step="0.01" defaultValue={s.tax.ratePct} className="input" /></Field>
              <Field label="Label"><input name="taxLabel" defaultValue={s.tax.label} className="input" /></Field>
              <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="taxInclusive" defaultChecked={s.tax.inclusive} />Prices include tax</label>
            </div>
          </Panel>
          <Panel title="Orders & units">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Unpaid bank-transfer expiry (hours)"><input name="expiryHours" type="number" defaultValue={s.orders.expiryHours} className="input" /></Field>
              <Field label="Default unit"><select name="defaultUnit" defaultValue={s.units.defaultUnit} className="select"><option value="cm">cm</option><option value="in">inches</option></select></Field>
              <Field label="Inch countries"><input name="inchCountries" defaultValue={s.units.inchCountries.join(", ")} className="input" /></Field>
            </div>
          </Panel>
          <button className="btn btn-primary">Save</button>
        </div>
      </ActionForm>
    </div>
  );
}
