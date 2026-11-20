import type { MovementType } from "@prisma/client";
import type { Tx } from "../db";
import { ACC, postJournal } from "../accounting";

type Ref = { refType?: string; refId?: string; note?: string; byId?: string | null };

/** Change finished-goods stock. Inbound movements with a cost update the weighted average. */
export async function moveVariant(tx: Tx, variantId: string, qty: number, type: MovementType, unitCost: bigint | null, ref: Ref = {}) {
  const v = await tx.variant.findUniqueOrThrow({ where: { id: variantId } });
  let avgCost = v.avgCost;
  if (qty > 0 && unitCost !== null && (type === "PURCHASE" || type === "OPENING" || type === "PRODUCTION_OUTPUT")) {
    const oldQty = BigInt(Math.max(v.onHand, 0));
    const total = oldQty * v.avgCost + BigInt(qty) * unitCost;
    avgCost = oldQty + BigInt(qty) > 0n ? total / (oldQty + BigInt(qty)) : unitCost;
  }
  const cost = unitCost ?? v.avgCost;
  await tx.variant.update({ where: { id: variantId }, data: { onHand: { increment: qty }, avgCost } });
  await tx.stockMovement.create({
    data: { variantId, qty, unitCost: cost, type, refType: ref.refType, refId: ref.refId, note: ref.note, byId: ref.byId ?? null },
  });
  if (qty < 0) await checkVariantLow(tx, variantId);
  return { unitCost: cost };
}

/** Change raw-material stock (units: cm² or pcs). costPerK = cost per 1000 units. */
export async function moveMaterial(tx: Tx, materialId: string, qty: number, type: MovementType, costPerK: bigint | null, ref: Ref = {}) {
  const m = await tx.material.findUniqueOrThrow({ where: { id: materialId } });
  let newCost = m.costPerK;
  if (qty > 0 && costPerK !== null && (type === "PURCHASE" || type === "OPENING")) {
    const oldQty = BigInt(Math.max(m.onHand, 0));
    const total = oldQty * m.costPerK + BigInt(qty) * costPerK;
    newCost = oldQty + BigInt(qty) > 0n ? total / (oldQty + BigInt(qty)) : costPerK;
  }
  const cost = costPerK ?? m.costPerK;
  await tx.material.update({ where: { id: materialId }, data: { onHand: { increment: qty }, costPerK: newCost } });
  await tx.stockMovement.create({
    data: { materialId, qty, unitCost: cost, type, refType: ref.refType, refId: ref.refId, note: ref.note, byId: ref.byId ?? null },
  });
  if (qty < 0) await checkMaterialLow(tx, materialId);
  // value of the movement in base minor units
  return (BigInt(Math.abs(qty)) * cost) / 1000n;
}

export async function checkVariantLow(tx: Tx, variantId: string) {
  const v = await tx.variant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!v || v.isDigital || v.product.type !== "STOCK_PHYSICAL") return;
  const key = `low:v:${variantId}`;
  if (v.onHand - v.reserved <= v.reorderLevel) {
    await tx.alert.upsert({
      where: { dedupeKey: key },
      create: { dedupeKey: key, type: "low_stock", severity: v.onHand <= 0 ? "critical" : "warning", message: `${v.product.name} (${v.sku}) is low: ${v.onHand} on hand`, link: `/admin/products/${v.productId}` },
      update: { read: false, message: `${v.product.name} (${v.sku}) is low: ${v.onHand} on hand` },
    });
  }
}

export async function checkMaterialLow(tx: Tx, materialId: string) {
  const m = await tx.material.findUnique({ where: { id: materialId } });
  if (!m) return;
  const key = `low:m:${materialId}`;
  if (m.onHand <= m.reorderLevel) {
    await tx.alert.upsert({
      where: { dedupeKey: key },
      create: { dedupeKey: key, type: "low_material", severity: "warning", message: `Raw material ${m.name} is low: ${m.onHand} ${m.unit}`, link: `/admin/inventory/materials` },
      update: { read: false },
    });
  }
}

/** Manual stock adjustment with ledger posting (gain/loss to shrinkage). */
export async function adjustVariant(tx: Tx, variantId: string, delta: number, reason: string, byId?: string | null) {
  const v = await tx.variant.findUniqueOrThrow({ where: { id: variantId } });
  const { unitCost } = await moveVariant(tx, variantId, delta, "ADJUSTMENT", delta > 0 ? v.avgCost : null, { note: reason, byId, refType: "adjustment" });
  const value = BigInt(Math.abs(delta)) * unitCost;
  if (value > 0n) {
    await postJournal(tx, {
      memo: `Stock adjustment ${v.sku} (${delta > 0 ? "+" : ""}${delta}): ${reason}`,
      sourceType: "stock_adjustment",
      sourceId: variantId,
      byId,
      lines:
        delta > 0
          ? [{ code: ACC.INV_FINISHED, debit: value }, { code: ACC.SHRINKAGE, credit: value }]
          : [{ code: ACC.SHRINKAGE, debit: value }, { code: ACC.INV_FINISHED, credit: value }],
    });
  }
}

export async function adjustMaterial(tx: Tx, materialId: string, delta: number, reason: string, byId?: string | null) {
  const value = await moveMaterial(tx, materialId, delta, delta < 0 ? "SCRAP" : "ADJUSTMENT", null, { note: reason, byId, refType: "adjustment" });
  if (value > 0n) {
    await postJournal(tx, {
      memo: `Material adjustment (${delta}): ${reason}`,
      sourceType: "material_adjustment",
      sourceId: materialId,
      byId,
      lines:
        delta > 0
          ? [{ code: ACC.INV_RAW, debit: value }, { code: ACC.SHRINKAGE, credit: value }]
          : [{ code: ACC.SCRAP, debit: value }, { code: ACC.INV_RAW, credit: value }],
    });
  }
}
