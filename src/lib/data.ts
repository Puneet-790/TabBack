import type { SupabaseClient } from "@supabase/supabase-js";
import { listCategories } from "@/lib/categories";
import { roundMoney } from "@/lib/ledger";
import type { SplitInput } from "@/lib/split-form";
import {
  isPaymentMethod,
  isValidDate,
  matchesSplitFilter,
  matchesStatusFilter,
  splitState,
  todayLocalIso,
  type PaidShare,
  type SplitShare,
  type SplitState,
} from "@/lib/expenses";
import { buildDebtEntries, type DebtEntry, type DebtSource } from "@/lib/money-owed";
import {
  cleanPersonFields,
  deletePersonRefusal,
  findDuplicatePerson,
  sortPeopleByName,
  validatePersonFields,
  type Person,
  type PersonFields,
  type PersonReferences,
} from "@/lib/people";

export const EXPENSE_PAGE_SIZE = 20;

const MAX_SCAN_PAGES = 8;

export interface ExpenseFilters {
  search: string;
  from: string;
  to: string;
  categoryId: string;
  minAmount: string;
  maxAmount: string;
  paymentMethod: string;
  personId: string;
  split: "all" | "split" | "not_split";
  status: "all" | "pending" | "paid";
}

export interface ExpenseRow {
  id: string;
  amount: number;
  description: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  date: string;
  paymentMethod: string;
  notes: string | null;
  receiptPath: string | null;
  createdAt: string;
  updatedAt: string;
  splitState: SplitState;
  splits: SplitShare[];
}

export interface ExpensePageResult {
  items: ExpenseRow[];
  offset: number;
  hasMore: boolean;
}

export type PersonRow = Person;

export interface SettlementRow {
  id: string;
  personId: string;
  personName: string | null;
  debtType: "split" | "iou";
  debtId: string;
  amount: number;
  direction: "to_receive" | "to_pay";
  paymentMethod: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface SplitLookup {
  id: string;
  expenseId: string;
  personId: string;
  amount: number;
  dueDate: string | null;
}

export interface IouRow {
  id: string;
  personId: string;
  personName: string | null;
  amount: number;
  direction: "to_receive" | "to_pay";
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface IouLookup {
  id: string;
  personId: string;
  amount: number;
  direction: "to_receive" | "to_pay";
}

export interface SplitContextRow {
  id: string;
  personId: string;
  personName: string | null;
  amount: number;
  expenseId: string;
  expenseDescription: string;
  expenseDate: string;
  dueDate: string | null;
  createdAt: string;
}

export interface ReminderRow {
  id: string;
  personId: string;
  debtType: "split" | "iou";
  debtId: string;
  sentAt: string;
}

interface RawExpense {
  id: string;
  amount: string;
  description: string;
  category_id: string | null;
  categories: { id: string; name: string } | { id: string; name: string }[] | null;
  date: string;
  payment_method: string;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
  splits: { id: string; person_id: string; amount: string; due_date: string | null; people: { name: string } | { name: string }[] | null }[];
}

export function parseFilters(
  source: Record<string, string | string[] | undefined>,
): ExpenseFilters {
  const first = (key: string): string => {
    const value = source[key];
    return typeof value === "string" ? value : "";
  };
  const search = first("q").trim();
  const from = validDateOrEmpty(first("from"));
  const to = validDateOrEmpty(first("to"));
  const categoryId = first("category");
  const minAmount = validAmountOrEmpty(first("min"));
  const maxAmount = validAmountOrEmpty(first("max"));
  const paymentMethod = first("method");
  const personId = first("person");
  const splitRaw = first("split");
  const statusRaw = first("status");
  return {
    search,
    from,
    to,
    categoryId,
    minAmount,
    maxAmount,
    paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : "",
    personId,
    split: splitRaw === "split" || splitRaw === "not_split" ? splitRaw : "all",
    status: statusRaw === "pending" || statusRaw === "paid" ? statusRaw : "all",
  };
}

export function filtersToQuery(filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.minAmount) params.set("min", filters.minAmount);
  if (filters.maxAmount) params.set("max", filters.maxAmount);
  if (filters.paymentMethod) params.set("method", filters.paymentMethod);
  if (filters.personId) params.set("person", filters.personId);
  if (filters.split !== "all") params.set("split", filters.split);
  if (filters.status !== "all") params.set("status", filters.status);
  return params.toString();
}

export async function fetchExpensesPage(
  client: SupabaseClient,
  userId: string,
  filters: ExpenseFilters,
  offset: number,
  limit: number,
): Promise<ExpensePageResult> {
  const items: ExpenseRow[] = [];
  let rawOffset = offset;
  let hasMoreRaw = true;

  for (let scan = 0; scan < MAX_SCAN_PAGES && items.length < limit && hasMoreRaw; scan++) {
    let query = client
      .from("expenses")
      .select(
        "id, amount, description, category_id, date, payment_method, notes, receipt_path, created_at, updated_at, categories(id, name), splits(id, person_id, amount, due_date, people(name))",
      )
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(rawOffset, rawOffset + limit - 1);

    if (filters.search) {
      const escaped = escapeLike(filters.search);
      query = query.or(`description.ilike.%${escaped}%,notes.ilike.%${escaped}%`);
    }
    if (filters.from) query = query.gte("date", filters.from);
    if (filters.to) query = query.lte("date", filters.to);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.minAmount) query = query.gte("amount", Number(filters.minAmount));
    if (filters.maxAmount) query = query.lte("amount", Number(filters.maxAmount));
    if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);

