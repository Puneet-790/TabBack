import { isValidDate, parseExpenseAmount, todayLocalIso } from "@/lib/expenses";
import type { DebtDirection } from "@/lib/ledger";

export const IOU_DIRECTIONS = ["to_receive", "to_pay"] as const;

export const MAX_IOU_NOTE_LENGTH = 500;

export interface IouInput {
  personId: string;
  amount: number;
  direction: DebtDirection;
  date: string;
  note: string | null;
}

export function isIouDirection(value: string): value is DebtDirection {
  return (IOU_DIRECTIONS as readonly string[]).includes(value);
}

export function iouDirectionLabel(direction: DebtDirection): string {
  return direction === "to_receive" ? "They owe you" : "You owe them";
}

export function iouSettlementDirection(direction: DebtDirection): DebtDirection {
  return direction;
}

export function parseIouFormData(
  formData: FormData,
): { ok: true; input: IouInput } | { ok: false; error: string } {
  const personId = String(formData.get("person_id") ?? "").trim();
  if (personId.length === 0) return { ok: false, error: "Choose a person" };
  const amount = parseExpenseAmount(String(formData.get("amount") ?? ""));
  if (amount === null || amount <= 0) return { ok: false, error: "Enter a valid amount" };
  const direction = String(formData.get("direction") ?? "");
  if (!isIouDirection(direction)) return { ok: false, error: "Choose a direction" };
  const dateText = String(formData.get("date") ?? "").trim();
  if (dateText !== "" && !isValidDate(dateText)) {
    return { ok: false, error: "Enter a valid date" };
  }
  const noteText = String(formData.get("note") ?? "").trim();
  if (noteText.length > MAX_IOU_NOTE_LENGTH) {
    return { ok: false, error: `Keep the note under ${MAX_IOU_NOTE_LENGTH} characters` };
  }
  return {
    ok: true,
    input: {
      personId,
      amount,
      direction,
      date: dateText.length > 0 ? dateText : todayLocalIso(),
      note: noteText.length > 0 ? noteText : null,
    },
  };
}