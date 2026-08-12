import { describe, expect, it } from "vitest";
import {
  equalSplit,
  grossTotals,
  isValidSettlement,
  net,
  overdueDays,
  remaining,
  roundMoney,
  settlementError,
  status,
  userShare,
  validateSettlement,
  validateSplitDistribution,
  type Debt,
  type Settlement,
} from "../src/lib/ledger";

type Extra = Partial<Pick<Debt, "dueDate" | "expenseDate">>;

function split(personId: string, amount: number, extra: Extra = {}): Debt {
  return { id: `sp-${personId}-${amount}`, personId, amount, type: "split", ...extra };
}

function iou(personId: string, amount: number, direction: "to_receive" | "to_pay", extra: Extra = {}): Debt {
  return { id: `iou-${personId}-${amount}`, personId, amount, type: "iou", direction, ...extra };
}

function settle(id: string, debtId: string, amount: number): Settlement {
  return { id, debtId, amount };
}

describe("roundMoney", () => {
  it("rounds float mixtures to two decimals", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.999)).toBe(1);
  });

  it("normalises negative zero", () => {
    expect(roundMoney(-0.0001)).toBe(0);
    expect(Object.is(roundMoney(-0), 0)).toBe(true);
  });
});

describe("remaining", () => {
  it("starts at the full debt amount with no settlements", () => {
    expect(remaining(split("A", 1000), [])).toBe(1000);
  });

  it("ignores settlements belonging to other debts", () => {
    const debt = split("A", 1000);
    const settlements = [settle("x1", "other-debt", 999), settle("x2", debt.id, 200)];
    expect(remaining(debt, settlements)).toBe(800);
  });

  it("decreases across partial settlements and clamps at zero", () => {
    const debt = split("A", 1000);
    const one = [settle("x1", debt.id, 600)];
    expect(remaining(debt, one)).toBe(400);
    const both = [...one, settle("x2", debt.id, 400)];
    expect(remaining(debt, both)).toBe(0);
    const oversettled = [...both, settle("x3", debt.id, 1)];
    expect(remaining(debt, oversettled)).toBe(0);
  });

  it("handles float amounts without artifacts", () => {
    const debt = split("A", 0.3);
    expect(remaining(debt, [settle("x1", debt.id, 0.1), settle("x2", debt.id, 0.2)])).toBe(0);
  });
});

describe("status", () => {
  it("is pending while any amount remains", () => {
    const debt = split("A", 1000);
    expect(status(debt, [settle("x1", debt.id, 600)])).toBe("pending");
  });

  it("flips to paid exactly when remaining reaches zero", () => {
    const debt = split("A", 1000);
    const settlements = [settle("x1", debt.id, 600), settle("x2", debt.id, 400)];
    expect(status(debt, settlements)).toBe("paid");
  });

  it("is paid with no settlements on a zero amount debt", () => {
    expect(status(split("A", 0), [])).toBe("paid");
  });
});

describe("settlementError", () => {
  it("rejects non-finite amounts", () => {
    expect(settlementError(NaN, 100)).toBe("Enter a valid amount");
    expect(settlementError(Infinity, 100)).toBe("Enter a valid amount");
  });

  it("rejects zero and negative amounts", () => {
    expect(settlementError(0, 100)).toBe("Amount must be greater than 0");
    expect(settlementError(-1, 100)).toBe("Amount must be greater than 0");
  });

  it("rejects amounts above the remaining balance", () => {
    expect(settlementError(400, 300)).toBe("Amount exceeds the remaining balance");
  });

  it("accepts partial and full settlements", () => {
    expect(settlementError(150, 300)).toBeNull();
    expect(settlementError(300, 300)).toBeNull();
  });
});

describe("isValidSettlement / validateSettlement", () => {
  it("validates the same contract as settlementError", () => {
    expect(isValidSettlement(600, 1000)).toBe(true);
    expect(isValidSettlement(0, 1000)).toBe(false);
    expect(isValidSettlement(1001, 1000)).toBe(false);
    expect(isValidSettlement(NaN, 1000)).toBe(false);
  });

  it("returns ok with the amount for a valid partial settlement", () => {
    expect(validateSettlement(600, 1000)).toEqual({ ok: true });
    expect(validateSettlement(1000, 1000)).toEqual({ ok: true });
  });

  it("returns a UI-ready error for invalid settlements", () => {
    expect(validateSettlement(0, 1000)).toEqual({ ok: false, error: "Amount must be greater than 0" });
    expect(validateSettlement(1200, 1000)).toEqual({ ok: false, error: "Amount exceeds the remaining balance" });
  });
});

describe("net", () => {
  it("counts splits as receivable and ious by direction", () => {
    const debts = [
      split("A", 600),
      iou("A", 200, "to_pay"),
      iou("B", 1500, "to_receive"),
      iou("C", 100, "to_pay"),
    ];
    expect(net(debts)).toEqual([
      { personId: "A", net: 400 },
      { personId: "B", net: 1500 },
      { personId: "C", net: -100 },
    ]);
  });

  it("merges debts of the same person into one net number", () => {
    const debts = [split("A", 600), iou("A", 200, "to_pay"), split("A", 300)];
    const result = net(debts);
    expect(result).toEqual([{ personId: "A", net: 700 }]);
  });

  it("rounds per-person nets", () => {
    expect(net([iou("A", 0.1, "to_pay"), iou("A", 0.2, "to_pay")])).toEqual([{ personId: "A", net: -0.3 }]);
    expect(Object.is(net([iou("A", 0, "to_pay")])[0].net, -0)).toBe(false);
  });

  it("returns an empty list for no debts", () => {
    expect(net([])).toEqual([]);
  });
});

