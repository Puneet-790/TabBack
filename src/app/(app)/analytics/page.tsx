import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HighestExpenseCard } from "@/components/analytics/highest-expense-card";
import { TrendBars, type TrendBarRow } from "@/components/analytics/trend-bars";
import { ViewSwitcher } from "@/components/analytics/view-switcher";
import { CategoryCard } from "@/components/charts/category-card";
import { Icon, type IconName } from "@/components/icons";
import {
  averageDaily,
  averageMonthly,
  bucketLabel,
  daysInRange,
  highestBucket,
  isAnalyticsView,
  periodChangeText,
  previousRange,
  seriesPercent,
  viewLabel,
  viewRange,
} from "@/lib/analytics";
import {
  categoryBreakdown,
  momPercent,
  rpcTotalToNumber,
} from "@/lib/dashboard";
import { todayLocalIso } from "@/lib/expenses";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata: Metadata = { title: "Analytics" };

async function rpcRows<T>(
  client: SupabaseClient,
  name: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  try {
    const { data, error } = await (
      client.rpc as unknown as (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: T[] | null; error: { message: string } | null }>
    )(name, params);
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

function StatCard({
  icon,
  label,
  amount,
  hint,
}: {
  icon: IconName;
  label: string;
  amount: number;
  hint: string;
}) {
  return (
    <div className="tb-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {formatINR(amount)}
      </p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function trendRows(
  rows: readonly { bucket: string; total: unknown }[],
  granularity: "day" | "week" | "month",
): TrendBarRow[] {
  const labeled = rows.map((row) => ({
    label: bucketLabel(row.bucket, granularity),
    amount: rpcTotalToNumber(row.total),
  }));
  const percents = seriesPercent(labeled);
  return labeled.map((row) => ({ ...row, percent: percents.get(row.amount) ?? 0 }));
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const rawParams = await searchParams;
  const view = isAnalyticsView(String(rawParams.view ?? ""));
  const month = todayLocalIso().slice(0, 7);
  const range = viewRange(view, month);
  const prevRange = previousRange(view, month);

  const [dailySeries, weeklySeries, monthlySeries, currentRows, prevRows, categoryRows, highestRows] =
    await Promise.all([
      range && view === "month"
        ? rpcRows<{ bucket: string; total: unknown }>(supabase, "spend_series", {
            p_from: range.from,
            p_to: range.to,
            p_granularity: "day",
          })
        : [],
      range && view === "month"
        ? rpcRows<{ bucket: string; total: unknown }>(supabase, "spend_series", {
            p_from: range.from,
            p_to: range.to,
            p_granularity: "week",
          })
        : [],
      range && view !== "month"
        ? rpcRows<{ bucket: string; total: unknown }>(supabase, "spend_series", {
            p_from: range.from,
            p_to: range.to,
            p_granularity: "month",
          })
        : [],
      range
        ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
            p_from: range.from,
            p_to: range.to,
          })
        : [],
      prevRange
        ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
            p_from: prevRange.from,
            p_to: prevRange.to,
          })
        : [],
      range
        ? rpcRows<{ category_id: string | null; category_name: string | null; amount: unknown }>(
            supabase,
            "category_breakdown",
            { p_from: range.from, p_to: range.to },
          )
        : [],
      range
        ? rpcRows<{ id: string; description: string; date: string; amount: unknown }>(
            supabase,
            "highest_expense",
            { p_from: range.from, p_to: range.to },
          )
        : [],
    ]);

  const total = rpcTotalToNumber(currentRows[0]?.total);
  const prevTotal = rpcTotalToNumber(prevRows[0]?.total);
  const percent = momPercent(total, prevTotal);
  const days = range ? daysInRange(range) : 0;
  const slices = categoryBreakdown(
    categoryRows.map((row) => ({
      categoryId: row.category_id,
      name: row.category_name,
      amount: rpcTotalToNumber(row.amount),
    })),
  );
  const highest = highestRows[0]
    ? {
        id: highestRows[0].id,
        description: highestRows[0].description,
        date: highestRows[0].date,
        amount: rpcTotalToNumber(highestRows[0].amount),
      }
    : null;

  const dailyTrend = trendRows(dailySeries, "day");
  const weeklyTrend = trendRows(weeklySeries, "week");
  const monthlyTrend = trendRows(monthlySeries, "month");
  const highestMonth = highestBucket(monthlyTrend);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {viewLabel(view, month)}
        </h1>
        <p className="text-sm text-muted">Month, quarter and year views of your spending.</p>
      </div>

      <ViewSwitcher active={view} />

      {total === 0 ? (
        <section className="tb-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="chart" className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              No expenses in {viewLabel(view, month)}
            </h2>
            <p className="text-sm text-muted">Add an expense to start seeing trends here.</p>
          </div>
          <Link href="/expenses/new" className="tb-btn-primary min-h-11">
            <Icon name="plus" className="h-4 w-4" />
            Add an expense
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <StatCard
              icon="wallet"
              label="Total spent"
              amount={total}
              hint={periodChangeText(percent, view)}
            />
            <StatCard
              icon="calendar"
              label="Average daily spend"
              amount={averageDaily(total, days)}
              hint={`Across ${days} days`}
            />
            {view === "year" && (
              <>
                <StatCard
                  icon="chart"
                  label="Average monthly spend"
                  amount={averageMonthly(total)}
                  hint="Across 12 months"
                />
                {highestMonth && (
                  <StatCard
                    icon="chart"
                    label="Highest month"
                    amount={highestMonth.amount}
                    hint={highestMonth.label}
                  />
                )}
              </>
            )}
          </section>

          {view === "month" && (
            <>
              <section className="tb-card p-4" aria-labelledby="daily-trend-heading">
                <h2 id="daily-trend-heading" className="mb-3 text-sm font-medium text-muted">
                  Daily trend
                </h2>
                <TrendBars rows={dailyTrend} />
              </section>
              <section className="tb-card p-4" aria-labelledby="weekly-trend-heading">
                <h2 id="weekly-trend-heading" className="mb-3 text-sm font-medium text-muted">
                  Weekly trend
                </h2>
                <TrendBars rows={weeklyTrend} />
              </section>
            </>
          )}

          {view !== "month" && monthlyTrend.length > 0 && (
            <section className="tb-card p-4" aria-labelledby="monthly-trend-heading">
              <h2 id="monthly-trend-heading" className="mb-3 text-sm font-medium text-muted">
                {view === "quarter" ? "Monthly trend" : "Month by month"}
              </h2>
              <TrendBars
                rows={monthlyTrend}
                highlight={view === "year" ? highestMonth?.label : undefined}
              />
            </section>
          )}

          {highest && (
            <section aria-labelledby="highest-expense-heading">
              <h2
                id="highest-expense-heading"
                className="mb-2.5 text-base font-semibold tracking-tight text-foreground"
              >
                Highest expense
              </h2>
              <HighestExpenseCard expense={highest} />
            </section>
          )}

          <CategoryCard slices={slices} />
        </>
      )}
    </div>
  );
}
