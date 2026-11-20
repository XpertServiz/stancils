import type { LandingProduct } from "@/lib/landing";
import { Field } from "@/components/admin/ui";

/** The whole “add a product” form: name, category, price, photo. */
export function ProductFields({ p, base, collections }: { p?: LandingProduct; base: string; collections: string[] }) {
  const current = p?.cat ?? collections[0] ?? "Stencils";
  const list = collections.includes(current) ? collections : [current, ...collections];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="1. Product name"><input name="name" required maxLength={120} defaultValue={p?.name} placeholder="e.g. Rose Wall Stencil" className="input" /></Field>
      <Field label="2. Category">
        <select name="category" defaultValue={current} className="select">
          {list.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label={`3. Price (${base})`} hint="Leave 0 if you will quote each customer."><input name="price" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={p?.price ?? ""} placeholder="0" className="input" /></Field>
      <Field label="4. Photo" hint="Needed — the shop only shows products that have a photo.">
        <input name="photo" type="file" accept="image/*" className="input" />
      </Field>
      {p?.image && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
          <input type="checkbox" name="remove_photo" /> Remove this photo
        </label>
      )}
      <details className="sm:col-span-2">
        <summary className="cursor-pointer text-sm text-ink3">More options (not needed)</summary>
        <div className="mt-2 max-w-xs"><Field label="Small label on the photo" hint="e.g. New, Bestseller"><input name="tag" maxLength={30} defaultValue={p?.tag ?? "New"} className="input" /></Field></div>
      </details>
    </div>
  );
}

