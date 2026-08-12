"use server";

import { revalidatePath } from "next/cache";
import {
  fetchIouById,
  fetchSplitById,
  fetchValidPersonIds,
  insertIou,
  listSettlementsForIous,
  listSettlementsForSplits,
  recordReminder,
} from "@/lib/data";
import { parseIouFormData } from "@/lib/ious";
import { settlementRowsRemaining } from "@/lib/settlements";
import { createClient } from "@/lib/supabase/server";

export interface MoneyOwedActionState {
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

export async function createIouAction(
  _prev: MoneyOwedActionState,
  formData: FormData,
): Promise<MoneyOwedActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const parsed = parseIouFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const validIds = await fetchValidPersonIds(supabase, user.id, [parsed.input.personId]);
    if (validIds.length !== 1) return { error: "Choose a valid person" };
  } catch {
    return { error: "Could not save the IOU" };
  }

  try {
    await insertIou(supabase, user.id, parsed.input);
  } catch {
    return { error: "Could not save the IOU" };
  }

  revalidatePath("/money-owed");
  revalidatePath("/people");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  return { ok: true };
}

export async function recordReminderAction(
  _prev: MoneyOwedActionState,
  formData: FormData,
): Promise<MoneyOwedActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const debtType = String(formData.get("debt_type") ?? "");
  if (debtType !== "split" && debtType !== "iou") return { error: "Debt not found" };
  const debtId = String(formData.get("debt_id") ?? "").trim();
  if (!debtId) return { error: "Debt not found" };
  const personId = String(formData.get("person_id") ?? "").trim();
  if (!personId) return { error: "Person not found" };

  try {
    const debt =
      debtType === "split"
        ? await fetchSplitById(supabase, user.id, debtId)
        : await fetchIouById(supabase, user.id, debtId);
    if (!debt || debt.personId !== personId) return { error: "Debt not found" };
    const rows =
      debtType === "split"
        ? (await listSettlementsForSplits(supabase, user.id, [debtId])).get(debtId) ?? []
        : (await listSettlementsForIous(supabase, user.id, [debtId])).get(debtId) ?? [];
    const remainingAmount = settlementRowsRemaining(
      debt.amount,
      rows.map((row) => row.amount),
    );
    if (remainingAmount <= 0) return { error: "This debt is already settled" };
  } catch {
    return { error: "Could not save the reminder" };
  }

  try {
    await recordReminder(supabase, user.id, personId, debtType, debtId);
  } catch {
    return { error: "Could not save the reminder" };
  }

  revalidatePath("/people");
  revalidatePath("/money-owed");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { ok: true };
}