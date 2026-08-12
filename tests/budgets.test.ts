import { describe, expect, it } from "vitest";
import {
  bandLabel,
  budgetProgress,
  categoryProgress,
  isBudgetMonth,
  overBudgetHint,
  parseBudgetAmount,
  parseBudgetFormData,
  warningBand,
} from "../src/lib/budgets";

describe("parseBudgetAmount", () => {
  it("parses plain numbers", () => {
    expect(parseBudgetAmount("500")).toBe(500);
    expect(parseBudgetAmount("0")).toBe(0);
  });

  it("strips currency symbols, commas and spaces", () => {
    expect(parseBudgetAmount("₹1,000")).toBe(1000);
    expect(parseBudgetAmount(" 1,000.50 ")).toBe(1000.5);
    expect(parseBudgetAmount("₹ 12 500")).toBe(12500);
  });

  it("treats an empty string as zero (no limit)", () => {
    expect(parseBudgetAmount("")).toBe(0);
    expect(parseBudgetAmount("   ")).toBe(0);
  });

  it("rounds to two decimals", () => {
    expect(parseBudgetAmount("10.005")).toBe(10.01);
    expect(parseBudgetAmount("99.999")).toBe(100);
  });

  it("rejects negative values", () => {
    expect(parseBudgetAmount("-50")).toBeNull();
    expect(parseBudgetAmount("₹-50")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(parseBudgetAmount("abc")).toBeNull();
    expect(parseBudgetAmount("NaN")).toBeNull();
    expect(parseBudgetAmount("Infinity")).toBeNull();
    expect(parseBudgetAmount("₹1,000abc")).toBeNull();
  });
});

describe("budgetProgress", () => {
  it("never divides for an unset or negative limit", () => {
    expect(budgetProgress(100, 0)).toEqual({ percent: 0, remaining: null });
    expect(budgetProgress(100, -5)).toEqual({ percent: 0, remaining: null });
    expect(budgetProgress(0, 0)).toEqual({ percent: 0, remaining: null });
  });

  it("guards against non-finite inputs", () => {
    expect(budgetProgress(Number.NaN, 100)).toEqual({ percent: 0, remaining: null });
    expect(budgetProgress(50, Number.NaN)).toEqual({ percent: 0, remaining: null });
  });

  it("computes percent and positive remaining", () => {
    expect(budgetProgress(50, 100)).toEqual({ percent: 50, remaining: 50 });
    expect(budgetProgress(0, 100)).toEqual({ percent: 0, remaining: 100 });
  });

  it("crosses the warning boundaries with 0.1 rounding", () => {
    expect(budgetProgress(74.99, 100).percent).toBe(75);
    expect(budgetProgress(75, 100).percent).toBe(75);
    expect(budgetProgress(89.99, 100).percent).toBe(90);
    expect(budgetProgress(90, 100).percent).toBe(90);
    expect(budgetProgress(99.99, 100).percent).toBe(100);
    expect(budgetProgress(100, 100).percent).toBe(100);
    expect(budgetProgress(101, 100).percent).toBe(101);
  });

  it("returns a negative remaining when over budget", () => {
    expect(budgetProgress(250, 100)).toEqual({ percent: 250, remaining: -150 });
    expect(budgetProgress(101, 100)).toEqual({ percent: 101, remaining: -1 });
  });

  it("rounds percent to one decimal and remaining to two", () => {
    expect(budgetProgress(1, 3)).toEqual({ percent: 33.3, remaining: 2 });
    expect(budgetProgress(1, 7)).toEqual({ percent: 14.3, remaining: 6 });
  });
});

describe("warningBand", () => {
  it("stays calm below 75%", () => {
    expect(warningBand(0)).toBe("ok");
    expect(warningBand(74.99)).toBe("ok");
  });

  it("fires exactly at 75%", () => {
    expect(warningBand(75)).toBe("nudge-75");
    expect(warningBand(89.99)).toBe("nudge-75");
  });

  it("fires exactly at 90%", () => {
    expect(warningBand(90)).toBe("nudge-90");
    expect(warningBand(99.99)).toBe("nudge-90");
  });

  it("fires exactly at 100% and beyond", () => {
    expect(warningBand(100)).toBe("over");
    expect(warningBand(101)).toBe("over");
    expect(warningBand(250)).toBe("over");
  });

  it("treats non-finite percents as on track", () => {
    expect(warningBand(Number.NaN)).toBe("ok");
  });
});

describe("bandLabel", () => {
  it("renders calm copy for every band", () => {
    expect(bandLabel("ok")).toBe("On track");
    expect(bandLabel("nudge-75")).toBe("75% used — three-quarters in");
    expect(bandLabel("nudge-90")).toBe("90% used — nearly at the limit");
    expect(bandLabel("over")).toBe("Over budget");
  });
});

describe("overBudgetHint", () => {
  it("returns null while within or at the limit", () => {
    expect(overBudgetHint(50, 100)).toBeNull();
    expect(overBudgetHint(100, 100)).toBeNull();
  });

  it("returns null for an unset limit", () => {
    expect(overBudgetHint(120, 0)).toBeNull();
    expect(overBudgetHint(120, -5)).toBeNull();
  });

  it("returns the over amount once past the limit", () => {
    expect(overBudgetHint(120, 100)).toBe(20);
    expect(overBudgetHint(150, 100)).toBe(50);
  });
});

describe("categoryProgress", () => {
  it("only includes categories that have a limit", () => {
    const rows = categoryProgress(
      { a: 100, b: 500 },
      { a: 100 },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ categoryId: "a", spent: 100, limit: 100, percent: 100, band: "over" });
  });

  it("defaults to zero spend for a limited category with no spend", () => {
    const rows = categoryProgress({}, { a: 100 });
    expect(rows).toEqual([
      { categoryId: "a", spent: 0, limit: 100, percent: 0, band: "ok" },
    ]);
  });

  it("sorts by percent descending", () => {
    const rows = categoryProgress(
      { a: 80, b: 200, c: 10 },
      { a: 100, b: 200, c: 50 },
    );
    expect(rows.map((row) => row.categoryId)).toEqual(["b", "a", "c"]);
  });

  it("assigns the right band per row", () => {
    const rows = categoryProgress(
      { food: 75, travel: 45, rent: 30, work: 10 },
      { food: 100, travel: 50, rent: 30, work: 1000 },
    );
    expect(rows.find((row) => row.categoryId === "food")?.band).toBe("nudge-75");
    expect(rows.find((row) => row.categoryId === "travel")?.band).toBe("nudge-90");
    expect(rows.find((row) => row.categoryId === "rent")?.band).toBe("over");
    expect(rows.find((row) => row.categoryId === "work")?.band).toBe("ok");
  });

  it("rounds spent amounts", () => {
    const rows = categoryProgress({ a: 33.333 }, { a: 100 });
    expect(rows[0]).toMatchObject({ spent: 33.33, percent: 33.3 });
  });
});

