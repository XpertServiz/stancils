import { Tabs } from "./ui";

export function WebsiteTabs({ active }: { active: string }) {
  const t = [
    ["landing", "Homepage", "/admin/website/landing"], ["menu", "Menu", "/admin/website/menu"], ["reviews", "Reviews", "/admin/reviews"], ["promos", "Sales & codes", "/admin/discounts"], ["sections", "Page sections", "/admin/website"], ["hero", "Hero & site", "/admin/website/hero"], ["appearance", "Appearance", "/admin/website/appearance"],
    ["collections", "Collections", "/admin/website/collections"], ["faq", "FAQ", "/admin/website/faq"], ["blog", "Blog & tutorials", "/admin/website/blog"],
    ["stories", "Project stories", "/admin/website/stories"], ["legal", "Policy pages", "/admin/website/legal"],
  ];
  return <Tabs active={active} tabs={t.map(([key, label, href]) => ({ key, label, href }))} />;
}
