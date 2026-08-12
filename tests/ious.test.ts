import { describe, expect, it } from "vitest";
import {
  isIouDirection,
  iouDirectionLabel,
  iouSettlementDirection,
  parseIouFormData,
} from "../src/lib/ious";

function form(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    person_id: "person-1",
    amount: "₹2,500",
    direction: "to_receive",
    date: "2026-08-01",
    note: "cab fare",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("parseIouFormData", () => {
  it("parses a valid IOU and rounds the amount", () => {
    const result = parseIouFormData(form());
    expect(result).toEqual({
      ok: true,
      input: {
        personId: "person-1",
        amount: 2500,
        direction: "to_receive",
        date: "2026-08-01",
        note: "cab fare",
      },
    });
  });

  it("rejects an empty form", () => {
    expect(parseIouFormData(new FormData())).toEqual({
      ok: false,
      error: "Choose a person",
    });
  });

  it("rejects a missing person id", () => {
    expect(parseIouFormData(form({ person_id: "  " }))).toEqual({
      ok: false,
      error: "Choose a person",
    });
  });

  it("rejects an invalid amount", () => {
    expect(parseIouFormData(form({ amount: "abc" }))).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
  });

  it("rejects a zero amount", () => {
    expect(parseIouFormData(form({ amount: "0" }))).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
  });

  it("rejects a negative amount", () => {
    expect(parseIouFormData(form({ amount: "-50" }))).toEqual({
      ok: false,
      error: "Enter a valid amount",
    });
  });

  it("rejects an unknown direction", () => {
    expect(parseIouFormData(form({ direction: "sideways" }))).toEqual({
      ok: false,
      error: "Choose a direction",
    });
  });

  it("rejects a missing direction field", () => {
    const formData = form();
    formData.delete("direction");
    expect(parseIouFormData(formData)).toEqual({
      ok: false,
      error: "Choose a direction",
    });
  });

  it("accepts the to_pay direction", () => {
    const result = parseIouFormData(form({ direction: "to_pay" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.direction).toBe("to_pay");
  });

  it("rejects an invalid date", () => {
    expect(parseIouFormData(form({ date: "2026-13-45" }))).toEqual({
      ok: false,
      error: "Enter a valid date",
    });
  });

  it("defaults an empty date to today", () => {
    const result = parseIouFormData(form({ date: "" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults a missing date field to today", () => {
    const formData = form();
    formData.delete("date");
    const result = parseIouFormData(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("trims an empty note to null", () => {
    const result = parseIouFormData(form({ note: "   " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.note).toBeNull();
  });

  it("accepts a missing note field", () => {
    const formData = form();
    formData.delete("note");
    const result = parseIouFormData(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.note).toBeNull();
  });

  it("rejects an oversized note", () => {
    const result = parseIouFormData(form({ note: "x".repeat(501) }));
    expect(result).toEqual({
      ok: false,
      error: "Keep the note under 500 characters",
    });
  });
});

describe("isIouDirection", () => {
  it("accepts both directions", () => {
    expect(isIouDirection("to_receive")).toBe(true);
    expect(isIouDirection("to_pay")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isIouDirection("")).toBe(false);
    expect(isIouDirection("To_Pay")).toBe(false);
  });
});

describe("iouDirectionLabel", () => {
  it("labels both directions", () => {
    expect(iouDirectionLabel("to_receive")).toBe("They owe you");
    expect(iouDirectionLabel("to_pay")).toBe("You owe them");
  });
});

describe("iouSettlementDirection", () => {
  it("mirrors the IOU direction onto the settlement", () => {
    expect(iouSettlementDirection("to_receive")).toBe("to_receive");
    expect(iouSettlementDirection("to_pay")).toBe("to_pay");
  });
});