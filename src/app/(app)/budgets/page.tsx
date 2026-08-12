import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BudgetEditor } from "@/components/budgets/budget-editor";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { Icon } from "@/components/icons";
import {
  bandLabel,
  budgetProgress,
  categoryProgress,
  warningBand,
} from "@/lib/budgets";
import { listCategories } from "@/lib/categories";
import { fetchBudget } from "@/lib/data";
import { monthLabel, monthRange, rpcTotalToNumber } from "@/lib/dashboard";
import { todayLocalIso } from "@/lib/expenses";
import { roundMoney } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata: Metadata = { title: "Budgets" };

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

export default async function BudgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const month = todayLocalIso().slice(0, 7);
  const range = monthRange(month);

  const [budget, monthRows, categoryRows, categories] = await Promise.all([
    fetchBudget(supabase, user.id, month),
    range
      ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
          p_from: range.from,
          p_to: range.to,
        })
      : [],
    range
      ? rpcRows<{ category_id: string | null; category_name: string | null; amount: unknown }>(
          supabase,
          "category_breakdown",
          { p_from: range.from, p_to: range.to },
        )
      : [],
    listCategories(supabase, user.id),
  ]);

  const spent = rpcTotalToNumber(monthRows[0]?.total);
  const overall = budget && budget.overallLimit > 0 ? budgetProgress(spent, budget.overallLimit) : null;
  const overallBand = overall ? warningBand(overall.percent) : null;

  const spentByCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    if (row.category_id) {
      spentByCategory[row.category_id] = roundMoney(
        (spentByCategory[row.category_id] ?? 0) + rpcTotalToNumber(row.amount),
      );
    }
  }
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const categoryRowsProgress = budget
    ? categoryProgress(spentByCategory, budget.categoryLimits).filter((row) =>
        categoryNameById.has(row.categoryId),
      )
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{monthLabel(month)}</h1>
        <p className="text-sm text-muted">Monthly limits with gentle nudges at 75%, 90% and 100%.</p>
      </div>

      {!budget && (
        <section className="tb-card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="target" className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              No budget set for {monthLabel(month)}
            </h2>
            <p className="text-sm text-muted">
              Set an overall limit or per-category limits below to see progress.
            </p>
          </div>
        </section>
      )}

      {overall && budget && overallBand && (
        <section className="tb-card flex flex-col gap-3 p-4" aria-labelledby="overall-limit-heading">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon name="wallet" className="h-4 w-4" />
            </span>
            <h2 id="overall-limit-heading" className="text-sm font-medium text-muted">
              Overall limit
            </h2>
          </div>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatINR(spent)}{" "}
            <span className="text-sm font-normal text-muted">of {formatINR(budget.overallLimit)}</span>
          </p>
          <BudgetProgress
            percent={overall.percent}
            band={overallBand}
            label={bandLabel(overallBand)}
            remaining={overall.remaining}
          />
        </section>
      )}

      {budget && categoryRowsProgress.length > 0 && (
        <section className="tb-card flex flex-col gap-4 p-4" aria-labelledby="category-limits-heading">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon name="target" className="h-4 w-4" />
            </span>
            <h2 id="category-limits-heading" className="text-sm font-medium text-muted">
              Category limits
            </h2>
          </div>
          <ul className="space-y-4">
            {categoryRowsProgress.map((row) => {
              const progress = budgetProgress(row.spent, row.limit);
              return (
                <li key={row.categoryId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {categoryNameById.get(row.categoryId)}
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-muted">
                      {formatINR(row.spent)} of {formatINR(row.limit)}
                    </p>
                  </div>
                  <BudgetProgress
                    percent={row.percent}
                    band={row.band}
                    label={bandLabel(row.band)}
                    remaining={progress.remaining}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <BudgetEditor month={month} budget={budget} categories={categories} />
    </div>
  );
}
