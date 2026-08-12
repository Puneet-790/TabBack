import { describe, expect, it } from "vitest";
import { parseFilters, filtersToQuery, parseOffset } from "../src/lib/data";
import {
  isValidDate,
  matchesSplitFilter,
  matchesStatusFilter,
  parseExpenseAmount,
  receiptPathFor,
  splitState,
  todayLocalIso,
  validateReceiptFile,
} from "../src/lib/expenses";

describe("parseExpenseAmount", () => {
  it("parses plain amounts and rounds to 2 decimals", () => {
    expect(parseExpenseAmount("123")).toBe(123);
    expect(parseExpenseAmount("123.456")).toBe(123.46);
    expect(parseExpenseAmount("0.999")).toBe(1);
    expect(parseExpenseAmount("0")).toBe(0);
  });

  it("strips ₹, commas and whitespace", () => {
    expect(parseExpenseAmount(" ₹ 1,234.50 ")).toBe(1234.5);
    expect(parseExpenseAmount("12,34,567.89")).toBe(1234567.89);
  });

  it("rejects empty, non-numeric, negative and oversized values", () => {
    expect(parseExpenseAmount("")).toBeNull();
    expect(parseExpenseAmount("abc")).toBeNull();
    expect(parseExpenseAmount("-5")).toBeNull();
    expect(parseExpenseAmount("10000000000")).toBeNull();
  });
});

describe("isValidDate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidDate("2026-08-09")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("rejects malformed dates", () => {
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2025-02-29")).toBe(false);
    expect(isValidDate("09/08/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("validateReceiptFile", () => {
  it("rejects empty, oversized and wrong type files", () => {
    expect(validateReceiptFile({ name: "a.png", size: 0, type: "image/png" })).not.toBeNull();
    expect(
      validateReceiptFile({ name: "a.png", size: 5 * 1024 * 1024 + 1, type: "image/png" }),
    ).toBe("Receipt must be 5 MB or smaller");
    expect(
      validateReceiptFile({ name: "a.txt", size: 100, type: "text/plain" }),
    ).toBe("Only image files or PDFs are allowed");
  });

  it("accepts images and PDFs up to 5 MB", () => {
    expect(
      validateReceiptFile({ name: "a.png", size: 5 * 1024 * 1024, type: "image/png" }),
    ).toBeNull();
    expect(
      validateReceiptFile({ name: "a.pdf", size: 100, type: "application/pdf" }),
    ).toBeNull();
  });
});

describe("receiptPathFor", () => {
  it("builds receipts/<userId>/<uuid>.<ext> with lowercase extension", () => {
    const path = receiptPathFor("user-1", "RECEIPT.JPG");
    expect(path).toMatch(/^receipts\/user-1\/[0-9a-f-]{36}\.jpg$/);
  });

  it("rejects unsupported extensions", () => {
    expect(receiptPathFor("user-1", "receipt.exe")).toBeNull();
    expect(receiptPathFor("user-1", "no-extension")).toBeNull();
  });
});

describe("splitState", () => {
  const share = (id: string, amount: number) => ({ id, personId: "p1", amount });

  it("is none when there are no shares", () => {
    expect(splitState([], [])).toBe("none");
  });

  it("is pending when any share has unsettled balance", () => {
    expect(splitState([share("s1", 100)], [])).toBe("pending");
    expect(
      splitState([share("s1", 100)], [{ debtId: "s1", amount: 40 }]),
    ).toBe("pending");
  });

  it("is paid only when every share is fully settled", () => {
    expect(
      splitState([share("s1", 100)], [{ debtId: "s1", amount: 100 }]),
    ).toBe("paid");
    expect(
      splitState(
        [share("s1", 100), share("s2", 50)],
        [
          { debtId: "s1", amount: 100 },
          { debtId: "s2", amount: 50 },
        ],
      ),
    ).toBe("paid");
  });
});

describe("filter matchers", () => {
  it("split filter treats only split expenses as split", () => {
    expect(matchesSplitFilter("none", "split")).toBe(false);
    expect(matchesSplitFilter("pending", "split")).toBe(true);
    expect(matchesSplitFilter("paid", "split")).toBe(true);
    expect(matchesSplitFilter("none", "not_split")).toBe(true);
    expect(matchesSplitFilter("pending", "not_split")).toBe(false);
    expect(matchesSplitFilter("pending", "all")).toBe(true);
  });

  it("status filter lets un-split rows satisfy any state until splits exist", () => {
    expect(matchesStatusFilter("none", "pending")).toBe(true);
    expect(matchesStatusFilter("none", "paid")).toBe(true);
    expect(matchesStatusFilter("pending", "pending")).toBe(true);
    expect(matchesStatusFilter("pending", "paid")).toBe(false);
    expect(matchesStatusFilter("paid", "paid")).toBe(true);
    expect(matchesStatusFilter("paid", "pending")).toBe(false);
  });
});

describe("parseFilters / filtersToQuery", () => {
  it("defaults every filter when params are absent or invalid", () => {
    const filters = parseFilters({});
    expect(filters).toEqual({
      search: "",
      from: "",
      to: "",
      categoryId: "",
      minAmount: "",
      maxAmount: "",
      paymentMethod: "",
      personId: "",
      split: "all",
      status: "all",
    });
    expect(parseFilters({ split: "weird", status: "x", method: "cheque" }).split).toBe("all");
    expect(parseFilters({ from: "not-a-date" }).from).toBe("");
  });

  it("round-trips valid filters through the query string", () => {
    const source = {
      q: "lunch",
      from: "2026-08-01",
      to: "2026-08-31",
      category: "cat-1",
      min: "10",
      max: "500",
      method: "UPI",
      person: "person-1",
      split: "not_split",
      status: "pending",
    };
    const filters = parseFilters(source);
    const query = filtersToQuery(filters);
    expect(query).toContain("q=lunch");
    expect(query).toContain("from=2026-08-01");
    expect(query).toContain("split=not_split");
    expect(query).toContain("status=pending");
    expect(parseFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });

  it("drops empty filters from the query string", () => {
    expect(filtersToQuery(parseFilters({}))).toBe("");
  });
});

describe("parseOffset", () => {
  it("falls back to 0 for missing or invalid offsets", () => {
    expect(parseOffset(null)).toBe(0);
    expect(parseOffset("abc")).toBe(0);
    expect(parseOffset("-3")).toBe(0);
    expect(parseOffset("20")).toBe(20);
  });
});

describe("todayLocalIso", () => {
  it("returns the current local date in ISO format", () => {
    expect(todayLocalIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});