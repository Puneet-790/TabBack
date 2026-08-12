export const MAX_PERSON_NAME_LENGTH = 60;
export const MAX_PERSON_PHONE_LENGTH = 15;
export const MAX_PERSON_EMAIL_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface PersonFields {
  name: string;
  phone: string;
  email: string;
}

export interface PersonReferences {
  splits: number;
  ious: number;
  settlements: number;
  reminders: number;
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function cleanPersonFields(
  name: string,
  phone: string,
  email: string,
): PersonFields {
  return {
    name: name.trim(),
    phone: normalizePhone(phone),
    email: email.trim(),
  };
}

export function validatePersonFields(fields: PersonFields): string | null {
  const name = fields.name.trim();
  if (name.length === 0) return "Enter a name";
  if (name.length > MAX_PERSON_NAME_LENGTH) {
    return `Keep the name under ${MAX_PERSON_NAME_LENGTH} characters`;
  }
  const phone = normalizePhone(fields.phone);
  if (fields.phone.trim().length > 0 && phone.length === 0) {
    return "Enter a valid phone number";
  }
  if (phone.length > MAX_PERSON_PHONE_LENGTH) {
    return `Phone numbers can have up to ${MAX_PERSON_PHONE_LENGTH} digits`;
  }
  const email = fields.email.trim();
  if (email.length === 0) return null;
  if (email.length > MAX_PERSON_EMAIL_LENGTH) return "Email is too long";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address";
  return null;
}

export function findDuplicatePerson(
  fields: PersonFields,
  people: readonly Person[],
  excludeId?: string,
): Person | null {
  const name = normalizeName(fields.name);
  const phone = normalizePhone(fields.phone);
  if (name.length === 0 || phone.length === 0) return null;
  const matches = people
    .filter((person) => person.id !== excludeId)
    .filter((person) => {
      const otherPhone = normalizePhone(person.phone ?? "");
      return normalizeName(person.name) === name && otherPhone === phone;
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return matches[0] ?? null;
}

const REFERENCE_LABELS = [
  ["splits", "split"],
  ["ious", "IOU"],
  ["settlements", "settlement"],
  ["reminders", "reminder"],
] as const;

export function deletePersonRefusal(references: PersonReferences): string | null {
  const parts: string[] = [];
  for (const [key, label] of REFERENCE_LABELS) {
    const count = references[key];
    if (count > 0) parts.push(`${count} ${label}${count === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return null;
  return `Can't delete — used in ${parts.join(", ")}`;
}

export function sortPeopleByName(people: readonly Person[]): Person[] {
  return [...people].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function matchesPersonSearch(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  if (normalizeName(person.name).includes(q)) return true;
  if (person.email && person.email.trim().toLowerCase().includes(q)) return true;
  const phoneQuery = normalizePhone(q);
  if (phoneQuery.length > 0 && normalizePhone(person.phone ?? "").includes(phoneQuery)) {
    return true;
  }
  return false;
}

export function filterPeopleBySearch(
  people: readonly Person[],
  query: string,
): Person[] {
  return people.filter((person) => matchesPersonSearch(person, query));
}