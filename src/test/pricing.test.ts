import { describe, expect, it } from "vitest";
import { tiers, comparison, formatPrice, currency } from "@/data/pricing";

const price = (tier: string) => tiers.find((t) => t.tier === tier)!.price;

describe("Tier pricing", () => {
  it("uses the owner's confirmed prices in BDT", () => {
    expect(price("standard")).toBe(2990);
    expect(price("premium")).toBe(3990);
    expect(price("luxury")).toBe(4990);
    expect(currency.code).toBe("BDT");
    expect(formatPrice(price("standard"))).toBe("৳2,990");
    expect(formatPrice(price("premium"))).toBe("৳3,990");
    expect(formatPrice(price("luxury"))).toBe("৳4,990");
  });

  it("lists the our-story timeline as Luxury only", () => {
    const row = comparison.find((r) => r.feature === "Our-story timeline")!;
    expect(row.values).toEqual({ standard: false, premium: false, luxury: true });
  });

  it("never gives Premium less than Standard in the comparison table", () => {
    for (const row of comparison) {
      const s = row.values.standard === true;
      const p = row.values.premium === true;
      expect(p || !s).toBe(true);
    }
  });
});
