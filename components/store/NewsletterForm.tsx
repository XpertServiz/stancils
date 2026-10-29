"use client";
import { useActionState } from "react";
import { subscribe } from "@/app/actions/store";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, null as null | { ok: boolean; msg: string });
  return (
    <form action={action} className="flex max-w-sm gap-2">
      <label htmlFor="nl" className="sr-only">Email</label>
      <input id="nl" name="email" type="email" required placeholder="Email for 10% off" className="input !py-2 text-sm" />
      <button className="btn btn-primary btn-sm" disabled={pending}>Join</button>
      {state && <p className={`absolute mt-11 text-xs ${state.ok ? "text-mint" : "text-danger"}`}>{state.msg}</p>}
    </form>
  );
}
