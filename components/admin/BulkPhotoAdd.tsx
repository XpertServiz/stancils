"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { compressImage } from "./compress";
import { CategoryPicker, type Cat } from "./AddProductForm";
import { quickAddFromPhoto } from "@/app/admin/actions/quick";

type Row = { file: string; status: "wait" | "busy" | "ok" | "fail"; msg?: string; id?: string };

/** Pick many photos → one product per photo. Names come from the file names and can be fixed afterwards in one table. */
export function BulkPhotoAdd({ cats, base }: { cats: Cat[]; base: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, start] = useTransition();
  const [finished, setFinished] = useState<string[] | null>(null);

  const run = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    const files = raw.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return setRows([{ file: "", status: "fail", msg: "Please choose some photos first." }]);
    const common = new FormData();
    for (const [k, v] of raw.entries()) if (!(v instanceof File)) common.append(k, v);
    setFinished(null);
    setRows(files.map((f) => ({ file: f.name, status: "wait" })));
    start(async () => {
      const ids: string[] = [];
      for (const [i, f] of files.entries()) {
        const set = (p: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
        set({ status: "busy" });
        const fd = new FormData();
        for (const [k, v] of common.entries()) fd.append(k, v);
        fd.append("photo", await compressImage(f));
        const res = await quickAddFromPhoto(null, fd);
        if (res?.ok && res.id) {
          ids.push(res.id);
          set({ status: "ok", id: res.id, msg: res.name });
        } else set({ status: "fail", msg: res?.msg ?? "Something went wrong" });
      }
      setFinished(ids);
    });
  };

  const ok = rows.filter((r) => r.status === "ok").length;
  return (
    <div className="space-y-5">
      <form onSubmit={run} className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-onaccent">1</span>Which category are these in?</p>
          <CategoryPicker cats={cats} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-onaccent">2</span>Starting price ({base})</p>
          <input name="price" required inputMode="decimal" placeholder="e.g. 1500" className="input max-w-[220px]" />
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="sizes" defaultChecked />Offer 4 sizes (12, 18, 24, 36 inches)</label>
          <p className="mt-1 text-xs text-ink3">You can change each price after this, in one table.</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-onaccent">3</span>Choose all the photos</p>
          <input name="photos" type="file" accept="image/*" multiple className="input" />
          <p className="mt-1 text-xs text-ink3">Each photo becomes one product, named after the photo’s file name (for example <b>rose-vine.jpg</b> → “Rose Vine”).</p>
        </div>
        <button className="btn btn-primary !px-8 !py-3 text-base" disabled={pending}>{pending ? `Adding… (${ok}/${rows.length})` : "Add all products"}</button>
      </form>

      {rows.length > 0 && (
        <ul className="divide-y divide-line/60 rounded-xl border border-line text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2">
              <span className="w-5 text-center">{r.status === "ok" ? "✅" : r.status === "fail" ? "⚠️" : r.status === "busy" ? "⏳" : "·"}</span>
              <span className="min-w-0 flex-1 truncate">{r.file}</span>
              <span className={`truncate text-xs ${r.status === "fail" ? "text-danger" : "text-ink3"}`}>{r.msg}</span>
            </li>
          ))}
        </ul>
      )}
      {finished && finished.length > 0 && (
        <div className="rounded-xl bg-mint/15 p-4 text-sm">
          <p className="font-semibold text-mint">{finished.length} product{finished.length === 1 ? "" : "s"} added and live on your website.</p>
          <Link href={`/admin/products/bulk/names?ids=${finished.join(",")}`} className="btn btn-primary btn-sm mt-3">Fix names and prices</Link>
        </div>
      )}
    </div>
  );
}
