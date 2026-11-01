import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { AccountsTabs } from "@/components/admin/AccountsTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { addAsset, dailyClose, depreciation, ownerEquity, payout, periodClose, yearClose } from "@/app/admin/actions/accounts";

export default async function Closing() {
  await requireStaff("accounts.view");
  const [{ base }, days, locks, assets, payouts] = await Promise.all([
    getCurrencies(),
    db.businessDay.findMany({ orderBy: { date: "desc" }, take: 14 }),
    db.periodLock.findMany({ orderBy: { upTo: "desc" }, take: 5 }),
    db.fixedAsset.findMany({ orderBy: { purchasedAt: "desc" } }),
    db.gatewayPayout.findMany({ orderBy: { date: "desc" }, take: 10 }),
  ]);
  const fm = (m: bigint | number) => formatMoney(BigInt(m), base.code, base.exponent);
  const y = new Date().getUTCFullYear();
  const lastMonth = new Date(Date.UTC(y, new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  return (
    <div className="space-y-6">
      <PageHeader title="Closing, assets & payouts" sub="The daily close runs automatically every night (Vercel Cron) for the previous business day; you can also run it here." />
      <AccountsTabs active="closing" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Daily close">
          <ActionForm action={dailyClose}><button className="btn btn-primary w-full">Close yesterday now</button></ActionForm>
          <table className="tbl mt-4"><tbody>{days.map((d) => { const r = d.report as { revenueBase: number; paidOrders: number; trialBalanced: boolean }; return <tr key={d.date}><td>{d.date}</td><td className="num">{fm(r.revenueBase)}</td><td className="num">{r.paidOrders} orders</td><td>{r.trialBalanced ? "✓" : "✗"}</td></tr>; })}</tbody></table>
        </Panel>
        <Panel title="Month-end close">
          <ActionForm action={periodClose}>
            <Field label="Lock all journals before"><input name="upTo" type="date" required className="input" /></Field>
            <p className="text-xs text-ink3">Checks: trial balance balances and no unpaid orders before the date.</p>
            <button className="btn btn-soft w-full">Close period</button>
          </ActionForm>
          <ul className="mt-3 space-y-1 text-xs text-ink3">{locks.map((l) => <li key={l.id}>{l.kind} lock to {l.upTo.toISOString().slice(0, 10)}</li>)}</ul>
        </Panel>
        <Panel title="Year-end close">
          <ActionForm action={yearClose} confirm="Close the year? Revenue and expenses move into Retained Earnings and the year is locked.">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Year start"><input name="start" type="date" defaultValue={`${y - 1}-01-01`} className="input" /></Field>
              <Field label="Year end (exclusive)"><input name="end" type="date" defaultValue={`${y}-01-01`} className="input" /></Field>
            </div>
            <button className="btn btn-soft w-full">Close year</button>
          </ActionForm>
        </Panel>
        <Panel title="Gateway / courier payouts">
          <ActionForm action={payout}>
            <Field label="Provider"><select name="provider" className="select"><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="card_demo">Card (local gateway)</option><option value="cod">COD courier remittance</option></select></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Gross"><input name="gross" required className="input" /></Field>
              <Field label="Fees"><input name="fees" className="input" /></Field>
              <Field label="Net received"><input name="net" required className="input" /></Field>
            </div>
            <input name="ref" placeholder="Payout reference" className="input" />
            <p className="text-xs text-ink3">All in {base.code}. Any difference between gross − fees and net is posted as FX gain/loss.</p>
            <button className="btn btn-soft w-full">Post payout</button>
          </ActionForm>
          <ul className="mt-3 space-y-1 text-xs text-ink2">{payouts.map((p) => <li key={p.id}>{p.date.toLocaleDateString()} · {p.provider} · net {fm(p.netBase)}{p.fxDiffBase !== 0n && ` · FX ${fm(p.fxDiffBase)}`}</li>)}</ul>
        </Panel>
        <Panel title="Fixed assets & depreciation">
          <table className="tbl mb-3"><tbody>{assets.map((a) => <tr key={a.id}><td>{a.name}</td><td className="num">{fm(a.cost)}</td><td className="num text-ink3">NBV {fm(a.cost - a.depreciated)}</td></tr>)}</tbody></table>
          <ActionForm action={depreciation} className="mb-4 flex gap-2"><input name="month" type="month" defaultValue={lastMonth} className="input" aria-label="Month" /><button className="btn btn-soft">Run depreciation</button></ActionForm>
          <ActionForm action={addAsset}>
            <input name="name" required placeholder="Asset name" className="input" />
            <div className="grid grid-cols-3 gap-2"><input name="cost" required placeholder="Cost" className="input" /><input name="salvage" placeholder="Salvage" className="input" /><input name="life" type="number" placeholder="Months" className="input" /></div>
            <div className="grid grid-cols-2 gap-2"><input name="date" type="date" className="input" aria-label="Purchase date" /><select name="paid" className="select"><option value="bank">Paid from bank</option><option value="ap">On credit (AP)</option></select></div>
            <button className="btn btn-soft w-full">Add asset</button>
          </ActionForm>
        </Panel>
        <Panel title="Owner's capital & drawings">
          <ActionForm action={ownerEquity}>
            <select name="kind" className="select"><option value="capital">Capital introduced (into bank)</option><option value="drawings">Drawings (out of bank)</option></select>
            <input name="amount" required placeholder={`Amount (${base.code})`} className="input" />
            <button className="btn btn-soft w-full">Post</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
