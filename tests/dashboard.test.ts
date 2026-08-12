import { describe, expect, it } from "vitest";
import {
  categoryBreakdown,
  categoryColor,
  directionTotals,
  donutStops,
  momChangeText,
  momPercent,
  monthLabel,
  monthRange,
  previousMonth,
  rpcTotalToNumber,
  yearRange,
} from "../src/lib/dashboard";

describe("monthRange", () => {
  it("covers a full month inclusively", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("handles leap years", () => {
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("rejects malformed months", () => {
    expect(monthRange("2026-13")).toBeNull();
    expect(monthRange("2026/08")).toBeNull();
    expect(monthRange("")).toBeNull();
  });
});

describe("yearRange", () => {
  it("spans the whole year", () => {
    expect(yearRange("2026-08")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("previousMonth", () => {
  it("wraps to December of the prior year", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("steps back within the year", () => {
    expect(previousMonth("2026-08")).toBe("2026-07");
  });

  it("rejects malformed months", () => {
    expect(previousMonth("2026-13")).toBeNull();
  });
});

describe("monthLabel", () => {
  it("renders a readable label", () => {
    expect(monthLabel("2026-08")).toBe("August 2026");
  });
});

describe("momPercent", () => {
  it("returns the rounded percentage change", () => {
    expect(momPercent(1150, 1000)).toBe(15);
  });

  it("returns null without a previous baseline", () => {
    expect(momPercent(1000, 0)).toBeNull();
    expect(momPercent(1000, -5)).toBeNull();
    expect(momPercent(Number.NaN, 100)).toBeNull();
  });
});

describe("momChangeText", () => {
  it("labels an increase", () => {
    expect(momChangeText(15)).toBe("+15.0% vs last month");
  });

  it("labels a decrease", () => {
    expect(momChangeText(-8)).toBe("-8.0% vs last month");
  });

  it("labels a flat month", () => {
    expect(momChangeText(0)).toBe("0% vs last month");
  });

  it("labels a missing baseline", () => {
    expect(momChangeText(null)).toBe("No last-month data");
  });
});

describe("rpcTotalToNumber", () => {
  it("parses numeric RPC totals", () => {
    expect(rpcTotalToNumber("1234.56")).toBe(1234.56);
    expect(rpcTotalToNumber(42)).toBe(42);
    expect(rpcTotalToNumber(null)).toBe(0);
    expect(rpcTotalToNumber("abc")).toBe(0);
  });
});

describe("categoryBreakdown", () => {
  it("sorts slices by amount and computes percent shares", () => {
    const slices = categoryBreakdown([
      { categoryId: "c2", name: "Food", amount: 400 },
      { categoryId: "c1", name: "Travel", amount: 600 },
    ]);
    expect(slices).toEqual([
      { categoryId: "c1", name: "Travel", amount: 600, percent: 60 },
      { categoryId: "c2", name: "Food", amount: 400, percent: 40 },
    ]);
  });

  it("falls back to Uncategorised and treats empty catgories", () => {
    const slices = categoryBreakdown([{ categoryId: null, name: "", amount: 250 }]);
    expect(slices[0]).toMatchObject({ name: "Uncategorised", amount: 250, percent: 100 });
  });

  it("returns an empty list when there is nothing to show", () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe("categoryColor", () => {
  it("is stable per category id", () => {
    expect(categoryColor("abc")).toBe(categoryColor("abc"));
  });

  it("maps uncategorized to the neutral color", () => {
    expect(categoryColor(null)).toBe("var(--category)");
  });
});

describe("donutStops", () => {
  it("turns slices into conic stops with small gaps", () => {
    const stops = donutStops([
      { value: 60, categoryId: "c1" },
      { value: 40, categoryId: null },
    ]);
    expect(stops).toHaveLength(2);
    expect(stops[0].from).toBe(0);
    expect(stops[0].to).toBeLessThan(stops[1].from);
    expect(stops[1].to).toBe(100);
    expect(stops[1].color).toBe("var(--category)");
  });

  it("skips zero-value slices", () => {
    const stops = donutStops([
      { value: 0, categoryId: "c1" },
      { value: 100, categoryId: "c2" },
    ]);
    expect(stops).toHaveLength(1);
  });
});

describe("directionTotals", () => {
  it("sums RPC rows by direction, rounding at every boundary", () => {
    expect(
      directionTotals([
        { direction: "to_receive", total: "500.10" },
        { direction: "to_receive", total: "249.90" },
        { direction: "to_pay", total: "300" },
      ]),
    ).toEqual({ receivable: 750, payable: 300 });
  });

  it("ignores unknown directions", () => {
    expect(directionTotals([{ direction: "sideways", total: 10 }])).toEqual({
      receivable: 0,
      payable: 0,
    });
  });
});