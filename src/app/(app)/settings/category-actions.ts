"use server";

import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export interface CategoryActionState {
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

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  try {
    const existing = await listCategories(current.supabase, current.user.id);
    await createCategory(
      current.supabase,
      current.user.id,
      String(formData.get("name") ?? ""),
      existing,
    );
    revalidatePath("/settings");
    revalidatePath("/analytics");
    revalidatePath("/budgets");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add the category" };
  }
}

export async function renameCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const categoryId = String(formData.get("id") ?? "");
  if (!categoryId) return { error: "Category not found" };
  try {
    const existing = await listCategories(current.supabase, current.user.id);
    await renameCategory(
      current.supabase,
      current.user.id,
      categoryId,
      String(formData.get("name") ?? ""),
      existing,
    );
    revalidatePath("/settings");
    revalidatePath("/analytics");
    revalidatePath("/budgets");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not rename the category" };
  }
}

export async function deleteCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const categoryId = String(formData.get("id") ?? "");
  if (!categoryId) return { error: "Category not found" };
  try {
    await deleteCategory(current.supabase, current.user.id, categoryId);
    revalidatePath("/settings");
    revalidatePath("/analytics");
    revalidatePath("/budgets");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete the category" };
  }
}