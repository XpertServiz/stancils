import { Tabs } from "./ui";

export function AccountsTabs({ active }: { active: string }) {
  const t = [["journals", "Journals", "/admin/accounts"], ["chart", "Chart of accounts", "/admin/accounts/chart"], ["expenses", "Expenses", "/admin/accounts/expenses"], ["closing", "Closing, assets & payouts", "/admin/accounts/closing"], ["bank", "Bank reconciliation", "/admin/accounts/bank"]];
  return <Tabs active={active} tabs={t.map(([key, label, href]) => ({ key, label, href }))} />;
}
