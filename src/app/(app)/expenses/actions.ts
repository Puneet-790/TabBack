"use server";

import { revalidatePath } from "next/cache";
import {
  countSettlementsForExpense,
  fetchValidPersonIds,
  insertExpenseSplits,
  replaceExpenseSplits,
} from "@/lib/data";
import {
  isPaymentMethod,
  isValidDate,
  parseExpenseAmount,
  receiptPathFor,
  validateReceiptFile,
} from "@/lib/expenses";
import { splitInputsFromFormData, validateSplitInputs, type SplitInput } from "@/lib/split-form";
import { roundMoney } from "@/lib/ledger";
import { lockedFieldsChanged } from "@/lib/settlements";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExpenseActionState {
  ok?: boolean;
  id?: string;
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

async function resolveCategoryId(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string,
): Promise<{ ok: boolean; id: string | null }> {
  const trimmed = categoryId.trim();
  if (!trimmed) return { ok: true, id: null };
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("id", trimmed)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();
  if (!data) return { ok: false, id: null };
  return { ok: true, id: data.id };
}

function nullableString(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

async function uploadOrError(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const fileError = validateReceiptFile(file);
  if (fileError) return { ok: false, error: fileError };
  const path = receiptPathFor(userId, file.name);
  if (!path) return { ok: false, error: "Unsupported receipt file type" };
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: `Receipt upload failed: ${error.message}` };
  return { ok: true, path };
}

async function parseSplits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  formData: FormData,
): Promise<{ ok: true; rows: SplitInput[] } | { ok: false; error: string }> {
  const parsed = splitInputsFromFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const validated = validateSplitInputs(amount, parsed.rows);
  if (!validated.ok) return { ok: false, error: validated.error };
  if (validated.rows.length === 0) return { ok: true, rows: [] };
  try {
    const validIds = await fetchValidPersonIds(
      supabase,
      userId,
      validated.rows.map((row) => row.personId),
    );
    if (validIds.length !== validated.rows.length) {
      return { ok: false, error: "Choose valid people for the split" };
    }
  } catch {
    return { ok: false, error: "Could not save the split" };
  }
  return { ok: true, rows: validated.rows };
}

