"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { paySupplier, receivePurchase } from "@/lib/services/purchasing";

type R = { ok: boolean; msg: string } | null;

export async function saveSupplier(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("purchases.manage");
  const sup = await db.supplier.create({ data: { name: String(fd.get("name")), email: String(fd.get("email") || "") || null, phone: String(fd.get("phone") || "") || null, country: String(fd.get("country") || "") || null, currency: String(fd.get("currency") || "USD") } });
  await audit(s.id, "supplier.create", "supplier", sup.id, undefined, sup);
  revalidatePath("/admin/purchases");
  return { ok: true, msg: "Supplier added." };
}

export async function createPO(fd: FormData) {
  const s = await requirePermission("purchases.manage");
  const supplierId = String(fd.get("supplierId"));
  const sup = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const cur = await db.currency.findUnique({ where: { code: sup.currency } });
  const count = await db.purchaseOrder.count();
  const po = await db.purchaseOrder.create({ data: { number: `PO-${String(count + 1).padStart(5, "0")}`, supplierId, currency: sup.currency, fxRate: cur?.rate ?? 1 } });
  await audit(s.id, "po.create", "purchase_order", po.id);
  redirect(`/admin/purchases/${po.id}`);
}

export async function updatePO(_: R, fd: FormData): Promise<R> {
  try {
    await requirePermission("purchases.manage");
    const id = String(fd.get("id"));
    const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id } });
    const cur = await db.currency.findUnique({ where: { code: po.currency } });
    const exp = cur?.exponent ?? 2;
    await db.purchaseOrder.update({ where: { id }, data: { fxRate: Number(fd.get("fxRate")) || po.fxRate, extraCharges: parseMajor(String(fd.get("extra") || "0"), exp), notes: String(fd.get("notes") || "") || null, status: String(fd.get("status") || po.status) } });
    const code = String(fd.get("item") || "").trim();
    if (code) {
      const v = await db.variant.findUnique({ where: { sku: code.toUpperCase() } });
      const m = v ? null : await db.material.findUnique({ where: { code: code.toUpperCase() } });
      if (!v && !m) return { ok: false, msg: `No SKU or material code "${code}".` };
      await db.purchaseLine.create({ data: { poId: id, variantId: v?.id, materialId: m?.id, qty: Math.max(1, Number(fd.get("qty")) || 1), unitCost: parseMajor(String(fd.get("unitCost") || "0"), exp) } });
    }
    revalidatePath(`/admin/purchases/${id}`);
    return { ok: true, msg: "Saved." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function removeLine(fd: FormData) {
  await requirePermission("purchases.manage");
  const l = await db.purchaseLine.findUniqueOrThrow({ where: { id: String(fd.get("id")) } });
  if (l.received > 0) throw new Error("Line already received");
  await db.purchaseLine.delete({ where: { id: l.id } });
  revalidatePath(`/admin/purchases/${l.poId}`);
}

export async function receive(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("purchases.manage");
    const id = String(fd.get("id"));
    const lines = await db.purchaseLine.findMany({ where: { poId: id } });
    await receivePurchase(id, lines.map((l) => ({ lineId: l.id, qty: Number(fd.get(`rcv_${l.id}`)) || 0 })), s.id);
    await audit(s.id, "po.receive", "purchase_order", id);
    revalidatePath(`/admin/purchases/${id}`);
    return { ok: true, msg: "Received — stock and landed cost posted." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function pay(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("accounts.journal.create");
    const id = String(fd.get("id"));
    await paySupplier(id, parseMajor(String(fd.get("amount"))), String(fd.get("kind")) === "extras" ? "extras" : "goods", s.id);
    await audit(s.id, "po.pay", "purchase_order", id, undefined, { amount: String(fd.get("amount")) });
    revalidatePath(`/admin/purchases/${id}`);
    return { ok: true, msg: "Payment posted." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}
