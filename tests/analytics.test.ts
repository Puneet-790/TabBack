import { describe, expect, it } from "vitest";
import {
  ANALYTICS_VIEWS,
  averageDaily,
  averageMonthly,
  bucketLabel,
  daysInRange,
  highestBucket,
  isAnalyticsView,
  periodChangeText,
  previousRange,
  quarterNumber,
  quarterRange,
  seriesPercent,
  viewLabel,
  viewRange,
} from "../src/lib/analytics";

describe("isAnalyticsView", () => {
  it("accepts the three views", () => {
    expect(isAnalyticsView("month")).toBe("month");
    expect(isAnalyticsView("quarter")).toBe("quarter");
    expect(isAnalyticsView("year")).toBe("year");
  });

  it("falls back to month for anything else", () => {
    expect(isAnalyticsView("week")).toBe("month");
    expect(isAnalyticsView("")).toBe("month");
    expect(isAnalyticsView("MONTH")).toBe("month");
  });

  it("matches the exported views constant", () => {
    expect(ANALYTICS_VIEWS).toEqual(["month", "quarter", "year"]);
  });
});

describe("quarterNumber", () => {
  it("maps each month to its quarter", () => {
    expect(quarterNumber("2026-01")).toBe(1);
    expect(quarterNumber("2026-02")).toBe(1);
    expect(quarterNumber("2026-03")).toBe(1);
    expect(quarterNumber("2026-04")).toBe(2);
    expect(quarterNumber("2026-06")).toBe(2);
    expect(quarterNumber("2026-07")).toBe(3);
    expect(quarterNumber("2026-09")).toBe(3);
    expect(quarterNumber("2026-10")).toBe(4);
    expect(quarterNumber("2026-12")).toBe(4);
  });

  it("rejects malformed months", () => {
    expect(quarterNumber("2026-13")).toBeNull();
    expect(quarterNumber("abc")).toBeNull();
  });
});

