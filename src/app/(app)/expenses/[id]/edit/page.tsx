import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Icon } from "@/components/icons";
import { listCategories } from "@/lib/categories";
import { countSettlementsForExpense, fetchExpenseById, listPeople } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const [expense, categories, people, settledCount] = await Promise.all([
    fetchExpenseById(supabase, user.id, id),
    listCategories(supabase, user.id),
    listPeople(supabase, user.id),
    countSettlementsForExpense(supabase, user.id, id),
  ]);
  if (!expense) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <Link
          href={`/expenses/${expense.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <Icon name="back" className="h-4 w-4" />
          Back to expense
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Edit expense
        </h1>
      </div>
      <ExpenseForm
        mode="edit"
        categories={categories}
        people={people}
        expense={expense}
        settledCount={settledCount}
      />
    </div>
  );
}