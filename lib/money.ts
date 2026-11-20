// Money helpers. All amounts are integer minor units (bigint) + ISO code.
// Formatting happens only at the edge (UI, emails, PDFs).

export type CurrencyInfo = {
  code: string;
  symbol: string;
  exponent: number;
  rate: number; // units of this currency per 1 unit of base
  markupPct: number;
  rounding: string;
  pricingMode: string;
  isBase?: boolean;
};

export const toBig = (v: bigint | number | string | null | undefined): bigint => {
  if (v === null || v === undefined || v === "") return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.round(v));
  return BigInt(v);
};

/** Parse a user-entered major amount ("12.50") into minor units. */
export function parseMajor(input: string | number, exponent = 2): bigint {
  const s = String(input).trim().replace(/[,\s]/g, "");
  if (!s) return 0n;
  const neg = s.startsWith("-");
  const [i, f = ""] = s.replace("-", "").split(".");
  const frac = (f + "0".repeat(exponent)).slice(0, exponent);
  const v = BigInt(i || "0") * 10n ** BigInt(exponent) + BigInt(frac || "0");
  return neg ? -v : v;
}

export function minorToMajor(minor: bigint | number, exponent = 2): number {
  return Number(minor) / 10 ** exponent;
}

export function majorString(minor: bigint | number, exponent = 2): string {
  return minorToMajor(minor, exponent).toFixed(exponent);
}

const LOCALES: Record<string, string> = {
  PKR: "en-PK", USD: "en-US", EUR: "de-DE", GBP: "en-GB", AED: "en-AE",
  CAD: "en-CA", AUD: "en-AU", INR: "en-IN", SAR: "en-SA", JPY: "ja-JP",
};

export function formatMoney(minor: bigint | number, code: string, exponent = 2): string {
  const major = minorToMajor(minor, exponent);
  if (code === "PKR") {
    return `Rs ${major.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  try {
    return new Intl.NumberFormat(LOCALES[code] ?? "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(exponent)}`;
  }
}

function applyRounding(major: number, rule: string): number {
  switch (rule) {
    case "END_99": return Math.max(0.99, Math.ceil(major) - 0.01);
    case "NEAREST_1": return Math.round(major);
    case "NEAREST_5": return Math.max(5, Math.round(major / 5) * 5);
    case "NEAREST_10": return Math.max(10, Math.round(major / 10) * 10);
    case "NEAREST_50": return Math.max(50, Math.round(major / 50) * 50);
    case "NEAREST_100": return Math.max(100, Math.round(major / 100) * 100);
    default: return major;
  }
}

/**
 * Convert a base-currency minor amount into a target currency for display/selling.
 * `price` mode applies markup + rounding (used for catalogue prices);
 * `plain` mode is a straight FX conversion (used for totals, thresholds, refunds).
 */
export function convertMinor(
  baseMinor: bigint | number,
  base: Pick<CurrencyInfo, "exponent">,
  target: CurrencyInfo,
  mode: "price" | "plain" = "plain",
): bigint {
  const baseMajor = Number(baseMinor) / 10 ** base.exponent;
  let major = baseMajor * target.rate;
  if (mode === "price" && !target.isBase) {
    major = major * (1 + target.markupPct / 100);
    major = applyRounding(major, target.rounding);
  }
  return BigInt(Math.round(major * 10 ** target.exponent));
}

/** Convert an amount in `from` currency back to base minor units using a rate snapshot. */
export function toBaseMinor(amountMinor: bigint | number, fromExponent: number, rate: number, baseExponent: number): bigint {
  const major = Number(amountMinor) / 10 ** fromExponent / (rate || 1);
  return BigInt(Math.round(major * 10 ** baseExponent));
}

export function sumBig(xs: (bigint | number)[]): bigint {
  return xs.reduce<bigint>((a, b) => a + toBig(b), 0n);
}

/** JSON-safe serialisation for objects containing bigint. */
export function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? Number(x) : x)));
}