    const { data, error } = await query;
    if (error) throw error;

    hasMoreRaw = data.length === limit;
    rawOffset += data.length;
    if (data.length === 0) break;

    const splitIds = data.flatMap((row) => row.splits.map((split) => split.id));
    const paidShares = await fetchPaidShares(client, userId, splitIds);
    const paidBySplit = new Map(paidShares.map((paid) => [paid.debtId, paid]));

    for (const raw of data) {
      const row = toExpenseRow(raw, paidBySplit);
      if (filters.personId && !row.splits.some((split) => split.personId === filters.personId)) {
        continue;
      }
      if (!matchesSplitFilter(row.splitState, filters.split)) continue;
      if (!matchesStatusFilter(row.splitState, filters.status)) continue;
      items.push(row);
      if (items.length === limit) break;
    }
  }

  return { items, offset: rawOffset, hasMore: hasMoreRaw };
}

export async function fetchExpenseById(
  client: SupabaseClient,
  userId: string,
  expenseId: string,
): Promise<ExpenseRow | null> {
  const { data, error } = await client
    .from("expenses")
    .select(
      "id, amount, description, category_id, date, payment_method, notes, receipt_path, created_at, updated_at, categories(id, name), splits(id, person_id, amount, due_date, people(name))",
    )
    .eq("id", expenseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const paidShares = await fetchPaidShares(
    client,
    userId,
    data.splits.map((split) => split.id),
  );
  return toExpenseRow(data, new Map(paidShares.map((paid) => [paid.debtId, paid])));
}

export async function listPeople(
  client: SupabaseClient,
  userId: string,
): Promise<PersonRow[]> {
  const { data, error } = await client
    .from("people")
    .select("id, name, phone, email")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return sortPeopleByName(data);
}

export async function fetchPersonReferences(
  client: SupabaseClient,
  userId: string,
  personId: string,
): Promise<PersonReferences> {
  async function count(table: "splits" | "ious" | "settlements" | "reminders") {
    const { count, error } = await client
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("person_id", personId)
      .eq("user_id", userId);
    if (error) throw error;
    return count ?? 0;
  }
  const [splits, ious, settlements, reminders] = await Promise.all([
    count("splits"),
    count("ious"),
    count("settlements"),
    count("reminders"),
  ]);
  return { splits, ious, settlements, reminders };
}

export async function createPerson(
  client: SupabaseClient,
  userId: string,
  fields: PersonFields,
  existing: readonly PersonRow[],
): Promise<PersonRow> {
  const validationError = validatePersonFields(fields);
  if (validationError) throw new Error(validationError);
  const cleaned = cleanPersonFields(fields.name, fields.phone, fields.email);
  const duplicate = findDuplicatePerson(cleaned, existing);
  if (duplicate) return duplicate;
  const { data, error } = await client
    .from("people")
    .insert({
      user_id: userId,
      name: cleaned.name,
      phone: cleaned.phone || null,
      email: cleaned.email || null,
    })
    .select("id, name, phone, email")
    .single();
  if (error) {
    if (error.code === "23505") {
      const raced = findDuplicatePerson(cleaned, await listPeople(client, userId));
      if (raced) return raced;
    }
    throw toUserError(error);
  }
  return data;
}

export async function updatePerson(
  client: SupabaseClient,
  userId: string,
  personId: string,
  fields: PersonFields,
  existing: readonly PersonRow[],
): Promise<void> {
  const validationError = validatePersonFields(fields);
  if (validationError) throw new Error(validationError);
  const cleaned = cleanPersonFields(fields.name, fields.phone, fields.email);
  if (findDuplicatePerson(cleaned, existing, personId)) {
    throw new Error("That person already exists");
  }
  const { error } = await client
    .from("people")
    .update({
      name: cleaned.name,
      phone: cleaned.phone || null,
      email: cleaned.email || null,
    })
    .eq("id", personId)
    .eq("user_id", userId);
  if (error) throw toUserError(error);
}

export async function deletePerson(
  client: SupabaseClient,
  userId: string,
  personId: string,
  references: PersonReferences,
): Promise<void> {
  const refusal = deletePersonRefusal(references);
  if (refusal) throw new Error(refusal);
  const { error } = await client
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not delete the person");
}

export async function insertExpenseSplits(
  client: SupabaseClient,
  userId: string,
  expenseId: string,
  rows: readonly SplitInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client.from("splits").insert(
    rows.map((row) => ({
      user_id: userId,
      expense_id: expenseId,
      person_id: row.personId,
      amount: roundMoney(row.amount),
      due_date: row.dueDate,
    })),
  );
  if (error) throw new Error("Could not save the split");
}

export async function replaceExpenseSplits(
  client: SupabaseClient,
  userId: string,
  expenseId: string,
  rows: readonly SplitInput[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("splits")
    .delete()
    .eq("expense_id", expenseId)
    .eq("user_id", userId);
  if (deleteError) throw new Error("Could not update the split");
  await insertExpenseSplits(client, userId, expenseId, rows);
}

export async function fetchValidPersonIds(
  client: SupabaseClient,
  userId: string,
  personIds: readonly string[],
): Promise<string[]> {
  if (personIds.length === 0) return [];
  const { data, error } = await client
    .from("people")
    .select("id")
    .eq("user_id", userId)
    .in("id", personIds);
  if (error) throw error;
  return data.map((row) => row.id);
}

export async function countSettlementsForExpense(
  client: SupabaseClient,
  userId: string,
  expenseId: string,
): Promise<number> {
  const { data: splits, error: splitsError } = await client
    .from("splits")
    .select("id")
    .eq("expense_id", expenseId)
    .eq("user_id", userId);
  if (splitsError) throw splitsError;
  if (splits.length === 0) return 0;
  const { count, error } = await client
    .from("settlements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("debt_type", "split")
    .in(
      "debt_id",
      splits.map((row) => row.id),
    );
  if (error) throw error;
  return count ?? 0;
}

interface RawSettlement {
  id: string;
  person_id: string;
  people: { name: string } | { name: string }[] | null;
  debt_type: "split" | "iou";
  debt_id: string;
  amount: string;
  direction: "to_receive" | "to_pay";
  payment_method: string;
  date: string;
  notes: string | null;
  created_at: string;
}

function toSettlementRow(raw: RawSettlement): SettlementRow {
  return {
    id: raw.id,
    personId: raw.person_id,
    personName: single(raw.people)?.name ?? null,
    debtType: raw.debt_type,
    debtId: raw.debt_id,
    amount: roundMoney(Number(raw.amount)),
    direction: raw.direction,
    paymentMethod: raw.payment_method,
    date: raw.date,
    notes: raw.notes,
    createdAt: raw.created_at,
  };
}

const SETTLEMENT_SELECT =
  "id, person_id, debt_type, debt_id, amount, direction, payment_method, date, notes, created_at, people(name)";

export async function listSettlementsForSplits(
  client: SupabaseClient,
  userId: string,
  splitIds: readonly string[],
): Promise<Map<string, SettlementRow[]>> {
  return listSettlementsGrouped(client, userId, "split", splitIds);
}

export async function listSettlementsForIous(
  client: SupabaseClient,
  userId: string,
  iouIds: readonly string[],
): Promise<Map<string, SettlementRow[]>> {
  return listSettlementsGrouped(client, userId, "iou", iouIds);
}

async function listSettlementsGrouped(
  client: SupabaseClient,
  userId: string,
  debtType: "split" | "iou",
  ids: readonly string[],
): Promise<Map<string, SettlementRow[]>> {
  const grouped = new Map<string, SettlementRow[]>();
  for (let start = 0; start < ids.length; start += 400) {
    const chunk = ids.slice(start, start + 400);
    if (chunk.length === 0) continue;
    const { data, error } = await client
      .from("settlements")
      .select(SETTLEMENT_SELECT)
      .eq("user_id", userId)
      .eq("debt_type", debtType)
      .in("debt_id", chunk)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    for (const raw of data as unknown as RawSettlement[]) {
      const row = toSettlementRow(raw);
      const list = grouped.get(row.debtId) ?? [];
      list.push(row);
      grouped.set(row.debtId, list);
    }
  }
  return grouped;
}

export async function listSettlementsForPerson(
  client: SupabaseClient,
  userId: string,
  personId: string,
): Promise<SettlementRow[]> {
  const { data, error } = await client
    .from("settlements")
    .select(SETTLEMENT_SELECT)
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawSettlement[]).map(toSettlementRow);
}

export async function fetchSplitById(
  client: SupabaseClient,
  userId: string,
  splitId: string,
): Promise<SplitLookup | null> {
  const { data, error } = await client
    .from("splits")
    .select("id, expense_id, person_id, amount, due_date")
    .eq("id", splitId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    expenseId: data.expense_id,
    personId: data.person_id,
    amount: roundMoney(Number(data.amount)),
    dueDate: data.due_date,
  };
}

const IOUS_SELECT =
  "id, person_id, amount, direction, date, notes, created_at, people(name)";

interface RawIou {
  id: string;
  person_id: string;
  amount: string;
  direction: "to_receive" | "to_pay";
  date: string;
  notes: string | null;
  created_at: string;
  people: { name: string } | { name: string }[] | null;
}

function toIouRow(raw: RawIou): IouRow {
  return {
    id: raw.id,
    personId: raw.person_id,
    personName: single(raw.people)?.name ?? null,
    amount: roundMoney(Number(raw.amount)),
    direction: raw.direction,
    date: raw.date,
    notes: raw.notes,
    createdAt: raw.created_at,
  };
}

export async function listIous(
  client: SupabaseClient,
  userId: string,
): Promise<IouRow[]> {
  const { data, error } = await client
    .from("ious")
    .select(IOUS_SELECT)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawIou[]).map(toIouRow);
}

export async function fetchIouById(
  client: SupabaseClient,
  userId: string,
  iouId: string,
): Promise<IouLookup | null> {
  const { data, error } = await client
    .from("ious")
    .select("id, person_id, amount, direction")
    .eq("id", iouId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    personId: data.person_id,
    amount: roundMoney(Number(data.amount)),
    direction: data.direction,
  };
}

export async function insertIou(
  client: SupabaseClient,
  userId: string,
  input: {
    personId: string;
    amount: number;
    direction: "to_receive" | "to_pay";
    date: string;
    note: string | null;
  },
): Promise<void> {
  const { error } = await client.from("ious").insert({
    user_id: userId,
    person_id: input.personId,
    amount: roundMoney(input.amount),
    direction: input.direction,
    date: input.date,
    notes: input.note,
  });
  if (error) throw new Error("Could not save the IOU");
}

export async function insertSettlement(
  client: SupabaseClient,
  userId: string,
  personId: string,
  debtType: "split" | "iou",
  direction: "to_receive" | "to_pay",
  input: {
    debtId: string;
    amount: number;
    method: string;
    date: string;
    note: string | null;
  },
): Promise<void> {
  const { error } = await client.from("settlements").insert({
    user_id: userId,
    person_id: personId,
    debt_type: debtType,
    debt_id: input.debtId,
    amount: roundMoney(input.amount),
    direction,
    payment_method: input.method,
    date: input.date,
    notes: input.note,
  });
  if (error) throw new Error("Could not save the settlement");
}

export async function deleteSettlementById(
  client: SupabaseClient,
  userId: string,
  settlementId: string,
): Promise<void> {
  const { error } = await client
    .from("settlements")
    .delete()
    .eq("id", settlementId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not delete the settlement");
}

const SPLITS_CONTEXT_SELECT =
  "id, expense_id, person_id, amount, due_date, created_at, people(name), expenses(description, date)";

interface RawSplitContext {
  id: string;
  expense_id: string;
  person_id: string;
  amount: string;
  due_date: string | null;
  created_at: string;
  people: { name: string } | { name: string }[] | null;
  expenses:
    | { description: string; date: string }
    | { description: string; date: string }[]
    | null;
}

export async function listSplitsWithContext(
  client: SupabaseClient,
  userId: string,
): Promise<SplitContextRow[]> {
  const { data, error } = await client
    .from("splits")
    .select(SPLITS_CONTEXT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawSplitContext[]).map((raw) => {
    const expense = single(raw.expenses);
    return {
      id: raw.id,
      personId: raw.person_id,
      personName: single(raw.people)?.name ?? null,
      amount: roundMoney(Number(raw.amount)),
      expenseId: raw.expense_id,
      expenseDescription: expense?.description ?? "",
      expenseDate: expense?.date ?? raw.created_at.slice(0, 10),
      dueDate: raw.due_date,
      createdAt: raw.created_at,
    };
  });
}

export async function recordReminder(
  client: SupabaseClient,
  userId: string,
  personId: string,
  debtType: "split" | "iou",
  debtId: string,
): Promise<void> {
  const { error } = await client.from("reminders").insert({
    user_id: userId,
    person_id: personId,
    debt_type: debtType,
    debt_id: debtId,
  });
  if (error) throw new Error("Could not save the reminder");
}

export async function listRemindersForPerson(
  client: SupabaseClient,
  userId: string,
  personId: string,
): Promise<ReminderRow[]> {
  const { data, error } = await client
    .from("reminders")
    .select("id, person_id, debt_type, debt_id, sent_at")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    personId: row.person_id,
    debtType: row.debt_type as "split" | "iou",
    debtId: row.debt_id,
    sentAt: row.sent_at,
  }));
}

