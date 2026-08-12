import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BudgetCard } from "@/components/budgets/budget-card";
import { CategoryCard } from "@/components/charts/category-card";
import { PendingPaymentRow } from "@/components/dashboard/pending-payments";
import { ExpenseRowItem } from "@/components/expenses/expense-row";
import { Icon, type IconName } from "@/components/icons";
import { budgetProgress } from "@/lib/budgets";
import {
  categoryBreakdown,
  momChangeText,
  momPercent,
  monthLabel,
  monthRange,
  previousMonth,
  rpcTotalToNumber,
  yearRange,
} from "@/lib/dashboard";
import { fetchBudget, fetchDebtView, fetchExpensesPage, parseFilters } from "@/lib/data";
import { totalRemaining } from "@/lib/money-owed";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { todayLocalIso } from "@/lib/expenses";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata: Metadata = { title: "Dashboard" };

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

function BalanceCard({
  direction,
  amount,
}: {
  direction: "to_receive" | "to_pay";
  amount: number;
}) {
  const receivable = direction === "to_receive";
  return (
    <div className="tb-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ${
            receivable ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          <Icon name={receivable ? "coins" : "wallet"} className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-muted">
          {receivable ? "Money to receive" : "Money to pay"}
        </p>
      </div>
      <p
        className={`text-xl font-semibold tabular-nums tracking-tight ${
          receivable ? "text-success" : "text-warning"
        }`}
      >
        {formatINR(amount)}
      </p>
      <p className="text-xs text-muted">Gross balance never nets off</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const month = todayLocalIso().slice(0, 7);
  const monthB = monthRange(month);
  const prevMonthB = monthRange(previousMonth(month) ?? month);
  const yearB = yearRange(month);
  const [monthRows, prevRows, yearRows, categoryRows, debtView, recent, budgetRow] =
    await Promise.all([
      monthB
        ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
            p_from: monthB.from,
            p_to: monthB.to,
          })
        : [],
      prevMonthB
        ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
            p_from: prevMonthB.from,
            p_to: prevMonthB.to,
          })
        : [],
      yearB
        ? rpcRows<{ total: unknown }>(supabase, "month_totals", {
            p_from: yearB.from,
            p_to: yearB.to,
          })
        : [],
      monthB
        ? rpcRows<{ category_id: string | null; category_name: string | null; amount: unknown }>(
            supabase,
            "category_breakdown",
            { p_from: monthB.from, p_to: monthB.to },
          )
        : [],
      fetchDebtView(supabase, user.id),
      fetchExpensesPage(supabase, user.id, parseFilters({}), 0, 5),
      fetchBudget(supabase, user.id, month),
    ]);

  const monthTotal = rpcTotalToNumber(monthRows[0]?.total);
  const prevTotal = rpcTotalToNumber(prevRows[0]?.total);
  const yearTotal = rpcTotalToNumber(yearRows[0]?.total);
  const budget =
    budgetRow && budgetRow.overallLimit > 0 ? budgetProgress(monthTotal, budgetRow.overallLimit) : null;
  const slices = categoryBreakdown(
    categoryRows.map((row) => ({
      categoryId: row.category_id,
      name: row.category_name,
      amount: rpcTotalToNumber(row.amount),
    })),
  );
  const balances = {
    receivable: totalRemaining(
      debtView.entries.filter((entry) => entry.direction === "to_receive"),
    ),
    payable: totalRemaining(
      debtView.entries.filter((entry) => entry.direction === "to_pay"),
    ),
  };
  const pendingEntries = debtView.entries.filter((entry) => entry.status === "pending");
  const recentExpenses = recent.items.slice(0, 5);
  const empty =
    monthTotal === 0 &&
    yearTotal === 0 &&
    pendingEntries.length === 0 &&
    recentExpenses.length === 0 &&
    !budgetRow;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{monthLabel(month)}</h1>
        <p className="text-sm text-muted">Your spending at a glance.</p>
      </div>

      {empty ? (
        <section className="tb-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="home" className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Welcome to TabBack</h2>
            <p className="text-sm text-muted">
              Track expenses, split bills and keep money owed in one place.
            </p>
          </div>
          <Link href="/expenses/new" className="tb-btn-primary min-h-11">
            <Icon name="plus" className="h-4 w-4" />
            Add your first expense
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <StatCard
              icon="wallet"
              label="Spent this month"
              amount={monthTotal}
              hint={momChangeText(momPercent(monthTotal, prevTotal))}
            />
            <StatCard
              icon="chart"
              label="Spent this year"
              amount={yearTotal}
              hint={`${month.slice(0, 4)} year to date`}
            />
          </section>

          {budget && budgetRow && (
            <BudgetCard
              month={month}
              spent={monthTotal}
              limit={budgetRow.overallLimit}
              percent={budget.percent}
              remaining={budget.remaining}
            />
          )}

          {(balances.receivable > 0 || balances.payable > 0) && (
            <section className="grid gap-3 sm:grid-cols-2">
              <BalanceCard direction="to_receive" amount={balances.receivable} />
              <BalanceCard direction="to_pay" amount={balances.payable} />
            </section>
          )}

          <CategoryCard slices={slices} />

          {pendingEntries.length > 0 && (
            <section aria-labelledby="pending-payments-heading">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 id="pending-payments-heading" className="text-base font-semibold tracking-tight text-foreground">
                  Pending payments
                </h2>
                <Link href="/money-owed" className="text-sm font-medium text-accent">
                  View all
                </Link>
              </div>
              <ul className="space-y-3">
                {pendingEntries.map((entry) => (
                  <PendingPaymentRow
                    key={`${entry.debtType}:${entry.debtId}`}
                    entry={entry}
                    settlements={debtView.settlementsByDebt[entry.debtId] ?? []}
                  />
                ))}
              </ul>
            </section>
          )}

          {recentExpenses.length > 0 && (
            <section aria-labelledby="recent-expenses-heading">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 id="recent-expenses-heading" className="text-base font-semibold tracking-tight text-foreground">
                  Recent activity
                </h2>
                <Link href="/expenses" className="text-sm font-medium text-accent">
                  View all
                </Link>
              </div>
              <ul className="space-y-3">
                {recentExpenses.map((expense) => (
                  <ExpenseRowItem key={expense.id} expense={expense} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}