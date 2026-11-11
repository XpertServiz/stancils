import { db } from "../db";
import { getSettings } from "../settings";

export type StudioPriceInput = { widthMm: number; heightMm: number; materialId: string; qty: number; cutLengthMm: number };

export function qtyDiscount(qty: number) {
  return qty >= 25 ? 0.25 : qty >= 10 ? 0.15 : qty >= 5 ? 0.1 : 0;
}

/** Unit price in base minor units. Area includes a 10 mm border around the design. */
export async function studioUnitPriceBase(i: StudioPriceInput) {
  const s = await getSettings();
  const mat = await db.material.findUniqueOrThrow({ where: { id: i.materialId } });
  const areaCm2 = ((i.widthMm + 20) * (i.heightMm + 20)) / 100;
  const area = (BigInt(Math.ceil(areaCm2)) * mat.rateCm2Base) / 100n;
  const complexity = BigInt(Math.round((i.cutLengthMm / 1000) * s.studio.complexityPerMeterBase));
  const unit = BigInt(s.studio.baseFeeBase) + area + complexity + BigInt(Math.round(s.studio.setupFeeBase / Math.max(1, i.qty)));
  const disc = qtyDiscount(i.qty);
  return (unit * BigInt(Math.round((1 - disc) * 1000))) / 1000n;
}
