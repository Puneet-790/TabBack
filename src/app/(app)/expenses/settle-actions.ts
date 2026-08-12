"use server";

import { revalidatePath } from "next/cache";
import {
  deleteSettlementById,
  fetchIouById,
  fetchSplitById,
  insertSettlement,
  listSettlementsForIous,
  listSettlementsForSplits,
  type SettlementRow,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { iouSettlementDirection } from "@/lib/ious";
import {
  parseSettlementFormData,
  settlementRowsRemaining,
  validateSplitSettlement,
} from "@/lib/settlements";

export interface SettleActionState {
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

type SettlementDebt =
  | { kind: "split"; id: string; personId: string; amount: number }
  | { kind: "iou"; id: string; personId: string; amount: number; direction: "to_receive" | "to_pay" };

function revalidateFor(formData: FormData) {
  revalidatePath("/expenses");
  revalidatePath("/people");
  revalidatePath("/money-owed");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (expenseId) revalidatePath(`/expenses/${expenseId}`);
}

export async function createSettlementAction(
  _prev: SettleActionState,
  formData: FormData,
): Promise<SettleActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const parsed = parseSettlementFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  let debt: SettlementDebt | null = null;
  try {
    const split = await fetchSplitById(supabase, user.id, parsed.input.debtId);
    if (split) {
      debt = { kind: "split", id: split.id, personId: split.personId, amount: split.amount };
    } else {
      const iou = await fetchIouById(supabase, user.id, parsed.input.debtId);
      if (iou) {
        debt = {
          kind: "iou",
          id: iou.id,
          personId: iou.personId,
          amount: iou.amount,
          direction: iou.direction,
        };
      }
    }
  } catch {
    return { error: "Could not load the debt" };
  }
  if (!debt) return { error: "Debt not found" };

  let rows: SettlementRow[];
  try {
    rows =
      debt.kind === "split"
        ? (await listSettlementsForSplits(supabase, user.id, [debt.id])).get(debt.id) ?? []
        : (await listSettlementsForIous(supabase, user.id, [debt.id])).get(debt.id) ?? [];
  } catch {
    return { error: "Could not load the debt" };
  }
  const remainingAmount = settlementRowsRemaining(
    debt.amount,
    rows.map((row) => row.amount),
  );
  const check = validateSplitSettlement(parsed.input, remainingAmount);
  if (!check.ok) return { error: check.error };

  try {
    await insertSettlement(
      supabase,
      user.id,
      debt.personId,
      debt.kind,
      debt.kind === "split" ? "to_receive" : iouSettlementDirection(debt.direction),
      parsed.input,
    );
  } catch {
    return { error: "Could not save the settlement" };
  }

  revalidateFor(formData);
  return { ok: true };
}

export async function deleteSettlementAction(
  _prev: SettleActionState,
  formData: FormData,
): Promise<SettleActionState> {
  const current = await session();
  if (!current) return { error: "Sign in to continue" };
  const { supabase, user } = current;

  const settlementId = String(formData.get("id") ?? "").trim();
  if (!settlementId) return { error: "Settlement not found" };

  try {
    await deleteSettlementById(supabase, user.id, settlementId);
  } catch {
    return { error: "Could not delete the settlement" };
  }

  revalidateFor(formData);
  return { ok: true };
}