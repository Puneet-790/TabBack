import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/0001_init.sql";
const sql = readFileSync(new URL(`../${MIGRATION}`, import.meta.url), "utf8");

const userScopedTables = [
  "demo_items",
  "expenses",
  "people",
  "splits",
  "ious",
  "settlements",
  "reminders",
  "budgets",
];

const DEFAULT_CATEGORIES = [
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
];

describe("0001_init.sql", () => {
  it("enables row level security on every user table", () => {
    for (const table of [...userScopedTables, "profiles", "categories"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("scopes every user table policy to auth.uid()", () => {
    const userScopedPolicies = (sql.match(/for select using \(auth\.uid\(\) = user_id\)/g) ?? [])
      .length;
    const updatePolicies = (sql.match(/for update using \(auth\.uid\(\) = user_id\)/g) ?? [])
      .length;
    const deletePolicies = (sql.match(/for delete using \(auth\.uid\(\) = user_id\)/g) ?? [])
      .length;
    const insertPolicies = (sql.match(/for insert with check \(auth\.uid\(\) = user_id\)/g) ?? [])
      .length;

    expect(userScopedPolicies).toBeGreaterThanOrEqual(userScopedTables.length);
    expect(updatePolicies).toBeGreaterThanOrEqual(userScopedTables.length);
    expect(deletePolicies).toBeGreaterThanOrEqual(userScopedTables.length);
    expect(insertPolicies).toBeGreaterThanOrEqual(userScopedTables.length);
  });

  it("protects the demo table with its own policy", () => {
    expect(sql).toContain(
      'create policy demo_items_select_own on public.demo_items\n  for select using (auth.uid() = user_id);',
    );
    expect(sql).toContain(
      'create policy demo_items_insert_own on public.demo_items\n  for insert with check (auth.uid() = user_id);',
    );
  });

  it("lets everyone read default categories but only owners mutate their own", () => {
    expect(sql).toContain("using (user_id is null or auth.uid() = user_id)");
    expect(sql).toContain("create policy categories_insert_own on public.categories\n  for insert with check (auth.uid() = user_id);");
  });

  it("gives splits its own user_id so RLS scopes to auth.uid()", () => {
    const splitsStart = sql.indexOf("create table if not exists public.splits");
    const iousStart = sql.indexOf("create table if not exists public.ious");
    const splitsSection = sql.slice(splitsStart, iousStart);
    expect(splitsSection).toContain(
      "user_id uuid not null references auth.users (id) on delete cascade",
    );
    expect(splitsSection).toContain(
      "create policy splits_select_own on public.splits\n  for select using (auth.uid() = user_id);",
    );
    expect(splitsSection).toContain(
      "create policy splits_insert_own on public.splits\n  for insert with check (auth.uid() = user_id);",
    );
  });

  it("creates the profile sync trigger for new users", () => {
    expect(sql).toContain("create or replace function public.handle_new_user()");
    expect(sql).toContain("insert into public.profiles (id, email)");
    expect(sql).toContain(
      "create trigger on_auth_user_created\n  after insert on auth.users\n  for each row execute function public.handle_new_user();",
    );
    expect(sql).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });

  it("seeds the 12 default categories idempotently", () => {
    for (const name of DEFAULT_CATEGORIES) {
      expect(sql).toContain(`'${name}'`);
    }
    expect(sql).toContain("on conflict (name) where user_id is null do nothing");
  });
});

const MIGRATION_02 = "supabase/migrations/0002_expenses.sql";
const sql02 = readFileSync(new URL(`../${MIGRATION_02}`, import.meta.url), "utf8");

describe("0002_expenses.sql", () => {
  it("adds the description column idempotently", () => {
    expect(sql02).toContain(
      "alter table public.expenses\n  add column if not exists description text not null default '';",
    );
  });

  it("enforces the payment method as a named check constraint", () => {
    expect(sql02).toContain(
      "alter table public.expenses\n  drop constraint if exists expenses_payment_method_check;",
    );
    expect(sql02).toContain(
      "alter table public.expenses\n  add constraint expenses_payment_method_check",
    );
    expect(sql02).toContain(
      "check (payment_method in ('Cash', 'Bank transfer', 'UPI', 'Other'))",
    );
  });

  it("indexes expenses by user and recency for pagination", () => {
    expect(sql02).toContain(
      "on public.expenses (user_id, date desc, created_at desc)",
    );
  });

  it("re-seeds the 12 default categories idempotently", () => {
    for (const name of DEFAULT_CATEGORIES) {
      expect(sql02).toContain(`(null, '${name}')`);
    }
    expect(sql02).toContain("on conflict (name) where user_id is null do nothing");
  });

  it("creates the private receipts bucket idempotently", () => {
    expect(sql02).toContain(
      "insert into storage.buckets (id, name, public)\nvalues ('receipts', 'receipts', false)\non conflict (id) do nothing;",
    );
  });

  it("scopes storage objects policies to the receipt bucket owner", () => {
    expect(sql02).not.toContain("alter table storage.objects enable row level security;");
    expect(sql02).toContain(
      "for select using (bucket_id = 'receipts' and auth.uid()::text = owner_id)",
    );
    expect(sql02).toContain(
      "for insert with check (bucket_id = 'receipts' and auth.uid()::text = owner_id)",
    );
    expect(sql02).toContain(
      "for update using (bucket_id = 'receipts' and auth.uid()::text = owner_id)\n  with check (bucket_id = 'receipts' and auth.uid()::text = owner_id)",
    );
    expect(sql02).toContain(
      "for delete using (bucket_id = 'receipts' and auth.uid()::text = owner_id)",
    );
  });
});

const MIGRATION_03 = "supabase/migrations/0003_people.sql";
const sql03 = readFileSync(new URL(`../${MIGRATION_03}`, import.meta.url), "utf8");

describe("0003_people.sql", () => {
  it("indexes people by owner and case-folded name for sorted listing", () => {
    expect(sql03).toContain(
      "create index if not exists people_user_name_idx\n  on public.people (user_id, lower(name));",
    );
  });

  it("enforces the name+phone dedupe rule as a partial unique index", () => {
    expect(sql03).toContain(
      "create unique index if not exists people_user_name_phone_key\n  on public.people (user_id, lower(name), phone) where phone is not null;",
    );
  });

  it("refuses deletes of referenced people at the database level", () => {
    expect(sql03).toContain("create or replace function public.people_refuse_delete()");
    expect(sql03).toContain(
      "if exists (select 1 from public.splits where person_id = old.id)\n     or exists (select 1 from public.ious where person_id = old.id)\n     or exists (select 1 from public.settlements where person_id = old.id)\n     or exists (select 1 from public.reminders where person_id = old.id) then",
    );
    expect(sql03).toContain(
      "create trigger people_refuse_delete\n  before delete on public.people\n  for each row execute function public.people_refuse_delete();",
    );
  });
});

const MIGRATION_04 = "supabase/migrations/0004_splits.sql";
const sql04 = readFileSync(new URL(`../${MIGRATION_04}`, import.meta.url), "utf8");

describe("0004_splits.sql", () => {
  it("indexes splits by expense for lookups per expense", () => {
    expect(sql04).toContain(
      "create index if not exists splits_user_expense_idx\n  on public.splits (user_id, expense_id);",
    );
  });

  it("indexes splits by person for the money-owed views", () => {
    expect(sql04).toContain(
      "create index if not exists splits_user_person_idx\n  on public.splits (user_id, person_id);",
    );
  });
});

const MIGRATION_05 = "supabase/migrations/0005_settlements.sql";
const sql05 = readFileSync(new URL(`../${MIGRATION_05}`, import.meta.url), "utf8");

describe("0005_settlements.sql", () => {
  it("indexes settlements by person and by debt", () => {
    expect(sql05).toContain(
      "create index if not exists settlements_user_person_idx\n  on public.settlements (user_id, person_id);",
    );
    expect(sql05).toContain(
      "create index if not exists settlements_user_debt_idx\n  on public.settlements (user_id, debt_type, debt_id);",
    );
  });

  it("makes settlement money fields immutable at the database level", () => {
    expect(sql05).toContain(
      "if old.amount is distinct from new.amount\n     or old.direction is distinct from new.direction\n     or old.debt_type is distinct from new.debt_type\n     or old.debt_id is distinct from new.debt_id then",
    );
    expect(sql05).toContain(
      "create trigger settlements_append_only\n  before update on public.settlements\n  for each row execute function public.settlements_append_only();",
    );
  });

  it("refuses deleting an expense that still has settlements", () => {
    expect(sql05).toContain("create or replace function public.expenses_refuse_delete_settled()");
    expect(sql05).toContain(
      "join public.splits sp on sp.id = s.debt_id and s.debt_type = 'split'\n    where sp.expense_id = old.id",
    );
    expect(sql05).toContain(
      "create trigger expenses_refuse_delete_settled\n  before delete on public.expenses\n  for each row execute function public.expenses_refuse_delete_settled();",
    );
  });
});

const MIGRATION_07 = "supabase/migrations/0007_dashboard_rpc.sql";
const sql07 = readFileSync(new URL(`../${MIGRATION_07}`, import.meta.url), "utf8");

describe("0007_dashboard_rpc.sql", () => {
  it("creates the month totals RPC with a rounded numeric total", () => {
    expect(sql07).toContain(
      "create or replace function public.month_totals(p_from date, p_to date)",
    );
    expect(sql07).toContain("returns table (total numeric)");
    expect(sql07).toContain("coalesce(round(sum(amount), 2), 0)::numeric(12, 2)");
    expect(sql07).toContain("where date >= p_from and date <= p_to");
  });

  it("creates the category breakdown RPC grouped by category", () => {
    expect(sql07).toContain(
      "create or replace function public.category_breakdown(p_from date, p_to date)",
    );
    expect(sql07).toContain("left join public.categories c on c.id = e.category_id");
    expect(sql07).toContain("group by e.category_id, c.name");
  });

  it("creates the outstanding summary RPC with remaining-based gross totals", () => {
    expect(sql07).toContain("create or replace function public.outstanding_summary()");
    expect(sql07).toContain("'to_receive'::text as direction, 'split'::text as debt_type");
    expect(sql07).toContain(
      "coalesce(sum(greatest(d.gross - s.paid, 0)), 0)::numeric(12, 2)",
    );
    expect(sql07).toContain("group by d.direction");
  });

  it("keeps every dashboard RPC user-scoped through RLS", () => {
    for (const functionName of ["month_totals", "category_breakdown", "outstanding_summary"]) {
      expect(sql07).toContain(`create or replace function public.${functionName}`);
      expect(sql07).toContain("set search_path = ''");
    }
    expect(sql07).not.toContain("security definer");
  });
});

const MIGRATION_06 = "supabase/migrations/0006_ious_reminders.sql";
const sql06 = readFileSync(new URL(`../${MIGRATION_06}`, import.meta.url), "utf8");

describe("0006_ious_reminders.sql", () => {
  it("indexes ious by person and by recency for the money-owed views", () => {
    expect(sql06).toContain(
      "create index if not exists ious_user_person_idx\n  on public.ious (user_id, person_id);",
    );
    expect(sql06).toContain(
      "create index if not exists ious_user_date_idx\n  on public.ious (user_id, date desc, created_at desc);",
    );
  });

  it("indexes reminders by person and by debt", () => {
    expect(sql06).toContain(
      "create index if not exists reminders_user_person_idx\n  on public.reminders (user_id, person_id);",
    );
    expect(sql06).toContain(
      "create index if not exists reminders_user_debt_idx\n  on public.reminders (user_id, debt_type, debt_id);",
    );
  });

  it("refuses deleting an IOU that still has settlements", () => {
    expect(sql06).toContain("create or replace function public.ious_refuse_delete_settled()");
    expect(sql06).toContain(
      "select 1\n    from public.settlements s\n    where s.debt_id = old.id and s.debt_type = 'iou'",
    );
    expect(sql06).toContain(
      "create trigger ious_refuse_delete_settled\n  before delete on public.ious\n  for each row execute function public.ious_refuse_delete_settled();",
    );
  });
});

const MIGRATION_08 = "supabase/migrations/0008_analytics_rpc.sql";
const sql08 = readFileSync(new URL(`../${MIGRATION_08}`, import.meta.url), "utf8");

describe("0008_analytics_rpc.sql", () => {
  it("creates the spend series RPC bucketed by granularity", () => {
    expect(sql08).toContain(
      "create or replace function public.spend_series(p_from date, p_to date, p_granularity text)",
    );
    expect(sql08).toContain("returns table (bucket date, total numeric)");
    expect(sql08).toContain("date_trunc('day', date)::date");
    expect(sql08).toContain("date_trunc('week', date)::date");
    expect(sql08).toContain("date_trunc('month', date)::date");
    expect(sql08).toContain("group by bucket");
    expect(sql08).toContain("order by bucket");
  });

  it("rounds the spend series sum to two decimals", () => {
    expect(sql08).toContain("coalesce(round(sum(amount), 2), 0)::numeric(12, 2)");
    expect(sql08).toContain("where date >= p_from and date <= p_to");
  });

  it("creates the highest expense RPC ordered by amount", () => {
    expect(sql08).toContain(
      "create or replace function public.highest_expense(p_from date, p_to date)",
    );
    expect(sql08).toContain("returns table (id uuid, description text, date date, amount numeric)");
    expect(sql08).toContain("round(e.amount, 2)::numeric(12, 2)");
    expect(sql08).toContain("order by e.amount desc");
    expect(sql08).toContain("limit 1");
  });

  it("keeps every analytics RPC user-scoped through RLS", () => {
    for (const functionName of ["spend_series", "highest_expense"]) {
      expect(sql08).toContain(`create or replace function public.${functionName}`);
      expect(sql08).toContain("set search_path = ''");
    }
    expect(sql08).not.toContain("security definer");
  });
});