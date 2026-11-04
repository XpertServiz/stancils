import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrencies } from "@/lib/settings";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BulkPhotoAdd } from "@/components/admin/BulkPhotoAdd";

export default async function BulkAdd() {
  await requireStaff("inventory.edit");
  const [{ base }, cats] = await Promise.all([getCurrencies(), db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true } })]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add many products from photos" sub="The fastest way to fill your shop: choose a category, a starting price and all your photos." />
      <Panel><div className="p-1"><BulkPhotoAdd cats={cats} base={base.code} /></div></Panel>
      <p className="mt-4 text-sm text-ink3">One product with several photos? <Link href="/admin/products/new" className="text-accent underline">Add a single product</Link>. Prefer a spreadsheet? <Link href="/admin/inventory/import" className="text-accent underline">Import from a spreadsheet</Link>.</p>
    </div>
  );
}
