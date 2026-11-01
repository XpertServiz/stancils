"use client";
import { useActionState } from "react";
import { importCatalog, type ImportState } from "@/app/admin/actions/inventory";

export function ImportForm() {
  const [state, action, pending] = useActionState(importCatalog, null as ImportState);
  const r = state?.report;
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="commit" value="0" />
        <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        <button className="btn btn-soft" disabled={pending}>{pending ? "Checking…" : "Check file (dry run)"}</button>
      </form>
      {state && <p className={`text-sm ${state.ok ? "text-mint" : "text-danger"}`}>{state.msg}</p>}
      {r && (
        <div className="rounded-xl border border-line p-3 text-sm">
          <p>{r.products} products · {r.variants} variants · {r.created} new · {r.updated} updates</p>
          {r.errors.length > 0 && <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-danger">{r.errors.slice(0, 50).map((e, i) => <li key={i}>Row {e.row}: {e.msg}</li>)}</ul>}
          {r.warnings.length > 0 && <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-mustard">{r.warnings.slice(0, 30).map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>
      )}
      {state?.csv && state.ok && !r?.batchId && (
        <form action={action}>
          <input type="hidden" name="commit" value="1" />
          <input type="hidden" name="csv" value={state.csv} />
          <input type="hidden" name="filename" value={state.filename} />
          <button className="btn btn-primary" disabled={pending}>{pending ? "Importing…" : "Confirm import"}</button>
        </form>
      )}
    </div>
  );
}