export interface DebtView {
  entries: DebtEntry[];
  settlementsByDebt: Record<string, SettlementRow[]>;
}

export async function fetchDebtView(
  client: SupabaseClient,
  userId: string,
): Promise<DebtView> {
  const [splits, ious, people] = await Promise.all([
    listSplitsWithContext(client, userId),
    listIous(client, userId),
    listPeople(client, userId),
  ]);
  const [settlementsBySplit, settlementsByIou] = await Promise.all([
    listSettlementsForSplits(
      client,
      userId,
      splits.map((split) => split.id),
    ),
    listSettlementsForIous(
      client,
      userId,
      ious.map((iou) => iou.id),
    ),
  ]);

  const phones = new Map(people.map((person) => [person.id, person.phone ?? null]));
  const sources: DebtSource[] = [
    ...splits.map((split) => ({
      id: split.id,
      personId: split.personId,
      personName: split.personName ?? "Unknown person",
      phone: phones.get(split.personId) ?? null,
      amount: split.amount,
      type: "split" as const,
      direction: "to_receive" as const,
      expenseDate: split.expenseDate,
      dueDate: split.dueDate ?? undefined,
      contextLabel: split.expenseDescription.trim() || null,
      expenseId: split.expenseId,
      createdAt: split.createdAt,
    })),
    ...ious.map((iou) => ({
      id: iou.id,
      personId: iou.personId,
      personName: iou.personName ?? "Unknown person",
      phone: phones.get(iou.personId) ?? null,
      amount: iou.amount,
      type: "iou" as const,
      direction: iou.direction,
      expenseDate: iou.date,
      contextLabel: iou.notes?.trim() || null,
      createdAt: iou.createdAt,
    })),
  ];

  const settlementAmounts = new Map<string, number[]>();
  const settlementsByDebt: Record<string, SettlementRow[]> = {};
  for (const [debtId, rows] of settlementsBySplit) {
    settlementAmounts.set(debtId, rows.map((row) => row.amount));
    settlementsByDebt[debtId] = rows;
  }
  for (const [debtId, rows] of settlementsByIou) {
    settlementAmounts.set(debtId, rows.map((row) => row.amount));
    settlementsByDebt[debtId] = rows;
  }

  return {
    entries: buildDebtEntries(sources, settlementAmounts, todayLocalIso()),
    settlementsByDebt,
  };
}

