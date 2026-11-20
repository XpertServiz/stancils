import { describe, it, expect } from "vitest";
import { parseMajor, convertMinor, toBaseMinor, formatMoney } from "../lib/money";

const PKR = { code: "PKR", symbol: "Rs", exponent: 2, rate: 1, markupPct: 0, rounding: "NONE", pricingMode: "AUTO", isBase: true };
const USD = { code: "USD", symbol: "$", exponent: 2, rate: 1 / 280, markupPct: 0, rounding: "END_99", pricingMode: "AUTO" };

describe("money", () => {
  it("parses major amounts", () => {
    expect(parseMajor("12.5")).toBe(1250n);
    expect(parseMajor("1,250")).toBe(125000n);
    expect(parseMajor("-3.01")).toBe(-301n);
  });
  it("converts with rounding for prices", () => {
    expect(convertMinor(280000n, PKR, USD, "price")).toBe(999n); // Rs 2,800 → $10 → $9.99? no: ceil(10)-0.01
    expect(convertMinor(280000n, PKR, USD, "plain")).toBe(1000n);
  });
  it("round-trips to base", () => {
    expect(toBaseMinor(1000n, 2, 1 / 280, 2)).toBe(280000n);
  });
  it("formats", () => {
    expect(formatMoney(125000n, "PKR")).toBe("Rs 1,250");
    expect(formatMoney(999n, "USD")).toBe("$9.99");
  });
});
