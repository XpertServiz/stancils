import Link from "next/link";
import { SizeRows } from "@/components/admin/SizeRows";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrencies } from "@/lib/settings";
import { majorString } from "@/lib/money";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { renameProducts } from "@/app/admin/actions/quick";
import { thumb } from "@/lib/img";

export default async function FixNames({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireStaff("inventory.edit");
  const ids = ((await searchParams).ids ?? "").split(",").filter((x) => /^[a-z0-9]{10,40}$/i.test(x)).slice(0, 200);
  const [{ base }, products] = await Promise.all([
    getCurrencies(),
    db.product.findMany({ where: { id: { in: ids } }, include: { images: { orderBy: { sort: "asc" }, take: 1 }, variants: { where: { isDigital: false, active: true }, orderBy: { sort: "asc" } } } }),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Fix names and prices" sub="Change any name or any size’s price, then press Save. Each size keeps exactly the price you type. Products are already live — you can leave this page any time." />
      <Panel>
        <ActionForm action={renameProducts}>
          <div className="divide-y divide-line/60">
            {products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <input type="hidden" name="id" value={p.id} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.images[0] ? <img src={thumb(p.images[0].url)!} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-s1" />}
                <input name={`name_${p.id}`} defaultValue={p.name} aria-label="Product name" className="input min-w-[200px] flex-1" />
                <div className="w-full pl-[68px]"><SizeRows scope={p.id} mode="edit" base={base.code} initial={p.variants.map((v) => ({ id: v.id, name: v.name, price: majorString(v.basePrice, base.exponent) }))} /></div>
              </div>
            ))}
            {products.length === 0 && <p className="py-6 text-ink2">Nothing to show here.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button className="btn btn-primary">Save</button>
            <Link href="/admin/products" className="text-sm text-accent underline">Back to products</Link>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
