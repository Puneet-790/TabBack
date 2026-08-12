import { isPaymentMethod, isValidDate, parseExpenseAmount, todayLocalIso } from "@/lib/expenses";
import { roundMoney, type DebtDirection, type ValidationResult, validateSettlement } from "@/lib/ledger";
import type { PaymentMethod } from "@/lib/expenses";

export const MAX_SETTLEMENT_NOTE_LENGTH = 500;

export interface SettlementInput {
  debtId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note: string | null;
}

export interface SplitSettlement {
  id: string;
  debtId: string;
  amount: number;
}

export function settlementDirection(debtType: "split" | "iou"): DebtDirection {
  return debtType === "split" ? "to_receive" : "to_pay";
}

export function parseSettlementFormData(
  formData: FormData,
): { ok: true; input: SettlementInput } | { ok: false; error: string } {
  const debtId = String(formData.get("debt_id") ?? "").trim();
  if (debtId.length === 0) return { ok: false, error: "Debt not found" };
  const amount = parseExpenseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { ok: false, error: "Enter a valid amount" };
  const methodText = String(formData.get("method") ?? "");
  if (!isPaymentMethod(methodText)) return { ok: false, error: "Choose a payment method" };
  const dateText = String(formData.get("date") ?? "").trim();
  if (dateText !== "" && !isValidDate(dateText)) {
    return { ok: false, error: "Enter a valid date" };
  }
  const noteText = String(formData.get("note") ?? "").trim();
  if (noteText.length > MAX_SETTLEMENT_NOTE_LENGTH) {
    return { ok: false, error: `Keep the note under ${MAX_SETTLEMENT_NOTE_LENGTH} characters` };
  }
  return {
    ok: true,
    input: {
      debtId,
      amount,
      method: methodText as PaymentMethod,
      date: dateText.length > 0 ? dateText : todayLocalIso(),
      note: noteText.length > 0 ? noteText : null,
    },
  };
}

export function validateSplitSettlement(
  input: SettlementInput,
  remainingAmount: number,
): ValidationResult {
  return validateSettlement(input.amount, remainingAmount);
}

export function settlementRowsRemaining(
  debtAmount: number,
  settledAmounts: Iterable<number>,
): number {
  let settled = 0;
  for (const amount of settledAmounts) {
    settled = roundMoney(settled + roundMoney(amount));
  }
  return Math.max(0, roundMoney(roundMoney(debtAmount) - settled));
}

export function toLedgerSettlements(rows: readonly SplitSettlement[]): { debtId: string; amount: number }[] {
  return rows.map((row) => ({ debtId: row.debtId, amount: roundMoney(row.amount) }));
}

export function lockedFieldsChanged(
  prev: { amount: number; paymentMethod: string },
  next: { amount: number; paymentMethod: string },
): boolean {
  return roundMoney(prev.amount) !== roundMoney(next.amount) || prev.paymentMethod !== next.paymentMethod;
}

export function expenseLockMessage(settledCount: number): string {
  if (settledCount === 1) return "This expense has a settlement — amount and payment method are locked. Delete the settlement to edit them.";
  return `This expense has ${settledCount} settlements — amount and payment method are locked. Delete the settlements to edit them.`;
}

export function expenseDeleteBlockMessage(settledCount: number): string {
  if (settledCount === 1) return "Delete the 1 settlement on this expense first";
  return `Delete the ${settledCount} settlements on this expense first`;
}