import type { LandingProduct } from "@/lib/landing";
import { DEPARTMENTS, SUBCATEGORIES } from "@/lib/landing/defaults";
import { Field } from "@/components/admin/ui";

/** The whole “add a product” form: name, category, price, photo. */
export function ProductFields({ p, base }: { p?: LandingProduct; base: string }) {
  const current = p ? (p.subcat ? `${p.cat}|${p.subcat}` : p.cat) : "Stencils";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="1. Product name"><input name="name" required maxLength={120} defaultValue={p?.name} placeholder="e.g. Rose Wall Stencil" className="input" /></Field>
      <Field label="2. Category">
        <select name="category" defaultValue={current} className="select">
          {DEPARTMENTS.map((d) => (
            <optgroup key={d} label={d}>
              <option value={d}>{d} — general</option>
              {SUBCATEGORIES[d].map((c) => <option key={c} value={`${d}|${c}`}>{c}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label={`3. Price (${base})`} hint="Leave 0 if you will quote each customer."><input name="price" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={p?.price ?? ""} placeholder="0" className="input" /></Field>
      <Field label="4. Photo" hint="JPG or PNG. Optional.">
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

