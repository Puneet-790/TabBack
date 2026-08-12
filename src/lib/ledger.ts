import { round2 } from "./money";

export type DebtDirection = "to_receive" | "to_pay";

export interface SplitDebt {
  id: string;
  personId: string;
  amount: number;
  type: "split";
  dueDate?: string;
  expenseDate?: string;
}

export interface IouDebt {
  id: string;
  personId: string;
  amount: number;
  type: "iou";
  direction: DebtDirection;
  dueDate?: string;
  expenseDate?: string;
}

export type Debt = SplitDebt | IouDebt;

export interface Settlement {
  id: string;
  debtId: string;
  amount: number;
}

export type DebtStatus = "pending" | "paid";

export interface PersonNet {
  personId: string;
  net: number;
}

export interface GrossTotals {
  receivable: number;
  payable: number;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

const SPLIT_EPSILON = 1e-9;

export function roundMoney(value: number): number {
  return round2(value);
}

function isReceivable(debt: Debt): boolean {
  return debt.type === "split" || debt.direction === "to_receive";
}

function sumRounded(values: Iterable<number>): number {
  let sum = 0;
  for (const value of values) {
    sum = roundMoney(sum + roundMoney(value));
  }
  return sum;
}

function toLocalMidnight(value: string | Date): number {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

export function remaining(debt: Debt, settlements: Iterable<Settlement>): number {
  let settled = 0;
  for (const settlement of settlements) {
    if (settlement.debtId === debt.id) {
      settled = roundMoney(settled + roundMoney(settlement.amount));
    }
  }
  return Math.max(0, roundMoney(roundMoney(debt.amount) - settled));
}

export function status(debt: Debt, settlements: Iterable<Settlement>): DebtStatus {
  return remaining(debt, settlements) > 0 ? "pending" : "paid";
}

export function settlementError(amount: number, remainingAmount: number): string | null {
  if (!Number.isFinite(amount)) return "Enter a valid amount";
  if (amount <= 0) return "Amount must be greater than 0";
  if (amount > remainingAmount) return "Amount exceeds the remaining balance";
  return null;
}

export function isValidSettlement(amount: number, remainingAmount: number): boolean {
  return settlementError(amount, remainingAmount) === null;
}

export function validateSettlement(amount: number, remainingAmount: number): ValidationResult {
  const error = settlementError(amount, remainingAmount);
  return error === null ? { ok: true } : { ok: false, error };
}

export function net(personDebts: Iterable<Debt>): PersonNet[] {
  const totals = new Map<string, number>();
  for (const debt of personDebts) {
    const contribution = roundMoney(debt.amount);
    const current = totals.get(debt.personId) ?? 0;
    totals.set(
      debt.personId,
      isReceivable(debt) ? roundMoney(current + contribution) : roundMoney(current - contribution),
    );
  }
  return Array.from(totals, ([personId, value]) => ({ personId, net: roundMoney(value) }));
}

export function grossTotals(debts: Iterable<Debt>): GrossTotals {
  let receivable = 0;
  let payable = 0;
  for (const debt of debts) {
    const amount = roundMoney(debt.amount);
    if (isReceivable(debt)) {
      receivable = roundMoney(receivable + amount);
    } else {
      payable = roundMoney(payable + amount);
    }
  }
  return { receivable, payable };
}

export function validateSplitDistribution(expenseAmount: number, shares: readonly number[]): ValidationResult {
  const total = sumRounded(shares);
  if (total > roundMoney(expenseAmount) + SPLIT_EPSILON) {
    return { ok: false, error: "Shares exceed the expense amount" };
  }
  return { ok: true };
}

export function userShare(expenseAmount: number, shares: readonly number[]): number {
  const share = roundMoney(roundMoney(expenseAmount) - sumRounded(shares));
  if (!Number.isFinite(share) || share < 0) {
    throw new RangeError("Shares exceed the expense amount");
  }
  return share;
}

export function equalSplit(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("count must be a positive integer");
  }
  const paise = Math.round((total + Number.EPSILON) * 100);
  const base = Math.floor(paise / count);
  const remainder = paise - base * count;
  return Array.from({ length: count }, (_, index) => (index < remainder ? base + 1 : base) / 100);
}

export function overdueDays(debt: Debt, today: string | Date): number {
  const anchor = debt.dueDate ?? debt.expenseDate;
  if (!anchor) return 0;
  const anchorMs = toLocalMidnight(anchor);
  const todayMs = toLocalMidnight(today);
  if (!Number.isFinite(anchorMs) || !Number.isFinite(todayMs)) return 0;
  return Math.max(0, Math.floor((todayMs - anchorMs) / 86400000));
}