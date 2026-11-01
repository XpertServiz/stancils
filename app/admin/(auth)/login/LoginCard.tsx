"use client";
import { useActionState } from "react";
import { staffLogin } from "@/app/admin/actions/auth";
import { Logo } from "@/components/store/Logo";

export function LoginCard() {
  const [state, action, pending] = useActionState(staffLogin, null);
  return (
    <form action={action} className="card w-full max-w-sm space-y-4 p-8">
      <div className="flex items-center gap-2"><Logo /><span className="font-display text-lg font-bold">Back office</span></div>
      <input name="email" type="email" required placeholder="Email" className="input" autoComplete="username" aria-label="Email" />
      <input name="password" type="password" required placeholder="Password" className="input" autoComplete="current-password" aria-label="Password" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