describe("parseBudgetFormData", () => {
  const validIds = ["cat-food", "cat-travel", "cat-rent"];

  it("parses a full valid form", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "₹2,000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "₹500");
    formData.set("limit_categories_1", "cat-travel");
    formData.set("limit_amounts_1", "250.50");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: true,
      month: "2026-08",
      overallLimit: 2000,
      categoryLimits: { "cat-food": 500, "cat-travel": 250.5 },
    });
  });

  it("allows an empty overall limit when category limits exist", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "500");
    const result = parseBudgetFormData(formData, validIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.overallLimit).toBe(0);
      expect(result.categoryLimits).toEqual({ "cat-food": 500 });
    }
  });

  it("rejects a missing month", () => {
    const formData = new FormData();
    formData.set("overall_limit", "500");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Enter a valid month",
    });
  });

  it("rejects a malformed month", () => {
    const formData = new FormData();
    formData.set("month", "2026-13");
    formData.set("overall_limit", "500");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Enter a valid month",
    });
  });

  it("rejects garbage overall limits", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "abc");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Enter a valid overall limit",
    });
  });

  it("rejects a negative overall limit", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "-100");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Enter a valid overall limit",
    });
  });

  it("rejects a form that sets nothing", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Set an overall limit or at least one category limit",
    });
  });

  it("rejects a category row with an unknown category id", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-nope");
    formData.set("limit_amounts_0", "100");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Choose a valid category",
    });
  });

  it("rejects a category row with an amount but no category", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "");
    formData.set("limit_amounts_0", "100");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Choose a category for each limit",
    });
  });

  it("rejects a duplicate category id", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "100");
    formData.set("limit_categories_1", "cat-food");
    formData.set("limit_amounts_1", "200");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Each category can have only one limit",
    });
  });

  it("rejects garbage category amounts", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "abc");
    expect(parseBudgetFormData(formData, validIds)).toEqual({
      ok: false,
      error: "Enter a valid amount for each category limit",
    });
  });

  it("skips a category row with an empty amount", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "");
    formData.set("limit_categories_1", "cat-travel");
    formData.set("limit_amounts_1", "300");
    const result = parseBudgetFormData(formData, validIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categoryLimits).toEqual({ "cat-travel": 300 });
    }
  });

  it("stops at the first missing index and ignores later rows", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "100");
    formData.set("limit_categories_2", "cat-rent");
    formData.set("limit_amounts_2", "900");
    const result = parseBudgetFormData(formData, validIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categoryLimits).toEqual({ "cat-food": 100 });
    }
  });

  it("omits zero-valued category limits", () => {
    const formData = new FormData();
    formData.set("month", "2026-08");
    formData.set("overall_limit", "1000");
    formData.set("limit_categories_0", "cat-food");
    formData.set("limit_amounts_0", "0");
    const result = parseBudgetFormData(formData, validIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.categoryLimits).toEqual({});
    }
  });
});

describe("isBudgetMonth", () => {
  it("accepts valid months", () => {
    expect(isBudgetMonth("2026-08")).toBe(true);
    expect(isBudgetMonth("2026-01")).toBe(true);
    expect(isBudgetMonth("2026-12")).toBe(true);
  });

  it("rejects malformed months", () => {
    expect(isBudgetMonth("2026-13")).toBe(false);
    expect(isBudgetMonth("2026-00")).toBe(false);
    expect(isBudgetMonth("2026/08")).toBe(false);
    expect(isBudgetMonth("")).toBe(false);
    expect(isBudgetMonth("abc")).toBe(false);
    expect(isBudgetMonth("2026-8")).toBe(false);
  });
});
