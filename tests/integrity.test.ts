// Integrity checks against the configured database (run after seeding).
import { describe, it, expect, afterAll } from "vitest";
import { db } from "../lib/db";
import { trialBalance, balanceSheet } from "../lib/accounting";

describe("ledger & stock integrity", () => {
  afterAll(() => db.$disconnect());

  it("trial balance balances", async () => {
    const tb = await trialBalance();
    expect(tb.totalDr).toBe(tb.totalCr);
  });

  it("balance sheet balances", async () => {
    const bs = await balanceSheet(new Date(Date.now() + 86400000));
    expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.totalEquity);
  });

  it("every journal entry balances", async () => {
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT "entryId" as id FROM "JournalLine" GROUP BY "entryId" HAVING SUM(debit) <> SUM(credit)`;
    expect(rows).toHaveLength(0);
  });

  it("variant on-hand equals the sum of movements", async () => {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT v.id FROM "Variant" v LEFT JOIN "StockMovement" m ON m."variantId" = v.id
      GROUP BY v.id, v."onHand" HAVING v."onHand" <> COALESCE(SUM(m.qty), 0)`;
    expect(rows).toHaveLength(0);
  });

  it("material on-hand equals the sum of movements", async () => {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT x.id FROM "Material" x LEFT JOIN "StockMovement" m ON m."materialId" = x.id
      GROUP BY x.id, x."onHand" HAVING x."onHand" <> COALESCE(SUM(m.qty), 0)`;
    expect(rows).toHaveLength(0);
  });

  it("reservations are never negative", async () => {
    expect(await db.variant.count({ where: { reserved: { lt: 0 } } })).toBe(0);
  });

  it("the database rejects an unbalanced journal", async () => {
    const acc = await db.account.findFirstOrThrow();
    await expect(
      db.journalEntry.create({ data: { memo: "bad", sourceType: "test", lines: { create: [{ accountId: acc.id, debit: 100n }] } } }),
    ).rejects.toThrow();
  });
});
