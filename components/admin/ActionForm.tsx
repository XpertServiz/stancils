"use client";
import { useActionState } from "react";

type R = { ok: boolean; msg: string } | null;

/** Wraps a (prev, FormData) server action and shows its result message. */
export function ActionForm({ action, children, className = "space-y-3", confirm }: { action: (p: R, fd: FormData) => Promise<R>; children: React.ReactNode; className?: string; confirm?: string }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form
      action={run}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {state && <p className={`text-sm ${state.ok ? "text-mint" : "text-danger"}`} role="status">{state.msg}</p>}
    </form>
  );
}
