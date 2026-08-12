import { describe, expect, it } from "vitest";
import {
  expenseDeleteBlockMessage,
  expenseLockMessage,
  lockedFieldsChanged,
  parseSettlementFormData,
  settlementDirection,
  settlementRowsRemaining,
  toLedgerSettlements,
  validateSplitSettlement,
} from "../src/lib/settlements";

describe("settlementDirection", () => {
  it("maps splits to to_receive", () => {
    expect(settlementDirection("split")).toBe("to_receive");
  });

  it("maps ious to to_pay", () => {
    expect(settlementDirection("iou")).toBe("to_pay");
  });
});

describe("parseSettlementFormData", () => {
  function form(overrides: Record<string, string> = {}) {
    const formData = new FormData();
    const fields = {
      debt_id: "split-1",
      amount: "₹1,000.50",
      method: "UPI",
      date: "2026-08-01",
      note: "paid at dinner",
      ...overrides,
    };
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return formData;
  }

  it("parses a valid settlement and rounds the amount", () => {
    const result = parseSettlementFormData(form());
    expect(result).toEqual({
      ok: true,
      input: {
        debtId: "split-1",
        amount: 1000.5,
        method: "UPI",
        date: "2026-08-01",
        note: "paid at dinner",
      },
    });
  });

  it("rejects a missing debt id", () => {
    const result = parseSettlementFormData(form({ debt_id: "  " }));
    expect(result).toEqual({ ok: false, error: "Debt not found" });
  });

  it("rejects an invalid amount", () => {
    expect(parseSettlementFormData(form({ amount: "abc" }))).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
    expect(parseSettlementFormData(form({ amount: "-5" }))).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
  });

  it("rejects an unknown payment method", () => {
    expect(parseSettlementFormData(form({ method: "Bitcoin" }))).toEqual({
      ok: false,
      error: "Choose a payment method",
    });
  });

  it("rejects an invalid date", () => {
    expect(parseSettlementFormData(form({ date: "2026-13-45" }))).toEqual({
      ok: false,
      error: "Enter a valid date",
    });
  });

  it("defaults an empty date to today and an empty note to null", () => {
    const result = parseSettlementFormData(form({ date: "", note: "   " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.input.note).toBeNull();
  });

  it("rejects a settlement with no amount field", () => {
    const formData = form();
    formData.delete("amount");
    expect(parseSettlementFormData(formData)).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
  });

  it("rejects a settlement with no method field", () => {
    const formData = form();
    formData.delete("method");
    expect(parseSettlementFormData(formData)).toEqual({
      ok: false,
      error: "Choose a payment method",
    });
  });

  it("defaults a missing date field to today", () => {
    const formData = form();
    formData.delete("date");
    const result = parseSettlementFormData(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("accepts a settlement with no note field", () => {
    const formData = form();
    formData.delete("note");
    const result = parseSettlementFormData(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.note).toBeNull();
  });

  it("rejects a settlement with no debt id at all", () => {
    expect(parseSettlementFormData(new FormData())).toEqual({
      ok: false,
      error: "Debt not found",
    });
  });

  it("rejects an oversized note", () => {
    const result = parseSettlementFormData(form({ note: "x".repeat(501) }));
    expect(result).toEqual({
      ok: false,
      error: "Keep the note under 500 characters",
    });
  });
});

describe("validateSplitSettlement", () => {
  it("accepts a partial payment within the remaining balance", () => {
    const result = validateSplitSettlement(
      { debtId: "s1", amount: 600, method: "UPI", date: "2026-08-01", note: null },
      1000,
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects a zero amount", () => {
    const result = validateSplitSettlement(
      { debtId: "s1", amount: 0, method: "UPI", date: "2026-08-01", note: null },
      1000,
    );
    expect(result).toEqual({ ok: false, error: "Amount must be greater than 0" });
  });

  it("rejects oversettling beyond the remaining balance", () => {
    const result = validateSplitSettlement(
      { debtId: "s1", amount: 1001, method: "UPI", date: "2026-08-01", note: null },
      1000,
    );
    expect(result).toEqual({ ok: false, error: "Amount exceeds the remaining balance" });
  });
});

describe("settlementRowsRemaining", () => {
  it("is the debt amount minus settled amounts", () => {
    expect(settlementRowsRemaining(1000, [400, 200])).toBe(400);
  });

  it("clamps to zero when over-settled", () => {
    expect(settlementRowsRemaining(1000, [600, 500])).toBe(0);
  });

  it("rounds at every accumulation step", () => {
    expect(settlementRowsRemaining(0.1, [0.05, 0.05, 0.05])).toBe(0);
  });
});

describe("toLedgerSettlements", () => {
  it("maps rows to ledger settlements with rounded amounts", () => {
    expect(
      toLedgerSettlements([
        { id: "a", debtId: "s1", amount: 100.005 },
        { id: "b", debtId: "s1", amount: 0.1 },
      ]),
    ).toEqual([
      { debtId: "s1", amount: 100.01 },
      { debtId: "s1", amount: 0.1 },
    ]);
  });
});

describe("lockedFieldsChanged", () => {
  it("reports unchanged money fields as not changed", () => {
    expect(
      lockedFieldsChanged(
        { amount: 1000, paymentMethod: "UPI" },
        { amount: 1000, paymentMethod: "UPI" },
      ),
    ).toBe(false);
  });

  it("reports an amount change", () => {
    expect(
      lockedFieldsChanged(
        { amount: 1000, paymentMethod: "UPI" },
        { amount: 999.99, paymentMethod: "UPI" },
      ),
    ).toBe(true);
  });

  it("reports a payment method change", () => {
    expect(
      lockedFieldsChanged(
        { amount: 1000, paymentMethod: "UPI" },
        { amount: 1000, paymentMethod: "Cash" },
      ),
    ).toBe(true);
  });

  it("treats sub-paise differences as no change after rounding", () => {
    expect(
      lockedFieldsChanged(
        { amount: 1000, paymentMethod: "UPI" },
        { amount: 1000.004, paymentMethod: "UPI" },
      ),
    ).toBe(false);
  });
});

describe("lock messages", () => {
  it("singular lock message", () => {
    expect(expenseLockMessage(1)).toBe(
      "This expense has a settlement — amount and payment method are locked. Delete the settlement to edit them.",
    );
  });

  it("plural lock message", () => {
    expect(expenseLockMessage(3)).toBe(
      "This expense has 3 settlements — amount and payment method are locked. Delete the settlements to edit them.",
    );
  });

  it("singular delete block message", () => {
    expect(expenseDeleteBlockMessage(1)).toBe("Delete the 1 settlement on this expense first");
  });

  it("plural delete block message", () => {
    expect(expenseDeleteBlockMessage(4)).toBe(
      "Delete the 4 settlements on this expense first",
    );
  });
});