import { describe, expect, it } from "vitest";
import { formatINR, round2 } from "../src/lib/money";

describe("round2", () => {
  it("rounds half up to two decimals", () => {
    expect(round2(0.999)).toBe(1);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it("keeps integers and penny values intact", () => {
    expect(round2(0)).toBe(0);
    expect(round2(0.1)).toBe(0.1);
    expect(round2(1)).toBe(1);
    expect(round2(123)).toBe(123);
    expect(round2(1234)).toBe(1234);
    expect(round2(1234567.89)).toBe(1234567.89);
  });

  it("normalises negative zero to zero", () => {
    expect(round2(-0.0001)).toBe(0);
    expect(Object.is(round2(-0.0004), -0)).toBe(false);
    expect(Object.is(round2(-0), 0)).toBe(true);
  });
});

describe("formatINR", () => {
  it("prefixes the rupee symbol with exactly two decimals", () => {
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(0.1)).toBe("₹0.10");
    expect(formatINR(1)).toBe("₹1.00");
    expect(formatINR(123)).toBe("₹123.00");
  });

  it("groups digits using the Indian number system", () => {
    expect(formatINR(1234)).toBe("₹1,234.00");
    expect(formatINR(1234567.89)).toBe("₹12,34,567.89");
  });

  it("rounds before rendering", () => {
    expect(formatINR(0.999)).toBe("₹1.00");
  });
});