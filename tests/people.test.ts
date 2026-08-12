import { describe, expect, it } from "vitest";
import {
  cleanPersonFields,
  deletePersonRefusal,
  filterPeopleBySearch,
  findDuplicatePerson,
  matchesPersonSearch,
  normalizeName,
  normalizePhone,
  sortPeopleByName,
  validatePersonFields,
} from "../src/lib/people";

describe("normalizeName / normalizePhone", () => {
  it("trims and case-folds names", () => {
    expect(normalizeName("  Rahul Gupta ")).toBe("rahul gupta");
    expect(normalizeName("RAHUL")).toBe("rahul");
  });

  it("strips every non-digit from phone numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("919876543210");
    expect(normalizePhone("98765-43210")).toBe("9876543210");
    expect(normalizePhone("abc")).toBe("");
    expect(normalizePhone("")).toBe("");
  });
});

describe("cleanPersonFields", () => {
  it("trims name and email and reduces phone to digits", () => {
    expect(cleanPersonFields("  Rahul ", "+91 98765 43210", "  R@x.co ")).toEqual({
      name: "Rahul",
      phone: "919876543210",
      email: "R@x.co",
    });
  });

  it("leaves empty optionals as empty strings", () => {
    expect(cleanPersonFields("Rahul", "   ", "  ")).toEqual({
      name: "Rahul",
      phone: "",
      email: "",
    });
  });
});

describe("validatePersonFields", () => {
  const valid = { name: "Rahul", phone: "+91 98765 43210", email: "rahul@example.com" };

  it("accepts a fully filled person", () => {
    expect(validatePersonFields(valid)).toBeNull();
  });

  it("accepts a person with only a name", () => {
    expect(validatePersonFields({ name: "Priya", phone: "", email: "" })).toBeNull();
  });

  it("requires a non-blank name", () => {
    expect(validatePersonFields({ ...valid, name: "   " })).toBe("Enter a name");
  });

  it("caps the name length", () => {
    expect(validatePersonFields({ ...valid, name: "x".repeat(61) })).toBe(
      "Keep the name under 60 characters",
    );
  });

  it("rejects phones without any digit", () => {
    expect(validatePersonFields({ ...valid, phone: "call me" })).toBe(
      "Enter a valid phone number",
    );
  });

  it("caps the phone at 15 digits", () => {
    expect(validatePersonFields({ ...valid, phone: "1".repeat(16) })).toBe(
      "Phone numbers can have up to 15 digits",
    );
  });

  it("rejects malformed emails", () => {
    expect(validatePersonFields({ ...valid, email: "not-an-email" })).toBe(
      "Enter a valid email address",
    );
  });

  it("rejects oversized emails", () => {
    expect(
      validatePersonFields({ ...valid, email: `${"a".repeat(300)}@x.co` }),
    ).toBe("Email is too long");
  });
});

describe("findDuplicatePerson", () => {
  const people = [
    { id: "1", name: "Rahul Gupta", phone: "919876543210", email: null },
    { id: "2", name: "Priya", phone: null, email: null },
    { id: "3", name: "rahul gupta", phone: "+91-98765-43210", email: null },
  ];

  it("returns the matching person for the same name and phone pair", () => {
    const match = findDuplicatePerson(
      { name: "  RAHUL GUPTA ", phone: "+91 98765 43210", email: "" },
      people,
    );
    expect(match?.id).toBe("1");
  });

  it("returns the lowest id when several rows match (deterministic)", () => {
    const match = findDuplicatePerson(
      { name: "rahul gupta", phone: "919876543210", email: "" },
      people,
    );
    expect(match?.id).toBe("1");
  });

  it("never dedupes on name alone when phone is empty", () => {
    expect(
      findDuplicatePerson({ name: "Priya", phone: "", email: "" }, people),
    ).toBeNull();
    expect(
      findDuplicatePerson({ name: "Rahul Gupta", phone: "", email: "" }, people),
    ).toBeNull();
  });

  it("ignores people with an empty stored phone", () => {
    expect(
      findDuplicatePerson({ name: "Priya", phone: "9876543210", email: "" }, people),
    ).toBeNull();
  });

  it("returns null when the phone differs", () => {
    expect(
      findDuplicatePerson({ name: "Rahul Gupta", phone: "911111111111", email: "" }, people),
    ).toBeNull();
  });

  it("excludes the person being edited", () => {
    const single = [people[0]];
    expect(
      findDuplicatePerson({ name: "Rahul Gupta", phone: "919876543210", email: "" }, single, "1"),
    ).toBeNull();
  });
});

