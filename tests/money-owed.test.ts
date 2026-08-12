import { describe, expect, it } from "vitest";
import {
  buildDebtEntries,
  daysPendingLabel,
  debtContextLabel,
  sortDebtEntries,
  totalRemaining,
  type DebtEntry,
  type DebtSource,
} from "../src/lib/money-owed";

const TODAY = "2026-08-10";

function source(overrides: Partial<DebtSource> = {}): DebtSource {
  return {
    id: "debt-1",
    personId: "person-1",
    personName: "Rahul",
    phone: "+91 98765 43210",
    amount: 1000,
    type: "iou",
    direction: "to_receive",
    expenseDate: "2026-08-01",
    contextLabel: "cab fare",
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function withSettlements(dollars: number) {
  return source({ amount: dollars });
}

describe("buildDebtEntries", () => {
  it("maps a split to the to_receive side with the expense date anchor", () => {
    const [entry] = buildDebtEntries(
      [
        source({
          id: "split-1",
          type: "split",
          dueDate: undefined,
          expenseDate: "2026-08-02",
          contextLabel: "Dinner at ABC",
          expenseId: "exp-1",
        }),
      ],
      new Map(),
      TODAY,
    );
    expect(entry).toMatchObject({
      debtId: "split-1",
      debtType: "split",
      direction: "to_receive",
      amount: 1000,
      remaining: 1000,
      status: "pending",
      anchorDate: "2026-08-02",
      contextLabel: "Dinner at ABC",
      expenseId: "exp-1",
      phone: "+91 98765 43210",
    });
  });

  it("maps an IOU to its own direction side", () => {
    const entries = buildDebtEntries(
      [
        source({ id: "iou-1", type: "iou", direction: "to_pay" }),
        source({ id: "iou-2", type: "iou", direction: "to_receive" }),
      ],
      new Map(),
      TODAY,
    );
    expect(entries.map((entry) => entry.direction).sort()).toEqual([
      "to_pay",
      "to_receive",
    ]);
  });

  it("keeps both directions for the same person simultaneously", () => {
    const entries = buildDebtEntries(
      [
        source({ id: "iou-a", type: "iou", direction: "to_receive", amount: 500 }),
        source({ id: "iou-b", type: "iou", direction: "to_pay", amount: 300 }),
      ],
      new Map(),
      TODAY,
    );
    expect(entries).toHaveLength(2);
    const receivable = entries.find((entry) => entry.direction === "to_receive");
    const payable = entries.find((entry) => entry.direction === "to_pay");
    expect(receivable?.remaining).toBe(500);
    expect(payable?.remaining).toBe(300);
  });

  it("subtracts settlements from the remaining amount", () => {
    const [entry] = buildDebtEntries(
      [withSettlements(1000)],
      new Map([["debt-1", [400, 200.5]]]),
      TODAY,
    );
    expect(entry.remaining).toBe(399.5);
    expect(entry.status).toBe("pending");
  });

  it("marks a fully settled debt as paid with zero remaining", () => {
    const [entry] = buildDebtEntries(
      [withSettlements(1000)],
      new Map([["debt-1", [600, 400]]]),
      TODAY,
    );
    expect(entry.remaining).toBe(0);
    expect(entry.status).toBe("paid");
  });

  it("accumulates settlement amounts with rounding at each step", () => {
    const [entry] = buildDebtEntries(
      [source({ amount: 0.1 })],
      new Map([["debt-1", [0.05, 0.05, 0.05]]]),
      TODAY,
    );
    expect(entry.remaining).toBe(0);
  });

  it("anchors days pending to the due date when set", () => {
    const [entry] = buildDebtEntries(
      [
        source({
          id: "split-1",
          type: "split",
          dueDate: "2026-08-01",
          expenseDate: "2026-08-05",
        }),
      ],
      new Map(),
      TODAY,
    );
    expect(entry.daysPending).toBe(9);
    expect(entry.anchorDate).toBe("2026-08-01");
  });

  it("falls back to the expense date when no due date exists", () => {
    const [entry] = buildDebtEntries(
      [
        source({
          id: "split-1",
          type: "split",
          dueDate: undefined,
          expenseDate: "2026-08-02",
        }),
      ],
      new Map(),
      TODAY,
    );
    expect(entry.daysPending).toBe(8);
    expect(entry.anchorDate).toBe("2026-08-02");
  });

  it("uses the IOU date as the anchor", () => {
    const [entry] = buildDebtEntries(
      [source({ id: "iou-1", type: "iou", expenseDate: "2026-08-07" })],
      new Map(),
      TODAY,
    );
    expect(entry.daysPending).toBe(3);
    expect(entry.anchorDate).toBe("2026-08-07");
  });

  it("clamps future due dates to zero days", () => {
    const [entry] = buildDebtEntries(
      [
        source({
          id: "split-1",
          type: "split",
          dueDate: "2026-08-15",
        }),
      ],
      new Map(),
      TODAY,
    );
    expect(entry.daysPending).toBe(0);
  });

  it("sorts by anchor date descending then created_at descending", () => {
    const entries = buildDebtEntries(
      [
        source({ id: "a", expenseDate: "2026-08-01", createdAt: "2026-08-01T10:00:00Z" }),
        source({ id: "b", expenseDate: "2026-08-05", createdAt: "2026-08-05T10:00:00Z" }),
        source({
          id: "c",
          expenseDate: "2026-08-03",
          createdAt: "2026-08-03T09:00:00Z",
        }),
      ],
      new Map(),
      TODAY,
    );
    expect(entries.map((entry) => entry.debtId)).toEqual(["b", "c", "a"]);
  });

  it("breaks anchor-date ties by created_at descending", () => {
    const entries = buildDebtEntries(
      [
        source({ id: "a", expenseDate: "2026-08-01", createdAt: "2026-08-01T10:00:00Z" }),
        source({ id: "b", expenseDate: "2026-08-01", createdAt: "2026-08-01T12:00:00Z" }),
      ],
      new Map(),
      TODAY,
    );
    expect(entries.map((entry) => entry.debtId)).toEqual(["b", "a"]);
  });
});

describe("sortDebtEntries", () => {
  it("returns a sorted copy without mutating the input", () => {
    const given: DebtEntry[] = [
      {
        debtId: "old",
        debtType: "iou",
        personId: "p",
        personName: "R",
        phone: null,
        amount: 100,
        remaining: 100,
        status: "pending",
        direction: "to_receive",
        daysPending: 30,
        anchorDate: "2026-07-01",
        contextLabel: null,
        createdAt: "2026-07-01T00:00:00Z",
      },
      {
        debtId: "new",
        debtType: "iou",
        personId: "p",
        personName: "R",
        phone: null,
        amount: 200,
        remaining: 200,
        status: "pending",
        direction: "to_pay",
        daysPending: 0,
        anchorDate: "2026-08-01",
        contextLabel: null,
        createdAt: "2026-08-01T00:00:00Z",
      },
    ];
    const sorted = sortDebtEntries(given);
    expect(sorted.map((entry) => entry.debtId)).toEqual(["new", "old"]);
    expect(given.map((entry) => entry.debtId)).toEqual(["old", "new"]);
  });
});

describe("daysPendingLabel", () => {
  it("labels zero as due today", () => {
    expect(daysPendingLabel(0)).toBe("Due today");
  });

  it("labels one day as singular", () => {
    expect(daysPendingLabel(1)).toBe("1 day pending");
  });

  it("labels multiple days as plural", () => {
    expect(daysPendingLabel(7)).toBe("7 days pending");
  });
});

describe("totalRemaining", () => {
  it("sums remaining amounts with rounding at every step", () => {
    const entries: DebtEntry[] = [
      { ...entry(), remaining: 0.1 },
      { ...entry(), remaining: 0.1 },
      { ...entry(), remaining: 0.1 },
    ];
    expect(totalRemaining(entries)).toBe(0.3);
  });

  it("is zero for an empty list", () => {
    expect(totalRemaining([])).toBe(0);
  });

  it("is zero when everything is settled", () => {
    const entries: DebtEntry[] = [
      { ...entry(), remaining: 0 },
      { ...entry(), remaining: 0 },
    ];
    expect(totalRemaining(entries)).toBe(0);
  });
});

describe("debtContextLabel", () => {
  it("prefers a stored context label", () => {
    expect(debtContextLabel({ ...entry(), contextLabel: "Dinner at ABC" })).toBe(
      "Dinner at ABC",
    );
  });

  it("falls back to a manual IOU label", () => {
    expect(debtContextLabel({ ...entry(), debtType: "iou", contextLabel: null })).toBe(
      "Manual IOU",
    );
  });

  it("falls back to a split share label", () => {
    expect(debtContextLabel({ ...entry(), debtType: "split", contextLabel: null })).toBe(
      "Split share",
    );
  });
});

function entry(): DebtEntry {
  return {
    debtId: "debt-1",
    debtType: "iou",
    personId: "person-1",
    personName: "Rahul",
    phone: null,
    amount: 1000,
    remaining: 1000,
    status: "pending",
    direction: "to_receive",
    daysPending: 0,
    anchorDate: "2026-08-01",
    contextLabel: null,
    createdAt: "2026-08-01T00:00:00Z",
  };
}