function toExpenseRow(
  raw: RawExpense,
  paidBySplit: Map<string, PaidShare>,
): ExpenseRow {
  const category = single(raw.categories);
  const shares: SplitShare[] = raw.splits.map((split) => ({
    id: split.id,
    personId: split.person_id,
    amount: roundMoney(Number(split.amount)),
    expenseDate: raw.date,
    dueDate: split.due_date ?? undefined,
    personName: single(split.people)?.name,
  }));
  return {
    id: raw.id,
    amount: roundMoney(Number(raw.amount)),
    description: raw.description,
    categoryId: raw.category_id,
    category: category ?? null,
    date: raw.date,
    paymentMethod: raw.payment_method,
    notes: raw.notes,
    receiptPath: raw.receipt_path,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    splitState: splitState(shares, Array.from(paidBySplit.values())),
    splits: shares,
  };
}

function single<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchPaidShares(
  client: SupabaseClient,
  userId: string,
  splitIds: readonly string[],
): Promise<PaidShare[]> {
  const totals = new Map<string, number>();
  for (let start = 0; start < splitIds.length; start += 400) {
    const chunk = splitIds.slice(start, start + 400);
    if (chunk.length === 0) continue;
    const { data, error } = await client
      .from("settlements")
      .select("debt_id, amount")
      .eq("user_id", userId)
      .eq("debt_type", "split")
      .in("debt_id", chunk);
    if (error) throw error;
    for (const row of data) {
      const amount = roundMoney(Number(row.amount));
      totals.set(row.debt_id, roundMoney((totals.get(row.debt_id) ?? 0) + amount));
    }
  }
  return Array.from(totals, ([debtId, amount]) => ({ debtId, amount }));
}

