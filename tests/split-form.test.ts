import { describe, expect, it } from "vitest";
import {
  addSplitPerson,
  distributeSplitRows,
  initialSplitRows,
  removeSplitPerson,
  setSplitAmount,
  setSplitDueDate,
  splitFormError,
  splitInputsFromFormData,
  splitSummary,
  validateSplitInputs,
  type SplitRow,
} from "../src/lib/split-form";

function addAll(rows: SplitRow[], ...personIds: string[]): SplitRow[] {
  let next = rows;
  for (const personId of personIds) next = addSplitPerson(next, personId);
  return next;
}

describe("distributeSplitRows", () => {
  it("distributes an empty set to an empty set", () => {
    expect(distributeSplitRows(3000, [])).toEqual([]);
  });

  it("auto-distributes equally across the current set with paise fairness", () => {
    const rows = distributeSplitRows(3000, addAll([], "p1", "p2", "p3"));
    expect(rows.map((row) => row.amount)).toEqual([1000, 1000, 1000]);
    const paise = distributeSplitRows(100, addAll([], "p1", "p2", "p3"));
    expect(paise.map((row) => row.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  it("re-derives every row when a participant is added or removed while auto", () => {
    const two = distributeSplitRows(1000, addAll([], "p1", "p2"));
    expect(two.map((row) => row.amount)).toEqual([500, 500]);
    const three = distributeSplitRows(1000, addSplitPerson(two, "p3"));
    expect(three.map((row) => row.amount)).toEqual([333.34, 333.33, 333.33]);
    const one = distributeSplitRows(1000, removeSplitPerson(three, "p1"));
    expect(one.map((row) => row.amount)).toEqual([500, 500]);
  });

  it("leaves amounts untouched once any row is edited manually", () => {
    const auto = distributeSplitRows(3000, addAll([], "p1", "p2", "p3"));
    const edited = setSplitAmount(auto, "p1", "1500");
    const remaining = distributeSplitRows(3000, edited);
    expect(remaining.map((row) => row.amount)).toEqual([1500, 1000, 1000]);
  });

  it("keeps new rows blank when the split is already custom", () => {
    const distributed = distributeSplitRows(3000, addAll([], "p1", "p2"));
    const custom = setSplitAmount(distributed, "p1", "2000");
    const withNew = addSplitPerson(custom, "p3");
    expect(withNew.find((row) => row.personId === "p3")?.amount).toBeNull();
    expect(withNew.find((row) => row.personId === "p1")?.amount).toBe(2000);
    expect(withNew.find((row) => row.personId === "p2")?.amount).toBe(1500);
  });
});

describe("addSplitPerson / removeSplitPerson", () => {
  it("appends a person once and refuses duplicates", () => {
    let rows = addAll([], "p1");
    rows = addSplitPerson(rows, "p1");
    expect(rows).toHaveLength(1);
    rows = addSplitPerson(rows, "p2");
    expect(rows.map((entry) => entry.personId)).toEqual(["p1", "p2"]);
    expect(rows[1]).toMatchObject({ amount: null, amountText: "", custom: false });
  });

  it("removes only the named person and empties the set completely", () => {
    let rows = addAll([], "p1", "p2");
    rows = removeSplitPerson(rows, "p1");
    expect(rows.map((entry) => entry.personId)).toEqual(["p2"]);
    rows = removeSplitPerson(rows, "p2");
    expect(rows).toEqual([]);
    expect(removeSplitPerson(rows, "missing")).toEqual([]);
  });
});

describe("setSplitAmount / setSplitDueDate", () => {
  it("parses the typed value and marks the row custom without touching others", () => {
    const rows = distributeSplitRows(3000, addAll([], "p1", "p2"));
    const edited = setSplitAmount(rows, "p1", "₹ 1,500.00");
    expect(edited[0]).toMatchObject({ amount: 1500, amountText: "₹ 1,500.00", custom: true });
    expect(edited[1]).toEqual(rows[1]);
  });

  it("turns invalid and negative input into null amounts, keeping the raw text", () => {
    const rows = addAll([], "p1");
    expect(setSplitAmount(rows, "p1", "-5")[0]).toMatchObject({ amount: null, amountText: "-5" });
    expect(setSplitAmount(rows, "p1", "abc")[0].amount).toBeNull();
    expect(setSplitAmount(rows, "p1", "")[0].amount).toBeNull();
    expect(setSplitAmount(rows, "p1", "0")[0].amount).toBe(0);
  });

  it("stores the due date on the row", () => {
    const rows = setSplitDueDate(addAll([], "p1"), "p1", "2026-09-01");
    expect(rows[0].dueDate).toBe("2026-09-01");
    expect(setSplitDueDate(rows, "p1", "")[0].dueDate).toBe("");
  });

  it("leaves other rows untouched when setting a due date", () => {
    const rows = distributeSplitRows(1000, addAll([], "p1", "p2"));
    const edited = setSplitDueDate(rows, "p1", "2026-09-01");
    expect(edited[1]).toEqual(rows[1]);
    expect(edited.map((entry) => entry.dueDate)).toEqual(["2026-09-01", ""]);
  });
});

describe("initialSplitRows", () => {
  it("restores saved shares as custom rows with concrete values", () => {
    const rows = initialSplitRows([
      { id: "s1", personId: "p1", amount: 1500, dueDate: "2026-09-01", expenseDate: "2026-08-01" },
      { id: "s2", personId: "p2", amount: 1000, expenseDate: "2026-08-01" },
    ]);
    expect(rows[0]).toMatchObject({
      personId: "p1",
      amount: 1500,
      amountText: "1500.00",
      dueDate: "2026-09-01",
      custom: true,
    });
    expect(rows[1]).toMatchObject({ personId: "p2", dueDate: "", custom: true });
  });

  it("returns an empty list for an un-split expense", () => {
    expect(initialSplitRows([])).toEqual([]);
  });
});

describe("splitSummary", () => {
  it("derives the user share as the remainder for an open split", () => {
    const rows = setSplitAmount(distributeSplitRows(3000, addAll([], "p1", "p2")), "p1", "1200");
    const summary = splitSummary(3000, rows);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.total).toBe(2700);
      expect(summary.userShare).toBe(300);
    }
  });

  it("allows a zero user share when shares consume the full expense", () => {
    const one = distributeSplitRows(1000, addAll([], "p1"));
    const summary = splitSummary(1000, one);
    expect(summary).toEqual({ ok: true, total: 1000, userShare: 0 });
  });

  it("reports the over-total error instead of a negative share", () => {
    const rows = setSplitAmount(distributeSplitRows(3000, addAll([], "p1", "p2")), "p1", "1600");
    const summary = splitSummary(3000, rows);
    expect(summary).toEqual({
      ok: false,
      total: 3100,
      userShare: null,
      error: "Shares exceed the expense amount",
    });
  });

  it("guards against unparsable and negative expense amounts", () => {
    const rows = addAll([], "p1");
    expect(splitSummary(Number.NaN, rows).ok).toBe(false);
    const negative = splitSummary(-100, rows);
    expect(negative).toEqual({ ok: false, total: 0, userShare: null, error: "Enter a valid amount" });
  });

  it("treats blank amounts as zero for the live preview", () => {
    const summary = splitSummary(1000, addAll([], "p1", "p2"));
    expect(summary.ok && summary.userShare).toBe(1000);
  });
});

describe("splitFormError", () => {
  it("returns null for no split and for a valid split", () => {
    expect(splitFormError(3000, [])).toBeNull();
    const rows = distributeSplitRows(3000, addAll([], "p1", "p2", "p3"));
    expect(splitFormError(3000, rows)).toBeNull();
  });

  it("rejects blank and invalid row amounts", () => {
    const blank = addAll([], "p1");
    expect(splitFormError(1000, blank)).toBe("Enter an amount for each person");
    const invalid = setSplitAmount(blank, "p1", "-5");
    expect(splitFormError(1000, invalid)).toBe("Enter valid amounts");
  });

  it("rejects malformed due dates", () => {
    const rows = setSplitDueDate(distributeSplitRows(1000, addAll([], "p1")), "p1", "09/08/2026");
    expect(splitFormError(1000, rows)).toBe("Enter a valid due date");
  });

  it("rejects shares above the expense total", () => {
    const rows = setSplitAmount(distributeSplitRows(1000, addAll([], "p1", "p2")), "p1", "600");
    expect(splitFormError(1000, rows)).toBe("Shares exceed the expense amount");
  });

  it("guards against an unparsable expense amount", () => {
    const rows = distributeSplitRows(1000, addAll([], "p1"));
    expect(splitFormError(Number.NaN, rows)).toBe("Enter a valid amount");
    expect(splitFormError(-100, rows)).toBe("Enter a valid amount");
  });
});

describe("splitInputsFromFormData", () => {
  function formData(entries: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(entries)) form.set(key, value);
    return form;
  }

  it("returns zero rows for an empty form", () => {
    expect(splitInputsFromFormData(new FormData())).toEqual({ ok: true, rows: [] });
  });

  it("parses indexed rows, rounding amounts and normalising due dates", () => {
    const result = splitInputsFromFormData(
      formData({
        split_person_ids_0: "p1",
        split_amounts_0: "₹ 1,500.00",
        split_due_dates_0: "2026-09-01",
        split_person_ids_1: "p2",
        split_amounts_1: "500.005",
        split_due_dates_1: "",
        split_person_ids_2: "p3",
        split_amounts_2: "1000",
        split_due_dates_2: "   ",
      }),
    );
    expect(result).toEqual({
      ok: true,
      rows: [
        { personId: "p1", amount: 1500, dueDate: "2026-09-01" },
        { personId: "p2", amount: 500.01, dueDate: null },
        { personId: "p3", amount: 1000, dueDate: null },
      ],
    });
  });

  it("rejects rows without a person id or with a bad amount", () => {
    expect(
      splitInputsFromFormData(formData({ split_person_ids_0: "  ", split_amounts_0: "100" })),
    ).toEqual({ ok: false, error: "Choose a person for every split" });
    expect(
      splitInputsFromFormData(formData({ split_person_ids_0: "p1", split_amounts_0: "nope" })),
    ).toEqual({ ok: false, error: "Enter a valid amount for every split" });
    expect(
      splitInputsFromFormData(formData({ split_person_ids_0: "p1" })),
    ).toEqual({ ok: false, error: "Enter a valid amount for every split" });
  });

  it("rejects non-string person ids", () => {
    const form = new FormData();
    form.set("split_person_ids_0", new File(["x"], "x.txt"));
    form.set("split_amounts_0", "100");
    form.set("split_due_dates_0", "");
    expect(splitInputsFromFormData(form)).toEqual({
      ok: false,
      error: "Choose a person for every split",
    });
  });

  it("ignores gaps: iteration stops at the first missing person id", () => {
    const result = splitInputsFromFormData(
      formData({
        split_person_ids_0: "p1",
        split_amounts_0: "100",
        split_person_ids_2: "p2",
        split_amounts_2: "200",
      }),
    );
    expect(result.ok && result.rows).toEqual([{ personId: "p1", amount: 100, dueDate: null }]);
  });
});

describe("validateSplitInputs", () => {
  it("accepts a valid split and rejects duplicates", () => {
    expect(
      validateSplitInputs(1000, [
        { personId: "p1", amount: 600, dueDate: "2026-09-01" },
        { personId: "p2", amount: 400, dueDate: null },
      ]),
    ).toEqual({
      ok: true,
      rows: [
        { personId: "p1", amount: 600, dueDate: "2026-09-01" },
        { personId: "p2", amount: 400, dueDate: null },
      ],
    });
    expect(
      validateSplitInputs(1000, [
        { personId: "p1", amount: 500, dueDate: null },
        { personId: "p1", amount: 500, dueDate: null },
      ]),
    ).toEqual({ ok: false, error: "A person can appear only once in a split" });
  });

  it("rejects negative, unrounded and malformed amounts", () => {
    expect(validateSplitInputs(1000, [{ personId: "p1", amount: -5, dueDate: null }])).toEqual({
      ok: false,
      error: "Enter valid amounts",
    });
    expect(validateSplitInputs(1000, [{ personId: "p1", amount: 333.333, dueDate: null }])).toEqual({
      ok: false,
      error: "Enter valid amounts",
    });
  });

  it("rejects malformed due dates and over-total shares", () => {
    expect(validateSplitInputs(1000, [{ personId: "p1", amount: 100, dueDate: "09/08/2026" }])).toEqual(
      { ok: false, error: "Enter a valid due date" },
    );
    expect(
      validateSplitInputs(1000, [
        { personId: "p1", amount: 600, dueDate: null },
        { personId: "p2", amount: 500, dueDate: null },
      ]),
    ).toEqual({ ok: false, error: "Shares exceed the expense amount" });
  });

  it("accepts an empty split with a zero user share", () => {
    expect(validateSplitInputs(300, [])).toEqual({ ok: true, rows: [] });
    expect(
      validateSplitInputs(1000, [{ personId: "p1", amount: 1000, dueDate: null }]),
    ).toEqual({ ok: true, rows: [{ personId: "p1", amount: 1000, dueDate: null }] });
  });
});

describe("issue 06 cross-checks", () => {
  it("3-way ₹3,000 dinner: each ₹1,000 with a ₹0 user share", () => {
    const rows = distributeSplitRows(3000, addAll([], "p1", "p2", "p3"));
    expect(rows.map((entry) => entry.amount)).toEqual([1000, 1000, 1000]);
    const summary = splitSummary(3000, rows);
    expect(summary.ok && summary.userShare).toBe(0);
    expect(splitFormError(3000, rows)).toBeNull();
  });

  it("custom ₹1,500 / ₹500 / ₹1,000 shares sum to the total", () => {
    let rows = addAll([], "p1", "p2", "p3");
    rows = setSplitAmount(rows, "p1", "1500");
    rows = setSplitAmount(rows, "p2", "500");
    rows = setSplitAmount(rows, "p3", "1000");
    const summary = splitSummary(3000, rows);
    expect(summary.ok && summary.userShare).toBe(0);
    expect(splitFormError(3000, rows)).toBeNull();
  });

  it("re-checks the remainder after an unequal edit", () => {
    let rows = distributeSplitRows(3000, addAll([], "p1", "p2", "p3"));
    rows = setSplitAmount(rows, "p1", "1500");
    const afterFirstEdit = splitSummary(3000, rows);
    expect(afterFirstEdit.ok).toBe(false);
    expect(afterFirstEdit.userShare).toBeNull();
    rows = setSplitAmount(rows, "p2", "500");
    const balanced = splitSummary(3000, rows);
    expect(balanced.ok && balanced.userShare).toBe(0);
    expect(splitFormError(3000, rows)).toBeNull();
    const bumped = setSplitAmount(rows, "p2", "1200");
    expect(splitSummary(3000, bumped).ok).toBe(false);
    expect(splitFormError(3000, bumped)).toBe("Shares exceed the expense amount");
  });
});