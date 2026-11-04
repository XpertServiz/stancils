"use client";
import { useActionState } from "react";
import { subscribe } from "@/app/actions/store";

export function NewsletterForm({ dark = false, wide = false }: { dark?: boolean; wide?: boolean }) {
  const [state, action, pending] = useActionState(subscribe, null as null | { ok: boolean; msg: string });
  const id = wide ? "nl-band" : "nl";
  return (
    <form action={action} className={wide ? "mx-auto w-full max-w-lg" : "max-w-sm"}>
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">Email address</label>
        <input id={id} name="email" type="email" required placeholder="Your email address" className="input !py-2.5 text-sm" />
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : "Subscribe"}</button>
      </div>
      {state && <p role="status" className={`mt-2 text-xs font-semibold ${state.ok ? (dark ? "text-mustard" : "text-mint") : "text-danger"}`}>{state.msg}</p>}
    </form>
  );
}
