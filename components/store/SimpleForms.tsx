"use client";
import { useActionState } from "react";
import { applyBusiness, submitInquiry } from "@/app/actions/store";

type S = null | { ok: boolean; msg: string };

export function InquiryForm({ kind = "contact" }: { kind?: string }) {
  const [state, action, pending] = useActionState(submitInquiry, null as S);
  if (state?.ok) return <div className="card p-6 text-mint">{state.msg}</div>;
  return (
    <form action={action} className="card space-y-3 p-6">
      <input type="hidden" name="kind" value={kind} />
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Name" className="input" aria-label="Name" />
        <input name="email" type="email" required placeholder="Email" className="input" aria-label="Email" />
      </div>
      <input name="phone" placeholder="Phone / WhatsApp (optional)" className="input" aria-label="Phone" />
      <input name="subject" placeholder="Subject" className="input" aria-label="Subject" />
      <textarea name="message" required rows={5} placeholder="How can we help?" className="textarea" aria-label="Message" />
      {state && !state.ok && <p className="text-sm text-danger">{state.msg}</p>}
      <button className="btn btn-primary" disabled={pending}>Send message</button>
    </form>
  );
}

export function BusinessForm() {
  const [state, action, pending] = useActionState(applyBusiness, null as S);
  if (state?.ok) return <div className="card p-6 text-mint">{state.msg}</div>;
  return (
    <form action={action} className="card space-y-3 p-6">
      <h2 className="text-xl font-bold">Apply for a business account</h2>
      <input name="company" required placeholder="Business name" className="input" aria-label="Business name" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="country" placeholder="Country" className="input" aria-label="Country" />
        <input name="taxId" placeholder="Tax / VAT ID (optional)" className="input" aria-label="Tax ID" />
      </div>
      <textarea name="notes" rows={3} placeholder="What will you use stencils for? Rough monthly volume?" className="textarea" aria-label="Notes" />
      {state && !state.ok && <p className="text-sm text-danger">{state.msg} {state.msg.includes("sign in") && <a href="/account/login?next=/business" className="underline">Sign in</a>}</p>}
      <button className="btn btn-primary" disabled={pending}>Apply</button>
    </form>
  );
}