describe("quarterRange", () => {
  it("covers all four quarters inclusive", () => {
    expect(quarterRange("2026-01")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(quarterRange("2026-02")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(quarterRange("2026-03")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(quarterRange("2026-04")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(quarterRange("2026-05")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(quarterRange("2026-06")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(quarterRange("2026-07")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(quarterRange("2026-08")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(quarterRange("2026-09")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(quarterRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(quarterRange("2026-11")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(quarterRange("2026-12")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
  });

  it("handles leap-year quarter ends", () => {
    expect(quarterRange("2024-02")).toEqual({ from: "2024-01-01", to: "2024-03-31" });
  });

  it("rejects malformed months", () => {
    expect(quarterRange("2026-13")).toBeNull();
    expect(quarterRange("2026/08")).toBeNull();
    expect(quarterRange("")).toBeNull();
  });
});

describe("viewRange", () => {
  it("maps month to monthRange", () => {
    expect(viewRange("month", "2026-08")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("maps quarter to quarterRange", () => {
    expect(viewRange("quarter", "2026-08")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
  });

  it("maps year to yearRange", () => {
    expect(viewRange("year", "2026-08")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("rejects malformed months", () => {
    expect(viewRange("month", "2026-13")).toBeNull();
    expect(viewRange("year", "")).toBeNull();
  });

  it("honours leap years in the month view", () => {
    expect(viewRange("month", "2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});

describe("previousRange", () => {
  it("wraps January to December of the prior year", () => {
    expect(previousRange("month", "2026-01")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("steps back a month within the year", () => {
    expect(previousRange("month", "2026-08")).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("maps the first quarter to Q4 of the prior year", () => {
    expect(previousRange("quarter", "2026-02")).toEqual({ from: "2025-10-01", to: "2025-12-31" });
  });

  it("maps later quarters to the prior quarter in-year", () => {
    expect(previousRange("quarter", "2026-08")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(previousRange("quarter", "2026-10")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
  });

  it("maps the year view to the full prior year", () => {
    expect(previousRange("year", "2026-08")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(previousRange("year", "2026-01")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("rejects malformed months", () => {
    expect(previousRange("month", "2026-13")).toBeNull();
    expect(previousRange("quarter", "abc")).toBeNull();
    expect(previousRange("year", "2026-13")).toBeNull();
  });
});

describe("viewLabel", () => {
  it("renders the month label", () => {
    expect(viewLabel("month", "2026-08")).toBe("August 2026");
  });

  it("renders the quarter label", () => {
    expect(viewLabel("quarter", "2026-08")).toBe("Q3 2026");
    expect(viewLabel("quarter", "2026-12")).toBe("Q4 2026");
  });

  it("renders the year label", () => {
    expect(viewLabel("year", "2026-08")).toBe("2026");
  });

  it("passes through malformed months", () => {
    expect(viewLabel("quarter", "nope")).toBe("nope");
    expect(viewLabel("year", "")).toBe("");
  });
});

describe("daysInRange", () => {
  it("counts a 28-day February", () => {
    expect(daysInRange({ from: "2026-02-01", to: "2026-02-28" })).toBe(28);
  });

  it("counts a 29-day leap February", () => {
    expect(daysInRange({ from: "2024-02-01", to: "2024-02-29" })).toBe(29);
  });

  it("counts a 30-day month", () => {
    expect(daysInRange({ from: "2026-04-01", to: "2026-04-30" })).toBe(30);
  });

  it("counts a 31-day month", () => {
    expect(daysInRange({ from: "2026-08-01", to: "2026-08-31" })).toBe(31);
  });

  it("counts a full year inclusively", () => {
    expect(daysInRange({ from: "2026-01-01", to: "2026-12-31" })).toBe(365);
  });
});

describe("averageDaily", () => {
  it("rounds to two decimals", () => {
    expect(averageDaily(1000, 3)).toBe(333.33);
    expect(averageDaily(3000, 4)).toBe(750);
  });

  it("guards against a zero or negative day count", () => {
    expect(averageDaily(100, 0)).toBe(0);
    expect(averageDaily(100, -2)).toBe(0);
  });

  it("guards against non-finite inputs", () => {
    expect(averageDaily(Number.NaN, 30)).toBe(0);
    expect(averageDaily(100, Number.NaN)).toBe(0);
  });
});

describe("averageMonthly", () => {
  it("divides by twelve and rounds", () => {
    expect(averageMonthly(1200)).toBe(100);
    expect(averageMonthly(1000)).toBe(83.33);
    expect(averageMonthly(0)).toBe(0);
  });
});

describe("highestBucket", () => {
  it("returns the highest amount", () => {
    expect(
      highestBucket([
        { label: "Jan", amount: 400 },
        { label: "Feb", amount: 900 },
        { label: "Mar", amount: 200 },
      ]),
    ).toEqual({ label: "Feb", amount: 900 });
  });

  it("keeps the first row on a tie", () => {
    expect(
      highestBucket([
        { label: "Jan", amount: 500 },
        { label: "Feb", amount: 500 },
      ]),
    ).toEqual({ label: "Jan", amount: 500 });
  });

  it("returns null for an empty series", () => {
    expect(highestBucket([])).toBeNull();
  });
});

describe("bucketLabel", () => {
  it("formats day buckets as day and short month", () => {
    expect(bucketLabel("2026-08-05", "day")).toBe("5 Aug");
  });

  it("formats week buckets from the week start date", () => {
    expect(bucketLabel("2026-08-10", "week")).toBe("10 Aug");
  });

  it("formats month buckets as short month", () => {
    expect(bucketLabel("2026-08-01", "month")).toBe("Aug");
  });

  it("passes through unparseable dates", () => {
    expect(bucketLabel("not-a-date", "day")).toBe("not-a-date");
  });
});

describe("seriesPercent", () => {
  it("maps each amount to its share of the max", () => {
    expect(
      seriesPercent([{ amount: 100 }, { amount: 50 }, { amount: 25 }]),
    ).toEqual(
      new Map([
        [100, 100],
        [50, 50],
        [25, 25],
      ]),
    );
  });

  it("rounds to one decimal", () => {
    expect(seriesPercent([{ amount: 7 }, { amount: 3 }])).toEqual(
      new Map([
        [7, 100],
        [3, 42.9],
      ]),
    );
  });

  it("returns zero percents when the max is not positive", () => {
    expect(seriesPercent([{ amount: 0 }, { amount: 0 }])).toEqual(
      new Map([
        [0, 0],
        [0, 0],
      ]),
    );
    expect(seriesPercent([])).toEqual(new Map());
  });
});

describe("periodChangeText", () => {
  it("renders a positive change per view", () => {
    expect(periodChangeText(12.3, "month")).toBe("+12.3% vs last month");
    expect(periodChangeText(12.3, "quarter")).toBe("+12.3% vs last quarter");
    expect(periodChangeText(12.3, "year")).toBe("+12.3% vs last year");
  });

  it("renders a negative change with one decimal", () => {
    expect(periodChangeText(-8, "quarter")).toBe("-8.0% vs last quarter");
  });

  it("renders a flat comparison", () => {
    expect(periodChangeText(0, "year")).toBe("0% vs last year");
  });

  it("renders the honest no-data state per view", () => {
    expect(periodChangeText(null, "month")).toBe("No last-month data");
    expect(periodChangeText(null, "quarter")).toBe("No last-quarter data");
    expect(periodChangeText(null, "year")).toBe("No last-year data");
  });
});
