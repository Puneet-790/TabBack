import { roundMoney } from "@/lib/ledger";
import { uncategorisedLabel } from "@/lib/categories";

export interface DateRange {
  from: string;
  to: string;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function monthRange(month: string): DateRange | null {
  if (!MONTH_PATTERN.test(month)) return null;
  const [year, shortMonth] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, shortMonth, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${lastDay}` };
}

export function yearRange(month: string): DateRange | null {
  if (!MONTH_PATTERN.test(month)) return null;
  const year = month.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function previousMonth(month: string): string | null {
  if (!MONTH_PATTERN.test(month)) return null;
  const [year, shortMonth] = month.split("-").map(Number);
  if (shortMonth === 1) return `${year - 1}-12`;
  return `${year}-${String(shortMonth - 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  if (!MONTH_PATTERN.test(month)) return month;
  const [year, shortMonth] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, shortMonth - 1, 1)),
  );
}

export function momPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) return null;
  return Math.round((roundMoney(current) / roundMoney(previous) - 1) * 1000) / 10;
}

export function momChangeText(percent: number | null): string {
  if (percent === null) return "No last-month data";
  if (percent === 0) return "0% vs last month";
  const sign = percent > 0 ? "+" : "-";
  return `${sign}${Math.abs(percent).toFixed(1)}% vs last month`;
}

export function rpcTotalToNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function categoryColor(categoryId: string | null): string {
  if (!categoryId) return "var(--category)";
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return CHART_COLORS[hash % CHART_COLORS.length];
}

export interface DonutStop {
  color: string;
  from: number;
  to: number;
}

export function donutStops(
  slices: readonly { value: number; categoryId: string | null }[],
): DonutStop[] {
  const stops: DonutStop[] = [];
  let cursor = 0;
  for (const slice of slices) {
    const value = Math.max(0, slice.value);
    if (value <= 0) continue;
    const start = cursor;
    const gap = Math.min(1.5, value * 0.08);
    cursor = start + value;
    stops.push({
      color: categoryColor(slice.categoryId),
      from: Math.round(start * 10) / 10,
      to: Math.round((cursor - gap) * 10) / 10,
    });
  }
  if (stops.length > 0) {
    stops[stops.length - 1].to = Math.round(cursor * 10) / 10;
  }
  return stops;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  amount: number;
  percent: number;
}

export function categoryBreakdown(
  rows: readonly { categoryId: string | null; name: string | null; amount: number }[],
): CategorySlice[] {
  const total = rows.reduce((sum, row) => roundMoney(sum + roundMoney(row.amount)), 0);
  const slices = rows
    .map((row) => {
      const amount = roundMoney(row.amount);
      const share = total > 0 ? (amount / total) * 100 : 0;
      return {
        categoryId: row.categoryId,
        name: row.name?.trim() || uncategorisedLabel,
        amount,
        percent: Math.round(share * 10) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.amount - a.amount || a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  return slices;
}

export function directionTotals(
  rows: readonly { direction: unknown; total: unknown }[],
): { receivable: number; payable: number } {
  let receivable = 0;
  let payable = 0;
  for (const row of rows) {
    const amount = rpcTotalToNumber(row.total);
    if (row.direction === "to_receive") {
      receivable = roundMoney(receivable + amount);
    } else if (row.direction === "to_pay") {
      payable = roundMoney(payable + amount);
    }
  }
  return { receivable, payable };
}