"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkOrderToken } from "@/lib/tokens";
import { getCustomer } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

type R = { ok: boolean; msg: string } | null;

/** Customer uploads a bank-transfer receipt from their order page. Staff verify it in admin. */
export async function uploadPaymentProof(_: R, fd: FormData): Promise<R> {
  try {
    const order = await db.order.findUnique({ where: { number: String(fd.get("number") || "") } });
    if (!order) return { ok: false, msg: "Order not found." };
    const customer = await getCustomer();
    if (!checkOrderToken(order.id, String(fd.get("t") || "")) && customer?.id !== order.customerId) return { ok: false, msg: "Please open this page from your order email." };
    if (order.paymentStatus === "paid") return { ok: true, msg: "This order is already paid — thank you!" };
    const file = fd.get("receipt") as File | null;
    if (!file || file.size === 0) return { ok: false, msg: "Choose a photo or screenshot of your receipt." };
    if (!file.type.startsWith("image/")) return { ok: false, msg: "Please upload an image (JPG, PNG or screenshot)." };
    if (file.size > 8_000_000) return { ok: false, msg: "That image is over 8 MB — please send a smaller one." };
    const url = await saveUpload(file);
    const ref = String(fd.get("ref") || "").slice(0, 80);
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentProofUrl: url,
        paymentProofAt: new Date(),
        // keep the items held while staff check the transfer
        expiresAt: order.expiresAt ? new Date(Math.max(order.expiresAt.getTime(), Date.now() + 48 * 3600_000)) : null,
        events: { create: { status: "NOTE", note: `Payment receipt uploaded${ref ? ` (ref ${ref})` : ""} — we'll confirm shortly`, public: true } },
      },
    });
    await db.alert.create({ data: { type: "payment_proof", severity: "warning", message: `Bank transfer receipt uploaded for ${order.number} — verify and mark paid`, link: `/admin/orders/${order.id}` } });
    revalidatePath(`/order/${order.number}`);
    return { ok: true, msg: "Receipt received. We'll confirm your payment shortly (usually within a few hours)." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
