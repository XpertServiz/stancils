import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrencies } from "@/lib/settings";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { Submit } from "@/components/admin/Submit";
import { AddProductForm } from "@/components/admin/AddProductForm";
import { createProduct } from "@/app/admin/actions/products";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ advanced?: string }> }) {
  await requireStaff("inventory.edit");
  const advanced = (await searchParams).advanced === "1";
  if (advanced) {
    return (
      <div className="max-w-xl">
        <PageHeader title="New product (advanced)" sub="Creates a draft you can fill in with sizes, stock, materials and more." />
        <Panel>
          <form action={createProduct} className="space-y-4">
            <Field label="Name"><input name="name" required className="input" placeholder="e.g. Saffron Mandala Stencil" /></Field>
            <Field label="Type">
              <select name="type" className="select">
                <option value="STOCK_PHYSICAL">Stock item (counted)</option>
                <option value="MADE_TO_ORDER">Made to order</option>
                <option value="DIGITAL">Digital download only</option>
                <option value="TOOL">Tool / supply</option>
              </select>
            </Field>
            <Submit>Create draft</Submit>
          </form>
        </Panel>
      </div>
    );
  }
  const [{ base }, cats] = await Promise.all([getCurrencies(), db.collection.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true } })]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add a product" sub="Fill in the four boxes and press the button. It appears on your website straight away." />
      <Panel><div className="p-1"><AddProductForm cats={cats} base={base.code} /></div></Panel>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/products/bulk" className="card block p-4 hover:border-accent"><b>Adding lots of products?</b><span className="mt-1 block text-sm text-ink2">Pick many photos at once — each photo becomes a product.</span></Link>
        <Link href="/admin/inventory/import" className="card block p-4 hover:border-accent"><b>Have a spreadsheet?</b><span className="mt-1 block text-sm text-ink2">Download the simple template, fill it in, upload it.</span></Link>
      </div>
      <p className="mt-4 text-xs text-ink3">Need stock counts, materials or a digital download? <Link href="/admin/products/new?advanced=1" className="text-accent underline">Use the advanced form</Link>.</p>
    </div>
  );
}
