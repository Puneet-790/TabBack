import { describe, expect, it } from "vitest";
import { reminderDraft, reminderTimeLabel, waMeLink } from "../src/lib/reminders";

describe("reminderDraft", () => {
  it("renders the friendly template with person, amount and context", () => {
    expect(reminderDraft("Rahul", 500, "Dinner at ABC")).toBe(
      "Hi Rahul! Just a gentle nudge on ₹500.00 from Dinner at ABC — let me know when it's on its way 🙂",
    );
  });

  it("omits the context clause when there is no related description or note", () => {
    expect(reminderDraft("Rahul", 500, null)).toBe(
      "Hi Rahul! Just a gentle nudge on ₹500.00 — let me know when it's on its way 🙂",
    );
  });

  it("formats the amount in ₹ with exactly two decimals", () => {
    expect(reminderDraft("Rahul", 1234.5, null)).toContain("₹1,234.50");
  });

  it("uses Indian grouping for large amounts", () => {
    expect(reminderDraft("Rahul", 1234567.89, null)).toContain("₹12,34,567.89");
  });

  it("contains no aggressive words", () => {
    const draft = reminderDraft("Rahul", 500, "Dinner at ABC");
    expect(draft).toMatch(/gentle nudge/i);
    expect(draft).not.toMatch(/pay (now|up)|due|must|demand/i);
  });
});

describe("waMeLink", () => {
  it("builds a wa.me link with the encoded message", () => {
    expect(waMeLink("+91 98765 43210", "Hi Rahul! Just a gentle nudge on ₹500.00")).toBe(
      "https://wa.me/919876543210?text=Hi%20Rahul!%20Just%20a%20gentle%20nudge%20on%20%E2%82%B9500.00",
    );
  });

  it("returns null when the phone has no digits", () => {
    expect(waMeLink("", "nudge")).toBeNull();
    expect(waMeLink("not-a-number", "nudge")).toBeNull();
  });

  it("keeps digits already stored in plain form", () => {
    expect(waMeLink("919876543210", "nudge")).toBe(
      "https://wa.me/919876543210?text=nudge",
    );
  });
});

describe("reminderTimeLabel", () => {
  it("formats a valid timestamp", () => {
    const label = reminderTimeLabel("2026-08-10T09:05:00.000Z");
    expect(label).toContain("2026");
    expect(label).toContain("Aug");
  });

  it("passes through an unparseable value", () => {
    expect(reminderTimeLabel("nope")).toBe("nope");
  });
});