export async function createExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const amount = parseExpenseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { error: "Enter a valid amount" };
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Enter a description" };
  const date = String(formData.get("date") ?? "");
  if (!isValidDate(date)) return { error: "Enter a valid date" };
  const paymentMethod = String(formData.get("payment_method") ?? "");
  if (!isPaymentMethod(paymentMethod)) return { error: "Choose a payment method" };
  const category = await resolveCategoryId(
    supabase,
    user.id,
    String(formData.get("category_id") ?? ""),
  );
  if (!category.ok) return { error: "Choose a valid category" };
  const notes = nullableString(formData.get("notes"));

  const splits = await parseSplits(supabase, user.id, amount, formData);
  if (!splits.ok) return { error: splits.error };

  const receiptFile = formData.get("receipt");
  let receiptPath: string | null = null;
  if (receiptFile instanceof File && receiptFile.size > 0) {
    const upload = await uploadOrError(supabase, user.id, receiptFile);
    if (!upload.ok) return { error: upload.error };
    receiptPath = upload.path;
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      amount,
      description,
      category_id: category.id,
      date,
      payment_method: paymentMethod,
      notes,
      receipt_path: receiptPath,
    })
    .select("id")
    .single();
  if (error) {
    if (receiptPath) {
      await supabase.storage.from("receipts").remove([receiptPath]).catch(() => undefined);
    }
    return { error: "Could not save the expense" };
  }

  if (splits.rows.length > 0) {
    try {
      await insertExpenseSplits(supabase, user.id, data.id, splits.rows);
    } catch {
      try {
        await supabase
          .from("expenses")
          .delete()
          .eq("id", data.id)
          .eq("user_id", user.id);
      } catch {
        return { error: "Could not save the split" };
      }
      if (receiptPath) {
        await supabase.storage.from("receipts").remove([receiptPath]).catch(() => undefined);
      }
      return { error: "Could not save the split" };
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  return { ok: true, id: data.id };
}

export async function updateExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const expenseId = String(formData.get("id") ?? "");
  if (!expenseId) return { error: "Expense not found" };

  const amount = parseExpenseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { error: "Enter a valid amount" };
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Enter a description" };
  const date = String(formData.get("date") ?? "");
  if (!isValidDate(date)) return { error: "Enter a valid date" };
  const paymentMethod = String(formData.get("payment_method") ?? "");
  if (!isPaymentMethod(paymentMethod)) return { error: "Choose a payment method" };
  const category = await resolveCategoryId(
    supabase,
    user.id,
    String(formData.get("category_id") ?? ""),
  );
  if (!category.ok) return { error: "Choose a valid category" };
  const notes = nullableString(formData.get("notes"));

  const splits = await parseSplits(supabase, user.id, amount, formData);
  if (!splits.ok) return { error: splits.error };
  const splitSubmitted = String(formData.get("split_submitted") ?? "") === "on";

  const { data: existing } = await supabase
    .from("expenses")
    .select("id, receipt_path, amount, payment_method")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Expense not found" };

  const settled = await (async () => {
    try {
      return await countSettlementsForExpense(supabase, user.id, expenseId);
    } catch {
      return -1;
    }
  })();
  if (settled === -1) return { error: "Could not save the expense" };
  if (settled > 0) {
    if (lockedFieldsChanged(
      { amount: roundMoney(Number(existing.amount)), paymentMethod: existing.payment_method },
      { amount, paymentMethod },
    )) {
      return {
        error:
          "This expense has settlements — amount and payment method are locked. Delete the settlements to edit them.",
      };
    }
    if (splitSubmitted) {
      return { error: "Expense is locked — settle debts or delete settlements first" };
    }
  }

  const receiptFile = formData.get("receipt");
  const removeReceipt = String(formData.get("remove_receipt") ?? "") === "on";
  let receiptPath = existing.receipt_path;
  if (receiptFile instanceof File && receiptFile.size > 0) {
    const upload = await uploadOrError(supabase, user.id, receiptFile);
    if (!upload.ok) return { error: upload.error };
    receiptPath = upload.path;
  } else if (removeReceipt) {
    receiptPath = null;
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      amount,
      description,
      category_id: category.id,
      date,
      payment_method: paymentMethod,
      notes,
      receipt_path: receiptPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("user_id", user.id);
  if (error) {
    if (receiptPath && receiptPath !== existing.receipt_path) {
      await supabase.storage.from("receipts").remove([receiptPath]).catch(() => undefined);
    }
    return { error: "Could not save the expense" };
  }

  if (splitSubmitted) {
    try {
      await replaceExpenseSplits(supabase, user.id, expenseId, splits.rows);
    } catch {
      return { error: "Could not save the split" };
    }
  }

  if (existing.receipt_path && existing.receipt_path !== receiptPath) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]).catch(() => undefined);
  }

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  return { ok: true, id: expenseId };
}

export async function deleteExpenseAction(formData: FormData): Promise<ExpenseActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const expenseId = String(formData.get("id") ?? "");
  if (!expenseId) return { error: "Expense not found" };

  const { data: existing } = await supabase
    .from("expenses")
    .select("id, receipt_path")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Expense not found" };

  const settled = await (async () => {
    try {
      return await countSettlementsForExpense(supabase, user.id, expenseId);
    } catch {
      return -1;
    }
  })();
  if (settled === -1) return { error: "Could not delete the expense" };
  if (settled > 0) {
    return {
      error:
        settled === 1
          ? "Delete the 1 settlement on this expense first"
          : `Delete the ${settled} settlements on this expense first`,
    };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("user_id", user.id);
  if (error) return { error: "Could not delete the expense" };

  if (existing.receipt_path) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]).catch(() => undefined);
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  return { ok: true };
}