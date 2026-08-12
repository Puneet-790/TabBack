import { remaining, roundMoney, type Debt, type Settlement } from "@/lib/ledger";

export const PAYMENT_METHODS = ["Cash", "Bank transfer", "UPI", "Other"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MAX_EXPENSE_AMOUNT = 9_999_999_999.99;

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export const RECEIPT_FILE_TYPES = ["image/", "application/pdf"] as const;

const RECEIPT_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf"] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpenseAmount(value: string): number | null {
  const cleaned = value.trim().replace(/[₹,\s]/g, "");
  if (cleaned.length === 0) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const rounded = roundMoney(parsed);
  if (rounded < 0 || rounded > MAX_EXPENSE_AMOUNT) return null;
  return rounded;
}

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function validateReceiptFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size === 0) return "Choose a file to upload";
  if (file.size > MAX_RECEIPT_BYTES) return "Receipt must be 5 MB or smaller";
  const allowedType = RECEIPT_FILE_TYPES.some((prefix) => file.type.startsWith(prefix));
  if (!allowedType) return "Only image files or PDFs are allowed";
  return null;
}

export function receiptPathFor(userId: string, fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!(RECEIPT_EXTENSIONS as readonly string[]).includes(extension)) return null;
  return `receipts/${userId}/${crypto.randomUUID()}.${extension}`;
}

export function expenseDateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export interface SplitShare {
  id: string;
  personId: string;
  amount: number;
  expenseDate?: string;
  dueDate?: string;
  personName?: string;
}

export interface PaidShare {
  debtId: string;
  amount: number;
}

export type SplitState = "none" | "pending" | "paid";

export function splitState(
  shares: readonly SplitShare[],
  paidShares: Iterable<PaidShare>,
): SplitState {
  if (shares.length === 0) return "none";
  const debts: Debt[] = shares.map((share) => ({
    id: share.id,
    personId: share.personId,
    amount: share.amount,
    type: "split",
    expenseDate: share.expenseDate,
  }));
  const settlements: Settlement[] = Array.from(paidShares, (paid) => ({
    id: paid.debtId,
    debtId: paid.debtId,
    amount: roundMoney(paid.amount),
  }));
  const allPaid = debts.every((debt) => remaining(debt, settlements) === 0);
  return allPaid ? "paid" : "pending";
}

export function matchesSplitFilter(state: SplitState, filter: "all" | "split" | "not_split"): boolean {
  if (filter === "all") return true;
  return filter === "split" ? state !== "none" : state === "none";
}

export function matchesStatusFilter(state: SplitState, filter: "all" | "pending" | "paid"): boolean {
  if (filter === "all") return true;
  if (state === "none") return true;
  return state === filter;
}

export function todayLocalIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}