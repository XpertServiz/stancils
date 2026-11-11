import { requireStaff } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AccountsTabs } from "@/components/admin/AccountsTabs";
import { BankRec } from "./BankRec";

export default async function Bank() {
  await requireStaff("accounts.view");
  return (
    <div className="space-y-6">
      <PageHeader title="Bank reconciliation" sub="Upload your bank statement (CSV with date, description, amount). Lines are matched to Bank – Main ledger entries by amount within ±3 days; anything unmatched needs a journal or investigation." />
      <AccountsTabs active="bank" />
      <Panel><BankRec /></Panel>
    </div>
  );
}
