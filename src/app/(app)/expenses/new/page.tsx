import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Icon } from "@/components/icons";
import { listCategories } from "@/lib/categories";
import { listPeople } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const [categories, people] = await Promise.all([
    listCategories(supabase, user.id),
    listPeople(supabase, user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <Link
          href="/expenses"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <Icon name="back" className="h-4 w-4" />
          Back to expenses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Add expense
        </h1>
        <p className="text-sm text-muted">
          Amount, category, date and method — done in under 10 seconds.
        </p>
      </div>
      <ExpenseForm mode="create" categories={categories} people={people} />
    </div>
  );
}