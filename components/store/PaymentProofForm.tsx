"use client";
import { useActionState } from "react";
import { Upload } from "lucide-react";
import { uploadPaymentProof } from "@/app/actions/payment-proof";

export function PaymentProofForm({ number, token, uploaded }: { number: string; token?: string; uploaded: boolean }) {
  const [state, action, pending] = useActionState(uploadPaymentProof, null as { ok: boolean; msg: string } | null);
  if (state?.ok) return <p className="rounded-xl bg-mint/15 p-3 text-sm text-mint">{state.msg}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="t" value={token ?? ""} />
      <p className="text-sm font-semibold">{uploaded ? "Receipt received — upload another if needed" : "Paid? Upload your receipt"}</p>
      <div className="flex flex-wrap gap-2">
        <input type="file" name="receipt" accept="image/*" required className="text-sm" aria-label="Receipt image" />
        <input name="ref" placeholder="Transaction ID (optional)" className="input !w-56 !py-1.5" aria-label="Transaction reference" />
        <button className="btn btn-primary btn-sm" disabled={pending}><Upload size={14} />{pending ? "Uploading…" : "Send receipt"}</button>
      </div>
      {state && !state.ok && <p className="text-sm text-danger">{state.msg}</p>}
    </form>
  );
}
