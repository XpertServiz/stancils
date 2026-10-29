"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parseMajor } from "@/lib/money";
import { refreshRating } from "@/app/actions/store";

type R = { ok: boolean; msg: string } | null;

export async function updateBusiness(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("b2b.manage");
  const id = String(fd.get("id"));
  const data = { status: String(fd.get("status")), discountPct: Number(fd.get("discountPct")) || 0, termsDays: Number(fd.get("termsDays")) || 0, creditLimit: parseMajor(String(fd.get("creditLimit") || "0")), notes: String(fd.get("notes") || "") || null };
  const before = await db.businessAccount.update({ where: { id }, data });
  await audit(s.id, "b2b.update", "business_account", id, undefined, data);
  void before;
  revalidatePath("/admin/b2b");
  return { ok: true, msg: "Saved." };
}

export async function saveDiscount(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("promotions.manage");
    const id = String(fd.get("id") || "");
    const data = {
      code: String(fd.get("code")).trim().toUpperCase(),
      kind: String(fd.get("kind")),
      value: Number(fd.get("value")) || 0,
      minSubtotalBase: parseMajor(String(fd.get("min") || "0")),
      usageLimit: fd.get("limit") ? Number(fd.get("limit")) : null,
      startsAt: fd.get("starts") ? new Date(String(fd.get("starts"))) : null,
      endsAt: fd.get("ends") ? new Date(String(fd.get("ends"))) : null,
      active: fd.get("active") === "on",
      firstOrderOnly: fd.get("first") === "on",
    };
    if (!/^[A-Z0-9_-]{3,30}$/.test(data.code)) return { ok: false, msg: "Code must be 3–30 letters, numbers, - or _." };
    if (id) await db.discountCode.update({ where: { id }, data });
    else await db.discountCode.create({ data });
    await audit(s.id, id ? "discount.update" : "discount.create", "discount", data.code, undefined, data);
    revalidatePath("/admin/discounts");
    return { ok: true, msg: "Saved." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message.includes("Unique") ? "That code already exists." : (e as Error).message };
  }
}

export async function moderateReview(fd: FormData) {
  const s = await requirePermission("reviews.moderate");
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  const r = await db.review.findUniqueOrThrow({ where: { id } });
  if (op === "delete") await db.review.delete({ where: { id } });
  else if (op === "feature") await db.review.update({ where: { id }, data: { featured: !r.featured } });
  else if (op === "reply") await db.review.update({ where: { id }, data: { reply: String(fd.get("reply") || "") || null, replyAt: new Date() } });
  else await db.review.update({ where: { id }, data: { status: op } });
  if (r.productId) await refreshRating(r.productId);
  await audit(s.id, `review.${op}`, "review", id);
  revalidatePath("/admin/reviews");
}

export async function updateInquiry(fd: FormData) {
  const s = await requirePermission("inbox.manage");
  const id = String(fd.get("id"));
  await db.inquiry.update({ where: { id }, data: { status: String(fd.get("status")), notes: String(fd.get("notes") || "") || null, assignedTo: String(fd.get("assignedTo") || "") || null } });
  await audit(s.id, "inquiry.update", "inquiry", id);
  revalidatePath("/admin/inbox");
}

export async function markAlerts(fd: FormData) {
  await requirePermission("dashboard.view");
  const id = String(fd.get("id") || "");
  if (id) await db.alert.update({ where: { id }, data: { read: true } });
  else await db.alert.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/admin");
}
