import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel, Field } from "@/components/admin/ui";
import { Submit } from "@/components/admin/Submit";
import { createProduct } from "@/app/admin/actions/products";

export default async function NewProduct() {
  await requireStaff("inventory.edit");
  return (
    <div className="max-w-xl">
      <PageHeader title="New product" sub="Create it as a draft, then add sizes, prices, artwork and publish." />
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
