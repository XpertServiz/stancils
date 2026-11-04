import { ActionForm } from "@/components/admin/ActionForm";
import { deleteCatalogue, resetTransactions } from "@/app/admin/actions/danger";

export function DangerZone({ counts }: { counts: { orders: number; customers: number; journals: number; products: number } }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">These actions can&apos;t be undone. Only the owner (Super Admin) can run them, and each one is recorded in the audit log. Export anything you want to keep first (Orders → Export CSV, Reports → Export).</p>
      <section className="card border-mustard/60 p-5">
        <h2 className="font-semibold">Clear test transactions</h2>
        <p className="mt-1 text-sm text-ink2">Deletes all <b>{counts.orders}</b> orders, <b>{counts.customers}</b> customers, payments, refunds, custom designs, reviews, inbox messages, purchase orders, expenses and all <b>{counts.journals}</b> accounting entries. <b>Keeps</b> your products, current stock levels, raw materials, settings, website content, bank accounts and staff. Opening balances are re-posted from the stock you keep, so the books start clean and balanced.</p>
        <ActionForm action={resetTransactions} className="mt-3 flex flex-wrap items-center gap-2" confirm="Delete all orders, customers and accounting entries? This cannot be undone.">
          <input name="confirm" placeholder="Type RESET" className="input !w-40" autoComplete="off" />
          <button className="btn btn-danger">Clear test transactions</button>
        </ActionForm>
      </section>
      <section className="card border-danger/60 p-5">
        <h2 className="font-semibold text-danger">Delete the whole catalogue</h2>
        <p className="mt-1 text-sm text-ink2">Everything above, <b>plus all {counts.products} products</b>, their sizes, prices, photos and stock. Collections, raw materials, settings, content and staff stay, so you can import or add your own products afterwards.</p>
        <ActionForm action={deleteCatalogue} className="mt-3 flex flex-wrap items-center gap-2" confirm="Delete every product and all transactions? This cannot be undone.">
          <input name="confirm" placeholder="Type DELETE ALL" className="input !w-44" autoComplete="off" />
          <button className="btn btn-danger">Delete all products</button>
        </ActionForm>
      </section>
    </div>
  );
}
