import { parseExpenseAmount, isValidDate, type SplitShare } from "@/lib/expenses";
import { equalSplit, roundMoney, userShare, validateSplitDistribution } from "@/lib/ledger";

export interface SplitRow {
  personId: string;
  amountText: string;
  amount: number | null;
  dueDate: string;
  custom: boolean;
}

export interface SplitInput {
  personId: string;
  amount: number;
  dueDate: string | null;
}

export type SplitSummary =
  | { ok: true; total: number; userShare: number }
  | { ok: false; total: number; userShare: null; error: string };

export function initialSplitRows(shares: readonly SplitShare[]): SplitRow[] {
  return shares.map((share) => ({
    personId: share.personId,
    amountText: share.amount.toFixed(2),
    amount: share.amount,
    dueDate: share.dueDate ?? "",
    custom: true,
  }));
}

export function distributeSplitRows(
  expenseAmount: number,
  rows: readonly SplitRow[],
): SplitRow[] {
  if (rows.length === 0) return [];
  if (rows.some((row) => row.custom)) return rows.slice();
  const expense = roundMoney(expenseAmount);
  const shares = equalSplit(expense, rows.length);
  return rows.map((row, index) => ({
    ...row,
    amount: shares[index],
    amountText: shares[index].toFixed(2),
  }));
}

export function addSplitPerson(rows: SplitRow[], personId: string): SplitRow[] {
  if (rows.some((row) => row.personId === personId)) return rows;
  return [...rows, { personId, amountText: "", amount: null, dueDate: "", custom: false }];
}

export function removeSplitPerson(rows: SplitRow[], personId: string): SplitRow[] {
  return rows.filter((row) => row.personId !== personId);
}

export function setSplitAmount(
  rows: SplitRow[],
  personId: string,
  text: string,
): SplitRow[] {
  const amount = parseExpenseAmount(text);
  return rows.map((row) =>
    row.personId === personId ? { ...row, amountText: text, amount, custom: true } : row,
  );
}

export function setSplitDueDate(
  rows: SplitRow[],
  personId: string,
  dueDate: string,
): SplitRow[] {
  return rows.map((row) =>
    row.personId === personId ? { ...row, dueDate } : row,
  );
}

export function splitSummary(expenseAmount: number, rows: readonly SplitRow[]): SplitSummary {
  const total = rows.reduce((sum, row) => roundMoney(sum + (row.amount ?? 0)), 0);
  const expense = roundMoney(expenseAmount);
  if (!Number.isFinite(expenseAmount) || expense < 0) {
    return { ok: false, total, userShare: null, error: "Enter a valid amount" };
  }
  const shares = rows.map((row) => row.amount ?? 0);
  const check = validateSplitDistribution(expense, shares);
  if (!check.ok) return { ok: false, total, userShare: null, error: check.error };
  return { ok: true, total, userShare: userShare(expense, shares) };
}

export function splitFormError(expenseAmount: number, rows: readonly SplitRow[]): string | null {
  if (rows.length === 0) return null;
  const expense = roundMoney(expenseAmount);
  if (!Number.isFinite(expenseAmount) || expense < 0) return "Enter a valid amount";
  if (rows.some((row) => row.amountText.trim() !== "" && row.amount === null)) {
    return "Enter valid amounts";
  }
  if (rows.some((row) => row.amount === null)) return "Enter an amount for each person";
  if (rows.some((row) => row.dueDate !== "" && !isValidDate(row.dueDate))) {
    return "Enter a valid due date";
  }
  const check = validateSplitDistribution(
    expense,
    rows.map((row) => row.amount ?? 0),
  );
  return check.ok ? null : check.error;
}

export function splitInputsFromFormData(
  formData: FormData,
): { ok: true; rows: SplitInput[] } | { ok: false; error: string } {
  const rows: SplitInput[] = [];
  for (let index = 0; ; index++) {
    const personId = formData.get(`split_person_ids_${index}`);
    if (personId === null) break;
    const personIdText = typeof personId === "string" ? personId.trim() : "";
    if (personIdText === "") return { ok: false, error: "Choose a person for every split" };
    const amountText = String(formData.get(`split_amounts_${index}`) ?? "");
    const amount = parseExpenseAmount(amountText);
    if (amount === null) return { ok: false, error: "Enter a valid amount for every split" };
    const dueDateText = String(formData.get(`split_due_dates_${index}`) ?? "").trim();
    rows.push({ personId: personIdText, amount, dueDate: dueDateText.length > 0 ? dueDateText : null });
  }
  return { ok: true, rows };
}

export function validateSplitInputs(
  expenseAmount: number,
  rows: SplitInput[],
): { ok: true; rows: SplitInput[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.personId)) {
      return { ok: false, error: "A person can appear only once in a split" };
    }
    seen.add(row.personId);
    if (row.amount < 0 || row.amount !== roundMoney(row.amount)) {
      return { ok: false, error: "Enter valid amounts" };
    }
    if (row.dueDate !== null && !isValidDate(row.dueDate)) {
      return { ok: false, error: "Enter a valid due date" };
    }
  }
  const check = validateSplitDistribution(
    expenseAmount,
    rows.map((row) => row.amount),
  );
  if (!check.ok) return { ok: false, error: check.error };
  return { ok: true, rows };
}