describe("grossTotals", () => {
  it("sums directions separately and never nets", () => {
    const debts = [
      split("A", 600),
      split("B", 400),
      iou("C", 1500, "to_receive"),
      iou("D", 100, "to_pay"),
      iou("A", 200, "to_pay"),
    ];
    expect(grossTotals(debts)).toEqual({ receivable: 2500, payable: 300 });
  });

  it("returns zero totals for no debts", () => {
    expect(grossTotals([])).toEqual({ receivable: 0, payable: 0 });
  });
});

describe("validateSplitDistribution", () => {
  it("accepts shares whose sum is below the expense", () => {
    expect(validateSplitDistribution(1000, [400, 300, 200]).ok).toBe(true);
    expect(userShare(1000, [400, 300, 200])).toBe(100);
  });

  it("accepts shares whose sum equals the expense exactly", () => {
    expect(validateSplitDistribution(1000, [333.33, 333.33, 333.34])).toEqual({ ok: true });
    expect(validateSplitDistribution(100, [100])).toEqual({ ok: true });
  });

  it("accepts a split where the user share is zero", () => {
    expect(validateSplitDistribution(1000, [1000])).toEqual({ ok: true });
    expect(userShare(1000, [1000])).toBe(0);
  });

  it("accepts float noise within rounding", () => {
    expect(validateSplitDistribution(0.3, [0.1, 0.2])).toEqual({ ok: true });
    expect(validateSplitDistribution(1000, [333.33, 333.33, 333.34])).toEqual({ ok: true });
  });

  it("rejects shares whose sum exceeds the expense", () => {
    expect(validateSplitDistribution(1000, [600, 500])).toEqual({
      ok: false,
      error: "Shares exceed the expense amount",
    });
    expect(validateSplitDistribution(100, [50, 50, 0.01]).ok).toBe(false);
  });
});

describe("userShare", () => {
  it("derives the remainder as the user share", () => {
    expect(userShare(1000, [400, 300, 200])).toBe(100);
    expect(userShare(1000, [250, 250, 250])).toBe(250);
  });

  it("returns zero when shares consume the full expense", () => {
    expect(userShare(1000, [1000])).toBe(0);
  });

  it("throws when shares exceed the expense", () => {
    expect(() => userShare(100, [60, 50])).toThrow(RangeError);
  });
});

describe("equalSplit", () => {
  it("distributes paise fairly", () => {
    expect(equalSplit(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(equalSplit(999.99, 2)).toEqual([500.0, 499.99]);
    expect(equalSplit(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("roundtrips sums to the rounded total", () => {
    for (const total of [100, 0.3, 1, 1234.57, 999.99]) {
      for (const count of [1, 2, 3, 5, 7]) {
        const shares = equalSplit(total, count);
        expect(shares).toHaveLength(count);
        const sum = shares.reduce((acc, share) => acc + share, 0);
        expect(roundMoney(sum)).toBe(roundMoney(total));
        expect(validateSplitDistribution(total, shares).ok).toBe(true);
      }
    }
  });

  it("rejects invalid counts", () => {
    expect(() => equalSplit(100, 0)).toThrow(RangeError);
    expect(() => equalSplit(100, -2)).toThrow(RangeError);
    expect(() => equalSplit(100, 2.5)).toThrow(RangeError);
  });
});

describe("overdueDays", () => {
  const today = "2026-08-09";

  it("prefers the due date over the expense date", () => {
    const debt = split("A", 500, { dueDate: "2026-08-01", expenseDate: "2026-07-25" });
    expect(overdueDays(debt, today)).toBe(8);
  });

  it("anchors to the expense date when no due date is set", () => {
    const debt = split("A", 500, { expenseDate: "2026-07-20" });
    expect(overdueDays(debt, today)).toBe(20);
  });

  it("clamps future anchors to zero", () => {
    const debt = split("A", 500, { dueDate: "2026-09-01" });
    expect(overdueDays(debt, today)).toBe(0);
  });

  it("returns zero for the anchor day itself", () => {
    const debt = split("A", 500, { dueDate: "2026-08-09" });
    expect(overdueDays(debt, today)).toBe(0);
  });

  it("returns zero when no date info exists", () => {
    expect(overdueDays(split("A", 500), today)).toBe(0);
  });

  it("accepts a Date object as today", () => {
    const debt = split("A", 500, { expenseDate: "2026-07-20" });
    expect(overdueDays(debt, new Date(2026, 7, 9))).toBe(20);
  });

  it("returns zero for unparsable date info", () => {
    const debt = split("A", 500, { dueDate: "not-a-date" });
    expect(overdueDays(debt, today)).toBe(0);
  });
});