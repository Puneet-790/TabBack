import {
  monthLabel,
  monthRange,
  previousMonth,
  yearRange,
  type DateRange,
} from "@/lib/dashboard";
import { roundMoney } from "@/lib/ledger";

export type View = "month" | "quarter" | "year";

export const ANALYTICS_VIEWS: readonly View[] = ["month", "quarter", "year"];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isAnalyticsView(value: string): View {
  return ANALYTICS_VIEWS.includes(value as View) ? (value as View) : "month";
}

export function quarterNumber(month: string): number | null {
  if (!MONTH_PATTERN.test(month)) return null;
  return Math.ceil(Number(month.slice(5, 7)) / 3);
}

export function quarterRange(month: string): DateRange | null {
  const first = monthRange(month);
  if (!first) return null;
  const [year, shortMonth] = month.split("-").map(Number);
  const quarter = Math.ceil(shortMonth / 3);
  const from = monthRange(`${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}`);
  const to = monthRange(`${year}-${String(quarter * 3).padStart(2, "0")}`);
  if (!from || !to) return null;
  return { from: from.from, to: to.to };
}

export function previousRange(view: View, month: string): DateRange | null {
  if (view === "month") {
    const prev = previousMonth(month);
    return prev ? monthRange(prev) : null;
  }
  if (view === "quarter") {
    const step1 = previousMonth(month);
    if (!step1) return null;
    const step2 = previousMonth(step1);
    if (!step2) return null;
    const step3 = previousMonth(step2);
    return step3 ? quarterRange(step3) : null;
  }
  if (!MONTH_PATTERN.test(month)) return null;
  return yearRange(`${Number(month.slice(0, 4)) - 1}-01`);
}

export function viewRange(view: View, month: string): DateRange | null {
  if (view === "month") return monthRange(month);
  if (view === "quarter") return quarterRange(month);
  return yearRange(month);
}

export function viewLabel(view: View, month: string): string {
  if (view === "month") return monthLabel(month);
  if (!MONTH_PATTERN.test(month)) return month;
  const year = month.slice(0, 4);
  if (view === "quarter") return `Q${quarterNumber(month)} ${year}`;
  return year;
}

export function daysInRange(range: DateRange): number {
  const from = Date.UTC(
    Number(range.from.slice(0, 4)),
    Number(range.from.slice(5, 7)) - 1,
    Number(range.from.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(range.to.slice(0, 4)),
    Number(range.to.slice(5, 7)) - 1,
    Number(range.to.slice(8, 10)),
  );
  return Math.round((to - from) / 86400000) + 1;
}

export function averageDaily(total: number, days: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(days) || days <= 0) return 0;
  return roundMoney(total / days);
}

export function averageMonthly(total: number): number {
  return roundMoney(total / 12);
}

export function highestBucket(
  rows: readonly { label: string; amount: number }[],
): { label: string; amount: number } | null {
  let best: { label: string; amount: number } | null = null;
  for (const row of rows) {
    if (!best || row.amount > best.amount) best = row;
  }
  return best;
}

export function bucketLabel(
  bucketDate: string,
  granularity: "day" | "week" | "month",
): string {
  const parsed = new Date(`${bucketDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return bucketDate;
  if (granularity === "month") {
    return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(parsed);
  }
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(parsed);
}

export function seriesPercent(rows: readonly { amount: number }[]): Map<number, number> {
  const max = rows.reduce((current, row) => Math.max(current, row.amount), 0);
  if (max <= 0) {
    return new Map(rows.map((row) => [row.amount, 0]));
  }
  return new Map(
    rows.map((row) => [row.amount, Math.round((row.amount / max) * 1000) / 10]),
  );
}

const PERIOD_LABELS: Record<View, string> = {
  month: "month",
  quarter: "quarter",
  year: "year",
};

export function periodChangeText(percent: number | null, view: View): string {
  const label = PERIOD_LABELS[view];
  if (percent === null) return `No last-${label} data`;
  if (percent === 0) return `0% vs last ${label}`;
  const sign = percent > 0 ? "+" : "-";
  return `${sign}${Math.abs(percent).toFixed(1)}% vs last ${label}`;
}
