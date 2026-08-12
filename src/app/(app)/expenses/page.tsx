import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Icon } from "@/components/icons";
import { listCategories } from "@/lib/categories";
import {
  EXPENSE_PAGE_SIZE,
  fetchExpensesPage,
  filtersToQuery,
  listPeople,
  parseFilters,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
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
  const filters = parseFilters(rawParams);
  const [page, categories, people] = await Promise.all([
    fetchExpensesPage(supabase, user.id, filters, 0, EXPENSE_PAGE_SIZE),
    listCategories(supabase, user.id),
    listPeople(supabase, user.id),
  ]);

  const query = filtersToQuery(filters);
  const hasQuery = query.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Expenses</h1>
          {hasQuery && page.items.length > 0 && (
            <p className="text-sm text-muted">
              {page.items.length} shown, filtered by your criteria
            </p>
          )}
        </div>
        <Link
          href="/expenses/new"
          className="tb-btn-primary min-h-11 hidden md:inline-flex"
        >
          <Icon name="plus" className="h-4 w-4" />
          Add expense
        </Link>
      </div>
      <ExpenseFilters categories={categories} people={people} />
      <ExpenseList
        key={query}
        initialItems={page.items}
        initialOffset={page.offset}
        initialHasMore={page.hasMore}
        hasQuery={hasQuery}
      />
    </div>
  );
}