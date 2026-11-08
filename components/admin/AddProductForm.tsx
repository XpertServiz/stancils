"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { compressImage } from "./compress";
import { quickAddProduct, type QR } from "@/app/admin/actions/quick";
import { SIZE_SETS, SET_KEYS, sizeSetFor, type SizeSetKey } from "@/lib/sizes";

export type Cat = { id: string; name: string };

/** Size dropdown choice: stencil sizes, T-shirt sizes (S, M, L, XL …), gift sizes or one size. */
export function SizeSelect({ value, onChange }: { value: SizeSetKey; onChange: (v: SizeSetKey) => void }) {
  return (
    <div>
      <select name="sizeSet" value={value} onChange={(e) => onChange(e.target.value as SizeSetKey)} className="select" aria-label="Size options">
        {SET_KEYS.map((k) => <option key={k} value={k}>{SIZE_SETS[k].label}</option>)}
      </select>
      <p className="mt-1 text-xs text-ink3">Shoppers pick from: {SIZE_SETS[value].options.map((o) => o.label).join(", ")}</p>
    </div>
  );
}

export function CategoryPicker({ cats, current, onPick }: { cats: Cat[]; current?: string; onPick?: (name: string) => void }) {
  return (
    <div className="space-y-2">
      <select name="collectionId" defaultValue={current ?? ""} className="select" onChange={(e) => onPick?.(cats.find((c) => c.id === e.target.value)?.name ?? "")}>
        <option value="">Choose a category…</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input name="newCategory" maxLength={80} placeholder="…or type a new category" className="input" aria-label="New category" onChange={(e) => e.target.value && onPick?.(e.target.value)} />
    </div>
  );
}

const L = ({ n, label, hint, children }: { n: string; label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-1.5 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-onaccent">{n}</span>{label}</p>
    {children}
    {hint && <p className="mt-1 text-xs text-ink3">{hint}</p>}
  </div>
);

/** Four boxes: name, category, price, photos. Everything else is optional and tucked away. */
export function AddProductForm({ cats, base }: { cats: Cat[]; base: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<QR>(null);
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string[]>([]);
  const [sizeSet, setSizeSet] = useState<SizeSetKey>("stencil");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    start(async () => {
      setState({ ok: true, msg: "Adding…" });
      const fd = new FormData();
      for (const [k, v] of raw.entries()) if (!(v instanceof File)) fd.append(k, v);
      const files = raw.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);
      let total = 0;
      for (const f of files) {
        const small = await compressImage(f);
        total += small.size;
        fd.append("photos", small);
      }
      if (total > 4_000_000) return setState({ ok: false, msg: "Those photos are too big together. Please add fewer photos (or add the rest after saving)." });
      const r = await quickAddProduct(null, fd);
      setState(r);
      if (r?.ok) { form.current?.reset(); setPicked([]); }
    });
  };

  return (
    <form ref={form} onSubmit={submit} className="space-y-5">
      <L n="1" label="What is it called?"><input name="name" required maxLength={120} placeholder="e.g. Rose Vine Wall Stencil" className="input" /></L>
      <L n="2" label="Which category?" hint="This decides where it shows on your website."><CategoryPicker cats={cats} onPick={(n) => n && setSizeSet(sizeSetFor(n))} /></L>
      <L n="3" label="Which sizes?" hint="Picked for you from the category. Stencils: 4×4 to 16×16 in · T-shirts: XS to 5XL · Gifts: Small to Deluxe."><SizeSelect value={sizeSet} onChange={setSizeSet} /></L>
      <L n="4" label={`Price (${base})`} hint="For the first (smallest) size. The other sizes are worked out for you."><input name="price" required inputMode="decimal" placeholder="e.g. 1500" className="input max-w-[220px]" /></L>
      <L n="5" label="Photos" hint="Pick one or more pictures from your phone or computer. The first one is the main picture.">
        <input name="photos" type="file" accept="image/*" multiple className="input" onChange={(e) => setPicked([...(e.target.files ?? [])].map((f) => f.name))} />
        {picked.length > 0 && <p className="mt-1 text-xs text-ink2">{picked.length} photo{picked.length === 1 ? "" : "s"} chosen</p>}
      </L>
      <details className="rounded-xl border border-line p-3 text-sm">
        <summary className="cursor-pointer font-semibold">More options (you can skip these)</summary>
        <div className="mt-3 space-y-3">
          <label className="block"><span className="mb-1 block font-semibold">Old price ({base}) — to show a sale</span><input name="oldPrice" inputMode="decimal" placeholder="e.g. 3000" className="input max-w-[220px]" /><span className="text-xs text-ink3">Shows crossed out, with a discount tag.</span></label>
          <label className="block"><span className="mb-1 block font-semibold">A few words about it</span><textarea name="description" rows={3} maxLength={600} className="textarea" /></label>
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary !px-8 !py-3 text-base" disabled={pending}>{pending ? "Adding…" : "Add product"}</button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-mint" : "text-danger"}`}>
            {state.msg} {state.ok && state.id && <Link href={`/admin/products/${state.id}`} className="underline">Edit it</Link>}
          </p>
        )}
      </div>
    </form>
  );
}
