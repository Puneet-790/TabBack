"use server";

import { revalidatePath } from "next/cache";
import {
  deleteBudget,
  fetchValidBudgetCategoryIds,
  upsertBudget,
} from "@/lib/data";
import { isBudgetMonth, parseBudgetFormData } from "@/lib/budgets";
import { createClient } from "@/lib/supabase/server";

export interface BudgetActionState {
  ok?: boolean;
  error?: string;
}

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

export async function upsertBudgetAction(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };

  let validIds: string[];
  try {
    validIds = await fetchValidBudgetCategoryIds(current.supabase, current.user.id);
  } catch {
    return { error: "Could not save the budget" };
  }

  const parsed = parseBudgetFormData(formData, validIds);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await upsertBudget(
      current.supabase,
      current.user.id,
      parsed.month,
      parsed.overallLimit,
      parsed.categoryLimits,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the budget" };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBudgetAction(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const month = String(formData.get("month") ?? "").trim();
  if (!isBudgetMonth(month)) return { error: "Could not delete the budget" };
  try {
    await deleteBudget(current.supabase, current.user.id, month);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete the budget" };
  }
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}
