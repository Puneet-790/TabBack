import {
  overdueDays,
  remaining,
  roundMoney,
  status,
  type Debt,
  type DebtDirection,
  type DebtStatus,
} from "@/lib/ledger";

export interface DebtSource {
  id: string;
  personId: string;
  personName: string;
  phone: string | null;
  amount: number;
  type: "split" | "iou";
  direction: DebtDirection;
  expenseDate: string;
  dueDate?: string;
  contextLabel: string | null;
  expenseId?: string;
  createdAt: string;
}

export interface DebtEntry {
  debtId: string;
  debtType: "split" | "iou";
  personId: string;
  personName: string;
  phone: string | null;
  amount: number;
  remaining: number;
  status: DebtStatus;
  direction: DebtDirection;
  daysPending: number;
  anchorDate: string;
  contextLabel: string | null;
  expenseId?: string;
  createdAt: string;
}

function toLedgerDebt(source: DebtSource): Debt {
  if (source.type === "split") {
    return {
      id: source.id,
      personId: source.personId,
      amount: roundMoney(source.amount),
      type: "split",
      dueDate: source.dueDate,
      expenseDate: source.expenseDate,
    };
  }
  return {
    id: source.id,
    personId: source.personId,
    amount: roundMoney(source.amount),
    type: "iou",
    direction: source.direction,
    expenseDate: source.expenseDate,
  };
}

export function buildDebtEntries(
  sources: readonly DebtSource[],
  settlementAmounts: ReadonlyMap<string, readonly number[]>,
  today: string,
): DebtEntry[] {
  const entries: DebtEntry[] = [];
  for (const source of sources) {
    const debt = toLedgerDebt(source);
    const settled = Array.from(settlementAmounts.get(source.id) ?? [], (amount, index) => ({
      id: `${source.id}:${index}`,
      debtId: source.id,
      amount: roundMoney(amount),
    }));
    entries.push({
      debtId: source.id,
      debtType: source.type,
      personId: source.personId,
      personName: source.personName,
      phone: source.phone,
      amount: roundMoney(source.amount),
      remaining: remaining(debt, settled),
      status: status(debt, settled),
      direction: source.direction,
      daysPending: overdueDays(debt, today),
      anchorDate: source.dueDate ?? source.expenseDate,
      contextLabel: source.contextLabel,
      expenseId: source.expenseId,
      createdAt: source.createdAt,
    });
  }
  return sortDebtEntries(entries);
}

export function sortDebtEntries(entries: readonly DebtEntry[]): DebtEntry[] {
  return [...entries].sort(
    (a, b) =>
      compareDesc(a.anchorDate, b.anchorDate) || compareDesc(a.createdAt, b.createdAt),
  );
}

function compareDesc(a: string, b: string): number {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

export function daysPendingLabel(days: number): string {
  if (days <= 1) {
    return days === 0 ? "Due today" : "1 day pending";
  }
  return `${days} days pending`;
}

export function totalRemaining(entries: readonly DebtEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    total = roundMoney(total + roundMoney(entry.remaining));
  }
  return total;
}

export function debtContextLabel(entry: DebtEntry): string {
  if (entry.contextLabel) return entry.contextLabel;
  return entry.debtType === "iou" ? "Manual IOU" : "Split share";
}