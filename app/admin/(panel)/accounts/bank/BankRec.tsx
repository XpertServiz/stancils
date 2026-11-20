"use client";
import { useActionState } from "react";
import { reconcile, type RecState } from "./actions";

export function BankRec() {
  const [state, action, pending] = useActionState(reconcile, null as RecState);
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".csv" required className="text-sm" />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Matching…" : "Reconcile"}</button>
      </form>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.rows && (
        <>
          <p className="text-sm">{state.matched} matched · <b className={state.unmatched ? "text-mustard" : "text-mint"}>{state.unmatched} unmatched statement lines</b> · {state.ledgerOnly} ledger entries not on statement</p>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Description</th><th className="num">Amount</th><th>Match</th></tr></thead>
            <tbody>{state.rows.map((r, i) => <tr key={i}><td>{r.date}</td><td>{r.desc}</td><td className="num">{r.amount.toFixed(2)}</td><td>{r.match ? <span className="text-mint">#{r.match}</span> : <span className="text-mustard">unmatched</span>}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
