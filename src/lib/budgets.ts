import { roundMoney } from "@/lib/ledger";

export type BudgetBand = "ok" | "nudge-75" | "nudge-90" | "over";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isBudgetMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

export function parseBudgetAmount(value: string): number | null {
  const cleaned = value.trim().replace(/[₹,\s]/g, "");
  if (cleaned.length === 0) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const rounded = roundMoney(parsed);
  if (rounded < 0) return null;
  return rounded;
}

export interface BudgetProgressResult {
  percent: number;
  remaining: number | null;
}

export function budgetProgress(spent: number, limit: number): BudgetProgressResult {
  if (!Number.isFinite(spent) || !Number.isFinite(limit) || limit <= 0) {
    return { percent: 0, remaining: null };
  }
  const percent = Math.round((spent / limit) * 1000) / 10;
  return { percent, remaining: roundMoney(limit - spent) };
}

export function warningBand(percent: number): BudgetBand {
  if (percent >= 100) return "over";
  if (percent >= 90) return "nudge-90";
  if (percent >= 75) return "nudge-75";
  return "ok";
}

export function bandLabel(band: BudgetBand): string {
  switch (band) {
    case "over":
      return "Over budget";
    case "nudge-90":
      return "90% used — nearly at the limit";
    case "nudge-75":
      return "75% used — three-quarters in";
    default:
      return "On track";
  }
}

export function overBudgetHint(spent: number, limit: number): number | null {
  const { remaining } = budgetProgress(spent, limit);
  if (remaining === null || remaining >= 0) return null;
  return roundMoney(-remaining);
}

export interface CategoryProgressRow {
  categoryId: string;
  spent: number;
  limit: number;
  percent: number;
  band: BudgetBand;
}

export function categoryProgress(
  spentByCategory: Record<string, number>,
  limits: Record<string, number>,
): CategoryProgressRow[] {
  return Object.entries(limits)
    .map(([categoryId, limit]) => {
      const spent = roundMoney(spentByCategory[categoryId] ?? 0);
      const progress = budgetProgress(spent, limit);
      return {
        categoryId,
        spent,
        limit,
        percent: progress.percent,
        band: warningBand(progress.percent),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export interface BudgetFormResult {
  ok: true;
  month: string;
  overallLimit: number;
  categoryLimits: Record<string, number>;
}

export type BudgetFormDataResult =
  | BudgetFormResult
  | { ok: false; error: string };

export function parseBudgetFormData(
  formData: FormData,
  validCategoryIds: readonly string[],
): BudgetFormDataResult {
  const month = String(formData.get("month") ?? "").trim();
  if (!isBudgetMonth(month)) return { ok: false, error: "Enter a valid month" };

  const overallLimit = parseBudgetAmount(String(formData.get("overall_limit") ?? ""));
  if (overallLimit === null) return { ok: false, error: "Enter a valid overall limit" };

  const valid = new Set(validCategoryIds);
  const categoryLimits: Record<string, number> = {};
  for (let i = 0; ; i++) {
    const categoryId = String(formData.get(`limit_categories_${i}`) ?? "").trim();
    const amountText = String(formData.get(`limit_amounts_${i}`) ?? "").trim();
    if (categoryId === "" && amountText === "") break;
    if (categoryId === "") return { ok: false, error: "Choose a category for each limit" };
    if (!valid.has(categoryId)) return { ok: false, error: "Choose a valid category" };
    if (categoryId in categoryLimits) {
      return { ok: false, error: "Each category can have only one limit" };
    }
    const amount = parseBudgetAmount(amountText);
    if (amount === null) return { ok: false, error: "Enter a valid amount for each category limit" };
    if (amount > 0) categoryLimits[categoryId] = amount;
  }

  if (overallLimit === 0 && Object.keys(categoryLimits).length === 0) {
    return { ok: false, error: "Set an overall limit or at least one category limit" };
  }

  return { ok: true, month, overallLimit, categoryLimits };
}
