import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_CATEGORY_NAMES = [
  "Food",
  "Groceries",
  "Transport",
  "Travel",
  "Bills",
  "Rent",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Work",
  "Other",
] as const;

export const fallbackCategoryName = "Other";

export const uncategorisedLabel = "Uncategorised";

export const MAX_CATEGORY_NAME_LENGTH = 40;

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

export function validateCategoryName(name: string): string | null {
  const cleaned = name.trim();
  if (cleaned.length === 0) return "Enter a category name";
  if (cleaned.length > MAX_CATEGORY_NAME_LENGTH) {
    return `Keep the name under ${MAX_CATEGORY_NAME_LENGTH} characters`;
  }
  return null;
}

function isDuplicateName(name: string, categories: readonly Category[]): boolean {
  return categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
}

export async function listCategories(
  client: SupabaseClient,
  userId: string,
): Promise<Category[]> {
  const { data, error } = await client
    .from("categories")
    .select("id, user_id, name")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    isDefault: row.user_id === null,
  }));
}

export async function createCategory(
  client: SupabaseClient,
  userId: string,
  name: string,
  existing: readonly Category[],
): Promise<Category> {
  const validationError = validateCategoryName(name);
  if (validationError) throw new Error(validationError);
  const cleaned = name.trim();
  if (isDuplicateName(cleaned, existing)) throw new Error("That category already exists");
  const { data, error } = await client
    .from("categories")
    .insert({ user_id: userId, name: cleaned })
    .select("id, user_id, name")
    .single();
  if (error) throw toUserError(error);
  return { id: data.id, name: data.name, isDefault: false };
}

export async function renameCategory(
  client: SupabaseClient,
  userId: string,
  categoryId: string,
  name: string,
  existing: readonly Category[],
): Promise<void> {
  const validationError = validateCategoryName(name);
  if (validationError) throw new Error(validationError);
  const cleaned = name.trim();
  if (isDuplicateName(cleaned, existing)) throw new Error("That category already exists");
  const { error } = await client
    .from("categories")
    .update({ name: cleaned })
    .eq("id", categoryId)
    .eq("user_id", userId);
  if (error) throw toUserError(error);
}

export async function deleteCategory(
  client: SupabaseClient,
  userId: string,
  categoryId: string,
): Promise<void> {
  const { data: fallback, error: fallbackError } = await client
    .from("categories")
    .select("id")
    .eq("name", fallbackCategoryName)
    .is("user_id", null)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  if (!fallback) throw new Error("Other category is missing");
  const { error: reassignError } = await client
    .from("expenses")
    .update({ category_id: fallback.id })
    .eq("category_id", categoryId)
    .eq("user_id", userId);
  if (reassignError) throw reassignError;
  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);
  if (error) throw toUserError(error);
}

function toUserError(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") return new Error("That category already exists");
  return new Error(error.message ?? "Something went wrong");
}