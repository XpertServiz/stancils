export const PERMISSIONS = {
  "dashboard.view": "View cockpit",
  "orders.view": "View orders",
  "orders.manage": "Update order status & shipping",
  "orders.refund": "Issue refunds",
  "orders.verify_payment": "Verify manual payments",
  "production.manage": "Manage production queue",
  "studio.approve_proof": "Approve custom designs",
  "inventory.view": "View inventory",
  "inventory.edit": "Create & edit products",
  "inventory.delete": "Delete products",
  "inventory.import": "Import / export catalog",
  "inventory.bulk_edit": "Bulk edit products",
  "inventory.adjust": "Stock adjustments",
  "purchases.manage": "Suppliers & purchase orders",
  "pricing.edit": "Edit prices",
  "currency.manage": "Currencies & FX",
  "customers.view": "View customers",
  "b2b.manage": "Business accounts",
  "promotions.manage": "Discount codes",
  "reviews.moderate": "Moderate reviews",
  "content.edit": "Edit website content",
  "content.publish": "Publish website content",
  "appearance.manage": "Themes & appearance",
  "inbox.manage": "Inquiries inbox",
  "accounts.view": "View accounting",
  "accounts.journal.create": "Post journals & expenses",
  "accounts.period.close": "Close days & periods",
  "reports.financial.view": "Financial reports",
  "settings.manage": "Business settings",
  "staff.manage": "Staff & permissions",
  "audit.view": "Audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;
const ALL = Object.keys(PERMISSIONS) as Permission[];
const pick = (prefixes: string[]) => ALL.filter((p) => prefixes.some((x) => p.startsWith(x)));

export const ROLES: Record<string, { label: string; perms: Permission[] }> = {
  super_admin: { label: "Super Admin", perms: ALL },
  manager: { label: "Manager", perms: ALL.filter((p) => !["staff.manage", "accounts.period.close"].includes(p)) },
  inventory_clerk: { label: "Inventory clerk", perms: ["dashboard.view", ...pick(["inventory.", "purchases."])] },
  production_operator: { label: "Production operator", perms: ["dashboard.view", "orders.view", "production.manage", "studio.approve_proof", "inventory.view"] },
  order_handler: { label: "Order handler", perms: ["dashboard.view", "orders.view", "orders.manage", "orders.verify_payment", "customers.view", "inbox.manage"] },
  accountant: { label: "Accountant", perms: ["dashboard.view", "orders.view", ...pick(["accounts.", "reports."]), "inventory.view"] },
  content_editor: { label: "Content editor", perms: ["dashboard.view", "content.edit", "content.publish", "reviews.moderate", "appearance.manage"] },
  support_agent: { label: "Support agent", perms: ["dashboard.view", "orders.view", "customers.view", "inbox.manage", "reviews.moderate"] },
  b2b_manager: { label: "B2B manager", perms: ["dashboard.view", "orders.view", "customers.view", "b2b.manage", "promotions.manage"] },
};

export function effectivePerms(user: { role: string; permsGrant: string[]; permsRevoke: string[] }): Set<string> {
  const s = new Set<string>(ROLES[user.role]?.perms ?? []);
  user.permsGrant.forEach((p) => s.add(p));
  if (user.role !== "super_admin") user.permsRevoke.forEach((p) => s.delete(p));
  return s;
}