export function parseOffset(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function validDateOrEmpty(value: string): string {
  return isValidDate(value) ? value : "";
}

function validAmountOrEmpty(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const parsed = Number(trimmed.replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return String(parsed);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function toUserError(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") return new Error("That person already exists");
  return new Error(error.message ?? "Something went wrong");
}

export interface BudgetRow {
  id: string;
  month: string;
  overallLimit: number;
  categoryLimits: Record<string, number>;
}

function parseCategoryLimits(raw: unknown): Record<string, number> {
  const limits: Record<string, number> = {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return limits;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) limits[key] = roundMoney(parsed);
  }
  return limits;
}

export async function fetchBudget(
  client: SupabaseClient,
  userId: string,
  month: string,
): Promise<BudgetRow | null> {
  const { data, error } = await client
    .from("budgets")
    .select("id, month, overall_limit, category_limits")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    month: data.month,
    overallLimit: roundMoney(Number(data.overall_limit)),
    categoryLimits: parseCategoryLimits(data.category_limits),
  };
}

export async function upsertBudget(
  client: SupabaseClient,
  userId: string,
  month: string,
  overallLimit: number,
  categoryLimits: Record<string, number>,
): Promise<BudgetRow> {
  const cleaned: Record<string, number> = {};
  for (const [key, value] of Object.entries(categoryLimits)) {
    const parsed = roundMoney(Number(value));
    if (Number.isFinite(parsed)) cleaned[key] = parsed;
  }
  const { data, error } = await client
    .from("budgets")
    .upsert(
      {
        user_id: userId,
        month,
        overall_limit: roundMoney(overallLimit),
        category_limits: cleaned,
      },
      { onConflict: "user_id,month" },
    )
    .select("id, month, overall_limit, category_limits")
    .single();
  if (error) throw new Error("Could not save the budget");
  return {
    id: data.id,
    month: data.month,
    overallLimit: roundMoney(Number(data.overall_limit)),
    categoryLimits: parseCategoryLimits(data.category_limits),
  };
}

export async function deleteBudget(
  client: SupabaseClient,
  userId: string,
  month: string,
): Promise<void> {
  const { error } = await client
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("month", month);
  if (error) throw new Error("Could not delete the budget");
}

export async function fetchValidBudgetCategoryIds(
  client: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const categories = await listCategories(client, userId);
  return categories.map((category) => category.id);
}