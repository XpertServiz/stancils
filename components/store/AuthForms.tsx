"use client";
import { useActionState } from "react";
import { customerLogin, customerRegister } from "@/app/actions/store";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(customerLogin, null as null | { ok: boolean; msg: string });
  return (
    <form action={action} className="card space-y-3 p-6">
      <h2 className="text-xl font-bold">Sign in</h2>
      <input type="hidden" name="next" value={next ?? "/account"} />
      <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" aria-label="Email" />
      <input name="password" type="password" required placeholder="Password" className="input" autoComplete="current-password" aria-label="Password" />
      {state && !state.ok && <p className="text-sm text-danger">{state.msg}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>Sign in</button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(customerRegister, null as null | { ok: boolean; msg: string });
  return (
    <form action={action} className="card space-y-3 p-6">
      <h2 className="text-xl font-bold">Create an account</h2>
      <p className="text-sm text-ink2">Save designs, reorder in one click and track every order.</p>
      <input name="name" placeholder="Name" className="input" autoComplete="name" aria-label="Name" />
      <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" aria-label="Email" />
      <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="input" autoComplete="new-password" aria-label="Password" />
      {state && !state.ok && <p className="text-sm text-danger">{state.msg}</p>}
      <button className="btn btn-soft w-full" disabled={pending}>Create account</button>
    </form>
  );
}
