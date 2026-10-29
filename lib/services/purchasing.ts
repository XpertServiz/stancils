import { db } from "../db";
import { ACC, postJournal } from "../accounting";
import { moveMaterial, moveVariant } from "./inventory";

/**
 * Receive goods on a purchase order with landed cost.
 * Extra charges (freight, customs, clearing) are allocated across lines by value.
 * Supplier-currency amounts convert at the PO's rate (supplier units per 1 base unit).
 * Material unit costs are per 1000 units (cm² or pcs).
 */
export async function receivePurchase(poId: string, receipts: { lineId: string; qty: number }[], byId: string) {
  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, include: { lines: true } });
    if (po.status === "cancelled") throw new Error("PO is cancelled");
    const lineValue = (l: { qty: number; unitCost: bigint; materialId: string | null }) => (l.materialId ? (BigInt(l.qty) * l.unitCost) / 1000n : BigInt(l.qty) * l.unitCost);
    const goodsTotal = po.lines.reduce((a, l) => a + lineValue(l), 0n);
    const extraRatio = goodsTotal > 0n ? Number(po.extraCharges) / Number(goodsTotal) : 0;
    const toBase = (supplierMinor: number) => BigInt(Math.round(supplierMinor / (po.fxRate || 1)));
    let goodsBase = 0n;
    let extrasBase = 0n;
    let finished = 0n;
    let raw = 0n;
    for (const r of receipts) {
      const l = po.lines.find((x) => x.id === r.lineId);
      if (!l || r.qty <= 0) continue;
      const qty = Math.min(r.qty, l.qty - l.received);
      if (qty <= 0) continue;
      const unitGoods = Number(l.unitCost);
      const unitLanded = unitGoods * (1 + extraRatio);
      const landedBase = toBase(unitLanded);
      if (l.variantId) {
        await moveVariant(tx, l.variantId, qty, "PURCHASE", landedBase, { refType: "purchase", refId: po.id, byId });
        finished += landedBase * BigInt(qty);
      } else if (l.materialId) {
        await moveMaterial(tx, l.materialId, qty, "PURCHASE", landedBase, { refType: "purchase", refId: po.id, byId });
        raw += (landedBase * BigInt(qty)) / 1000n;
      }
      const g = toBase(l.materialId ? (unitGoods * qty) / 1000 : unitGoods * qty);
      goodsBase += g;
      await tx.purchaseLine.update({ where: { id: l.id }, data: { received: { increment: qty } } });
    }
    const invTotal = finished + raw;
    if (invTotal === 0n) throw new Error("Nothing to receive");
    extrasBase = invTotal - goodsBase;
    await postJournal(tx, {
      memo: `Goods received — PO ${po.number}`,
      sourceType: "purchase",
      sourceId: po.id,
      currency: po.currency,
      fxRate: po.fxRate,
      byId,
      lines: [
        { code: ACC.INV_FINISHED, debit: finished },
        { code: ACC.INV_RAW, debit: raw },
        { code: ACC.AP, credit: goodsBase },
        { code: ACC.ACCRUED, credit: extrasBase, memo: "Freight / customs / clearing" },
      ],
    });
    const lines = await tx.purchaseLine.findMany({ where: { poId } });
    const all = lines.every((l) => l.received >= l.qty);
    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: all ? "received" : "partial" } });
  });
}

export async function paySupplier(poId: string, amountBase: bigint, kind: "goods" | "extras", byId: string) {
  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    await postJournal(tx, {
      memo: `Payment — PO ${po.number} (${kind})`,
      sourceType: "supplier_payment",
      sourceId: po.id,
      byId,
      lines: [{ code: kind === "goods" ? ACC.AP : ACC.ACCRUED, debit: amountBase }, { code: ACC.BANK, credit: amountBase }],
    });
    await tx.purchaseOrder.update({ where: { id: poId }, data: { paidBase: { increment: amountBase } } });
  });
}
