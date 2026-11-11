"use client";
import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import type { BankAccount } from "@/lib/settings";

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2 last:border-0">
      <div className="min-w-0">
        <dt className="text-xs text-ink3">{label}</dt>
        <dd className={`break-all font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg p-2 text-ink3 hover:bg-s2 hover:text-ink"
        aria-label={`Copy ${label}`}
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check size={16} className="text-mint" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

/** Bank accounts with copy buttons. Amount and reference are shown once, when known. */
export function BankDetailsCard({ banks, instructions, amount, reference }: { banks: BankAccount[]; instructions?: string; amount?: string; reference?: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-mustard/40 bg-mustard/5 p-4">
      <p className="flex items-center gap-2 font-semibold"><Landmark size={16} className="text-mustard" />{banks.length > 1 ? "Transfer to any of these accounts" : "Transfer to this account"}</p>
      {banks.map((bank) => (
        <dl key={bank.id} className="rounded-lg bg-bg/40 px-3">
          <Row label="Bank" value={bank.bankName} />
          <Row label="Account title" value={bank.accountTitle} />
          <Row label="Account number" value={bank.accountNumber} mono />
          <Row label="IBAN" value={bank.iban} mono />
          <Row label="Branch code" value={bank.branchCode} mono />
          <Row label="SWIFT / BIC" value={bank.swift} mono />
        </dl>
      ))}
      {(amount || reference) && (
        <dl className="rounded-lg bg-bg/40 px-3">
          {amount && <Row label="Amount" value={amount} />}
          {reference && <Row label="Payment reference" value={reference} mono />}
        </dl>
      )}
      {instructions && <p className="text-sm text-ink2">{instructions}</p>}
    </div>
  );
}
