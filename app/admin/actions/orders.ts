"use server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { markPaid, refundOrder, setOrderStatus, advanceProductionJob, startProductionJob } from "@/lib/services/orders";

type R = { ok: boolean; msg: string } | null;
const done = (id: string, msg: string): R => { revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders"); return { ok: true, msg }; };
const fail = (e: unknown): R => ({ ok: false, msg: (e as Error).message });

export async function verifyPayment(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("orders.verify_payment");
    const id = String(fd.get("id"));
    const ref = String(fd.get("ref") || "") || undefined;
    await markPaid(id, { provider: String(fd.get("provider") || "bank"), providerRef: ref, byId: s.id });
    await audit(s.id, "payment.verify", "order", id, undefined, { ref });
    return done(id, "Payment recorded and posted to the ledger.");
  } catch (e) { return fail(e); }
}

export async function updateStatus(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("orders.manage");
    const id = String(fd.get("id"));
    const status = String(fd.get("status")) as OrderStatus;
    const before = await db.order.findUnique({ where: { id }, select: { status: true } });
    await setOrderStatus(id, status, String(fd.get("note") || "") || undefined, s.id, {
      carrier: String(fd.get("carrier") || "") || undefined,
      trackingNumber: String(fd.get("tracking") || "") || undefined,
    });
    await audit(s.id, "order.status", "order", id, before, { status });
    return done(id, `Status set to ${status.toLowerCase().replace(/_/g, " ")}.`);
  } catch (e) { return fail(e); }
}

export async function refund(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("orders.refund");
    const id = String(fd.get("id"));
    const o = await db.order.findUniqueOrThrow({ where: { id } });
    const cur = await db.currency.findUnique({ where: { code: o.currency } });
    const amount = parseMajor(String(fd.get("amount")), cur?.exponent ?? 2);
    await refundOrder(id, amount, { restock: fd.get("restock") === "on", reason: String(fd.get("reason") || "") || undefined, byId: s.id });
    await audit(s.id, "order.refund", "order", id, undefined, { amount, restock: fd.get("restock") === "on" });
    return done(id, "Refund posted. Remember to also refund in your payment provider's dashboard if it wasn't automatic.");
  } catch (e) { return fail(e); }
}

export async function addNote(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("orders.manage");
    const id = String(fd.get("id"));
    await db.orderEvent.create({ data: { orderId: id, status: "NOTE", note: String(fd.get("note")), public: fd.get("public") === "on", byId: s.id } });
    return done(id, "Note added.");
  } catch (e) { return fail(e); }
}

export async function jobAction(fd: FormData) {
  const s = await requirePermission("production.manage");
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (status === "cutting") await startProductionJob(id, s.id, String(fd.get("machine") || "") || undefined);
  else await advanceProductionJob(id, status, s.id, String(fd.get("notes") || "") || undefined, String(fd.get("photo") || "") || undefined);
  await audit(s.id, "production.status", "job", id, undefined, { status });
  revalidatePath("/admin/production");
}

export async function reviewDesign(fd: FormData) {
  const s = await requirePermission("studio.approve_proof");
  const id = String(fd.get("id"));
  const status = String(fd.get("decision")) === "approve" ? "approved" : "needs_review";
  await db.customDesign.update({ where: { id }, data: { status: status === "approved" ? "locked" : status, flags: status === "approved" ? [] : undefined } });
  await audit(s.id, "design.review", "custom_design", id, undefined, { status });
  revalidatePath("/admin/production");
}
