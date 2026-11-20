"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActiveCurrency } from "@/lib/currency";
import { getCustomer } from "@/lib/auth";
import { convertMinor, formatMoney } from "@/lib/money";
import { qtyDiscount, studioUnitPriceBase } from "@/lib/services/studio";

const PriceIn = z.object({
  widthMm: z.number().min(10).max(2000),
  heightMm: z.number().min(10).max(2000),
  materialId: z.string(),
  qty: z.number().int().min(1).max(500),
  cutLengthMm: z.number().min(0).max(1e7),
});

export async function priceStudio(raw: z.input<typeof PriceIn>) {
  const i = PriceIn.parse(raw);
  const { cur, base } = await getActiveCurrency();
  const unitBase = await studioUnitPriceBase(i);
  const unit = convertMinor(unitBase, base, cur, "price");
  return {
    unit: formatMoney(unit, cur.code, cur.exponent),
    total: formatMoney(unit * BigInt(i.qty), cur.code, cur.exponent),
    discountPct: Math.round(qtyDiscount(i.qty) * 100),
  };
}

// Words that often indicate third-party trademarks; such designs get a human check.
const WATCHLIST = /(nike|adidas|disney|marvel|starbucks|coca.?cola|pepsi|apple|gucci|chanel|louis.?vuitton|mcdonald|ferrari|fifa|nfl|nba|pokemon|hello.?kitty)/i;

const CreateIn = PriceIn.extend({
  png: z.string().startsWith("data:image/png;base64,").max(8_000_000),
  name: z.string().max(80).optional(),
  islands: z.number().int().min(0),
  bridges: z.number().int().min(0),
  thinRatio: z.number().min(0).max(1),
  rightsConfirmed: z.literal(true),
  sourceText: z.string().max(80).optional(),
  email: z.string().email().optional(),
});

function trace(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const potrace = require("potrace");
  return new Promise((resolve, reject) =>
    potrace.trace(buf, { threshold: 128, turdSize: 4, optTolerance: 0.3, color: "black" }, (err: Error | null, svg: string) => (err ? reject(err) : resolve(svg))),
  );
}

export async function createDesign(raw: z.input<typeof CreateIn>) {
  const parsed = CreateIn.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Please confirm you have the rights to this artwork and try again." };
  const i = parsed.data;
  const raw64 = i.png.slice("data:image/png;base64,".length);
  const traced = await trace(Buffer.from(raw64, "base64"));
  const w = Number(/width="(\d+(?:\.\d+)?)"/.exec(traced)?.[1] ?? 400);
  const h = Number(/height="(\d+(?:\.\d+)?)"/.exec(traced)?.[1] ?? 400);
  const d = /<path[^>]*\sd="([^"]+)"/.exec(traced)?.[1];
  if (!d) return { ok: false as const, error: "We couldn't find any shapes to cut — try a higher threshold or a bolder image." };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" data-width-mm="${i.widthMm}" data-height-mm="${i.heightMm}"><g data-layer="1" style="fill:var(--l1,currentColor)"><path fill-rule="evenodd" d="${d}"/></g></svg>`;

  const flags: string[] = [];
  if (i.thinRatio > 0.04) flags.push("fine_detail");
  if (i.sourceText && WATCHLIST.test(i.sourceText)) flags.push("trademark_watch");
  if (i.name && WATCHLIST.test(i.name)) flags.push("trademark_watch");
  const customer = await getCustomer();
  const priceBase = await studioUnitPriceBase(i);
  const design = await db.customDesign.create({
    data: {
      customerId: customer?.id,
      email: customer?.email ?? i.email,
      name: i.name?.trim() || (i.sourceText ? `Custom "${i.sourceText}" stencil` : "Custom stencil"),
      svg,
      widthMm: Math.round(i.widthMm),
      heightMm: Math.round(i.heightMm),
      materialId: i.materialId,
      islands: i.islands,
      bridges: i.bridges,
      cutLengthMm: Math.round(i.cutLengthMm),
      priceBase,
      rightsConfirmed: true,
      flags,
      status: flags.length ? "needs_review" : "approved",
    },
  });
  if (flags.length) {
    await db.alert.create({ data: { type: "studio_review", severity: "warning", message: `Custom design needs a check (${flags.join(", ")})`, link: "/admin/production?tab=designs" } });
  }
  return { ok: true as const, id: design.id, svg, needsReview: flags.length > 0 };
}