describe("sortPeopleByName", () => {
  it("sorts case-insensitively and deterministically", () => {
    const sorted = sortPeopleByName([
      { id: "3", name: "Bob", phone: null, email: null },
      { id: "1", name: "ada", phone: null, email: null },
      { id: "2", name: "Alice", phone: null, email: null },
      { id: "4", name: "Zoe", phone: null, email: null },
    ]);
    expect(sorted.map((person) => person.name)).toEqual(["ada", "Alice", "Bob", "Zoe"]);
  });

  it("breaks exact name ties by id", () => {
    const sorted = sortPeopleByName([
      { id: "b", name: "Zoe", phone: null, email: null },
      { id: "a", name: "Zoe", phone: null, email: null },
    ]);
    expect(sorted.map((person) => person.id)).toEqual(["a", "b"]);
  });
});

describe("matchesPersonSearch / filterPeopleBySearch", () => {
  const person = { id: "1", name: "Rahul Gupta", phone: "919876543210", email: "rahul@x.co" };

  it("matches everything on an empty query", () => {
    expect(matchesPersonSearch(person, "   ")).toBe(true);
  });

  it("matches name case-insensitively by substring", () => {
    expect(matchesPersonSearch(person, "rahul")).toBe(true);
    expect(matchesPersonSearch(person, "gupta")).toBe(true);
    expect(matchesPersonSearch(person, "sam")).toBe(false);
  });

  it("matches email by substring", () => {
    expect(matchesPersonSearch(person, "x.co")).toBe(true);
  });

  it("matches phone digits even against unformatted input", () => {
    expect(matchesPersonSearch(person, "9876")).toBe(true);
    expect(matchesPersonSearch(person, "+91 98765")).toBe(true);
  });

  it("does not match when the phone query has no digits", () => {
    expect(matchesPersonSearch(person, "phone")).toBe(false);
  });

  it("filters a list while keeping the input order", () => {
    const list = [
      person,
      { id: "2", name: "Priya", phone: null, email: null },
      { id: "3", name: "Rahul 2", phone: "9876543210", email: null },
    ];
    const filtered = filterPeopleBySearch(list, "9876");
    expect(filtered.map((entry) => entry.id)).toEqual(["1", "3"]);
    expect(filterPeopleBySearch(list, "")).toHaveLength(3);
  });
});

describe("deletePersonRefusal", () => {
  const none = { splits: 0, ious: 0, settlements: 0, reminders: 0 };

  it("allows deletion when no debt references exist", () => {
    expect(deletePersonRefusal(none)).toBeNull();
  });

  it("refuses and lists each referencing table in a fixed order", () => {
    expect(
      deletePersonRefusal({ splits: 2, ious: 0, settlements: 0, reminders: 0 }),
    ).toBe("Can't delete — used in 2 splits");
    expect(
      deletePersonRefusal({ ...none, ious: 1 }),
    ).toBe("Can't delete — used in 1 IOU");
    expect(
      deletePersonRefusal({ splits: 1, ious: 2, settlements: 3, reminders: 4 }),
    ).toBe("Can't delete — used in 1 split, 2 IOUs, 3 settlements, 4 reminders");
  });

  it("stays deterministic regardless of input key order", () => {
    expect(
      deletePersonRefusal({ reminders: 1, settlements: 0, ious: 0, splits: 0 }),
    ).toBe("Can't delete — used in 1 reminder");
  });
});