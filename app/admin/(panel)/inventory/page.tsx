import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, Tabs, Pager, Empty, Stat } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { adjustStock } from "@/app/admin/actions/inventory";

export default async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("inventory.view");
  const sp = await searchParams;
  const tab = sp.tab ?? "stock";
  const page = Math.max(1, Number(sp.page) || 1);
  const { base } = await getCurrencies();
  const fm = (m: bigint) => formatMoney(m, base.code, base.exponent);
  const tabs = [{ key: "stock", label: "Stock levels", href: "/admin/inventory" }, { key: "moves", label: "Movements", href: "/admin/inventory?tab=moves" }, { key: "mat", label: "Raw materials", href: "/admin/inventory/materials" }, { key: "import", label: "Import / export / media", href: "/admin/inventory/import" }];

  if (tab === "moves") {
    const where: Prisma.StockMovementWhereInput = sp.q ? { OR: [{ variant: { sku: { contains: sp.q, mode: "insensitive" } } }, { material: { code: { contains: sp.q, mode: "insensitive" } } }] } : {};
    const [total, moves] = await Promise.all([db.stockMovement.count({ where }), db.stockMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { variant: true, material: true } })]);
    return (
      <div>
        <PageHeader title="Inventory" />
        <Tabs tabs={tabs} active="moves" />
        <form className="mb-3 flex gap-2"><input type="hidden" name="tab" value="moves" /><input name="q" defaultValue={sp.q} placeholder="SKU or material code" className="input max-w-xs" /><button className="btn btn-soft">Search</button></form>
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>When</th><th>Item</th><th>Type</th><th className="num">Qty</th><th className="num">Unit cost</th><th>Reference</th><th>Note</th></tr></thead>
            <tbody>{moves.map((m) => <tr key={m.id}><td className="whitespace-nowrap text-ink2">{m.createdAt.toLocaleString()}</td><td className="font-mono text-xs">{m.variant?.sku ?? m.material?.code}</td><td className="text-xs">{m.type.toLowerCase().replace("_", " ")}</td><td className={`num ${m.qty < 0 ? "text-danger" : "text-mint"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</td><td className="num">{m.materialId ? `${fm(m.unitCost)}/1k` : fm(m.unitCost)}</td><td className="text-xs">{m.refType === "order" ? <Link className="text-accent" href={`/admin/orders/${m.refId}`}>order</Link> : m.refType}</td><td className="text-xs text-ink3">{m.note}</td></tr>)}</tbody>
          </table>
        </div>
        <Pager page={page} pages={Math.ceil(total / 50)} href={(p) => `?tab=moves&page=${p}${sp.q ? `&q=${sp.q}` : ""}`} />
      </div>
    );
  }

  const where: Prisma.VariantWhereInput = {
    isDigital: false,
    product: { type: { in: ["STOCK_PHYSICAL", "TOOL", "BUNDLE"] } },
    ...(sp.q ? { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const all = await db.variant.findMany({ where, include: { product: true }, orderBy: [{ onHand: "asc" }, { sku: "asc" }] });
  const filtered = sp.low ? all.filter((v) => v.onHand - v.reserved <= v.reorderLevel) : all;
  const rows = filtered.slice((page - 1) * 50, page * 50);
  const value = all.reduce((a, v) => a + BigInt(Math.max(0, v.onHand)) * v.avgCost, 0n);
  const units = all.reduce((a, v) => a + v.onHand, 0);
  const low = all.filter((v) => v.onHand - v.reserved <= v.reorderLevel).length;
  return (
    <div>
      <PageHeader title="Inventory" sub="Stock changes only through adjustments, purchases, sales and production — every change is a movement and a journal." />
      <Tabs tabs={tabs} active="stock" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Finished goods value" value={fm(value)} sub="at weighted average cost" />
        <Stat label="Units on hand" value={units.toLocaleString()} />
        <Stat label="Tracked SKUs" value={all.length} />
        <Stat label="Low / out" value={low} tone={low ? "mustard" : undefined} sub={<Link href="/admin/inventory?low=1" className="text-accent">Show</Link>} />
      </div>
      <form className="mb-3 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="SKU or product" className="input max-w-xs" />{sp.low && <input type="hidden" name="low" value="1" />}<button className="btn btn-soft">Search</button></form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>Nothing here.</Empty> : (
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Product</th><th className="num">On hand</th><th className="num">Reserved</th><th className="num">Available</th><th className="num">Reorder at</th><th className="num">Avg cost</th><th>Adjust</th></tr></thead>
            <tbody>
              {rows.map((v) => {
                const avail = v.onHand - v.reserved;
                return (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">{v.sku}</td>
                    <td><Link href={`/admin/products/${v.productId}`} className="hover:text-accent">{v.product.name}</Link><div className="text-xs text-ink3">{v.name}</div></td>
                    <td className="num">{v.onHand}</td>
                    <td className="num text-ink3">{v.reserved}</td>
                    <td className={`num font-semibold ${avail <= 0 ? "text-danger" : avail <= v.reorderLevel ? "text-mustard" : ""}`}>{avail}</td>
                    <td className="num text-ink3">{v.reorderLevel}</td>
                    <td className="num">{fm(v.avgCost)}</td>
                    <td>
                      <ActionForm action={adjustStock} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="variantId" value={v.id} />
                        <select name="mode" className="select !w-20 !py-1 text-xs"><option value="add">±</option><option value="set">Set</option></select>
                        <input name="qty" type="number" required className="input !w-20 !py-1" aria-label="Quantity" />
                        <input name="reason" required placeholder="Reason (count, damage…)" className="input !w-44 !py-1 text-xs" aria-label="Reason" />
                        <button className="btn btn-soft btn-sm">Apply</button>
                      </ActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pager page={page} pages={Math.ceil(filtered.length / 50)} href={(p) => `?page=${p}${sp.low ? "&low=1" : ""}${sp.q ? `&q=${sp.q}` : ""}`} />
    </div>
  );
}
