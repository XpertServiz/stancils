import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getCurrencies } from "@/lib/settings";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Submit } from "@/components/admin/Submit";
import { ProductFields } from "@/components/admin/SimpleProductFields";
import { createProduct } from "@/app/admin/actions/products";
import { saveLandingProduct } from "@/app/admin/actions/landing";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ advanced?: string }> }) {
  await requireStaff("inventory.edit");
  const advanced = (await searchParams).advanced === "1";
  const { base } = await getCurrencies();
  if (!advanced) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Add a product" sub="Four boxes and you’re done. It appears on your homepage and customers can buy it right away." />
        <Panel>
          <ActionForm action={saveLandingProduct}>
            <ProductFields base={base.code} />
            <input type="hidden" name="position" value="top" />
            <button className="btn btn-primary">Add product</button>
          </ActionForm>
        </Panel>
        <p className="mt-4 text-sm text-ink3">Need several sizes, stock counts or a digital download? <Link href="/admin/products/new?advanced=1" className="text-accent underline">Use the advanced form</Link>. Adding many at once? <Link href="/admin/inventory/import" className="text-accent underline">Use the spreadsheet</Link>.</p>
      </div>
    );
  }
  return (
    <div className="max-w-xl">
      <PageHeader title="New product (advanced)" sub="Create it as a draft, then add sizes, prices, artwork and publish." />
      <Panel>
        <form action={createProduct} className="space-y-4">
          <Field label="Name"><input name="name" required className="input" placeholder="e.g. Saffron Mandala Stencil" /></Field>
          <Field label="Type">
            <select name="type" className="select">
              <option value="STOCK_PHYSICAL">Stock stencil (tracked inventory)</option>
              <option value="MADE_TO_ORDER">Made to order (consumes raw materials)</option>
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
