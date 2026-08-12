-- ============ MIGRATION 0001_init.sql ============
create extension if not exists pgcrypto;

create table if not exists public.demo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.demo_items enable row level security;

create policy demo_items_select_own on public.demo_items
  for select using (auth.uid() = user_id);

create policy demo_items_insert_own on public.demo_items
  for insert with check (auth.uid() = user_id);

create policy demo_items_update_own on public.demo_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy demo_items_delete_own on public.demo_items
  for delete using (auth.uid() = user_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_default_name_key
  on public.categories (name) where user_id is null;

create unique index if not exists categories_custom_uniq_key
  on public.categories (user_id, name) where user_id is not null;

alter table public.categories enable row level security;

create policy categories_select_own on public.categories
  for select using (user_id is null or auth.uid() = user_id);

create policy categories_insert_own on public.categories
  for insert with check (auth.uid() = user_id);

create policy categories_update_own on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy categories_delete_own on public.categories
  for delete using (auth.uid() = user_id);

insert into public.categories (user_id, name)
values
  (null, 'Food'),
  (null, 'Groceries'),
  (null, 'Transport'),
  (null, 'Travel'),
  (null, 'Bills'),
  (null, 'Rent'),
  (null, 'Shopping'),
  (null, 'Entertainment'),
  (null, 'Health'),
  (null, 'Education'),
  (null, 'Work'),
  (null, 'Other')
on conflict (name) where user_id is null do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references public.categories (id) on delete set null,
  date date not null,
  payment_method text not null default 'UPI'
    check (payment_method in ('Cash', 'Bank transfer', 'UPI', 'Other')),
  notes text,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy expenses_select_own on public.expenses
  for select using (auth.uid() = user_id);

create policy expenses_insert_own on public.expenses
  for insert with check (auth.uid() = user_id);

create policy expenses_update_own on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy expenses_delete_own on public.expenses
  for delete using (auth.uid() = user_id);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

create policy people_select_own on public.people
  for select using (auth.uid() = user_id);

create policy people_insert_own on public.people
  for insert with check (auth.uid() = user_id);

create policy people_update_own on public.people
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy people_delete_own on public.people
  for delete using (auth.uid() = user_id);

create table if not exists public.splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.splits enable row level security;

create policy splits_select_own on public.splits
  for select using (auth.uid() = user_id);

create policy splits_insert_own on public.splits
  for insert with check (auth.uid() = user_id);

create policy splits_update_own on public.splits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy splits_delete_own on public.splits
  for delete using (auth.uid() = user_id);

create table if not exists public.ious (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  direction text not null check (direction in ('to_receive', 'to_pay')),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.ious enable row level security;

create policy ious_select_own on public.ious
  for select using (auth.uid() = user_id);

create policy ious_insert_own on public.ious
  for insert with check (auth.uid() = user_id);

create policy ious_update_own on public.ious
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ious_delete_own on public.ious
  for delete using (auth.uid() = user_id);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  debt_type text not null check (debt_type in ('split', 'iou')),
  debt_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  direction text not null check (direction in ('to_receive', 'to_pay')),
  payment_method text not null default 'UPI'
    check (payment_method in ('Cash', 'Bank transfer', 'UPI', 'Other')),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.settlements enable row level security;

create policy settlements_select_own on public.settlements
  for select using (auth.uid() = user_id);

create policy settlements_insert_own on public.settlements
  for insert with check (auth.uid() = user_id);

create policy settlements_update_own on public.settlements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy settlements_delete_own on public.settlements
  for delete using (auth.uid() = user_id);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  debt_type text not null check (debt_type in ('split', 'iou')),
  debt_id uuid not null,
  sent_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy reminders_select_own on public.reminders
  for select using (auth.uid() = user_id);

create policy reminders_insert_own on public.reminders
  for insert with check (auth.uid() = user_id);

create policy reminders_delete_own on public.reminders
  for delete using (auth.uid() = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  overall_limit numeric(12,2) not null check (overall_limit >= 0),
  category_limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.budgets enable row level security;

create policy budgets_select_own on public.budgets
  for select using (auth.uid() = user_id);

create policy budgets_insert_own on public.budgets
  for insert with check (auth.uid() = user_id);

create policy budgets_update_own on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy budgets_delete_own on public.budgets
  for delete using (auth.uid() = user_id);

-- ============ MIGRATION 0002_expenses.sql ============
alter table public.expenses
  add column if not exists description text not null default '';

alter table public.expenses
  drop constraint if exists expenses_payment_method_check;

alter table public.expenses
  add constraint expenses_payment_method_check
  check (payment_method in ('Cash', 'Bank transfer', 'UPI', 'Other'));

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc, created_at desc);

insert into public.categories (user_id, name)
values
  (null, 'Food'),
  (null, 'Groceries'),
  (null, 'Transport'),
  (null, 'Travel'),
  (null, 'Bills'),
  (null, 'Rent'),
  (null, 'Shopping'),
  (null, 'Entertainment'),
  (null, 'Health'),
  (null, 'Education'),
  (null, 'Work'),
  (null, 'Other')
on conflict (name) where user_id is null do nothing;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy receipts_select_owner on storage.objects
  for select using (bucket_id = 'receipts' and auth.uid()::text = owner_id);

create policy receipts_insert_owner on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.uid()::text = owner_id);

create policy receipts_update_owner on storage.objects
  for update using (bucket_id = 'receipts' and auth.uid()::text = owner_id)
  with check (bucket_id = 'receipts' and auth.uid()::text = owner_id);

create policy receipts_delete_owner on storage.objects
  for delete using (bucket_id = 'receipts' and auth.uid()::text = owner_id);

-- ============ MIGRATION 0003_people.sql ============
create index if not exists people_user_name_idx
  on public.people (user_id, lower(name));

create unique index if not exists people_user_name_phone_key
  on public.people (user_id, lower(name), phone) where phone is not null;

create or replace function public.people_refuse_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.splits where person_id = old.id)
     or exists (select 1 from public.ious where person_id = old.id)
     or exists (select 1 from public.settlements where person_id = old.id)
     or exists (select 1 from public.reminders where person_id = old.id) then
    raise exception 'Person is used in existing debts';
  end if;
  return old;
end;
$$;

drop trigger if exists people_refuse_delete on public.people;

create trigger people_refuse_delete
  before delete on public.people
  for each row execute function public.people_refuse_delete();

-- ============ MIGRATION 0004_splits.sql ============
create index if not exists splits_user_expense_idx
  on public.splits (user_id, expense_id);

create index if not exists splits_user_person_idx
  on public.splits (user_id, person_id);

-- ============ MIGRATION 0005_settlements.sql ============
create index if not exists settlements_user_person_idx
  on public.settlements (user_id, person_id);

create index if not exists settlements_user_debt_idx
  on public.settlements (user_id, debt_type, debt_id);

create or replace function public.settlements_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.amount is distinct from new.amount
     or old.direction is distinct from new.direction
     or old.debt_type is distinct from new.debt_type
     or old.debt_id is distinct from new.debt_id then
    raise exception 'Settlement money fields are immutable; delete the settlement to undo it';
  end if;
  return new;
end;
$$;

drop trigger if exists settlements_append_only on public.settlements;

create trigger settlements_append_only
  before update on public.settlements
  for each row execute function public.settlements_append_only();

create or replace function public.expenses_refuse_delete_settled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.settlements s
    join public.splits sp on sp.id = s.debt_id and s.debt_type = 'split'
    where sp.expense_id = old.id
  ) then
    raise exception 'Delete the settlements before deleting this expense';
  end if;
  return old;
end;
$$;

drop trigger if exists expenses_refuse_delete_settled on public.expenses;

create trigger expenses_refuse_delete_settled
  before delete on public.expenses
  for each row execute function public.expenses_refuse_delete_settled();

-- ============ MIGRATION 0006_ious_reminders.sql ============
create index if not exists ious_user_person_idx
  on public.ious (user_id, person_id);

create index if not exists ious_user_date_idx
  on public.ious (user_id, date desc, created_at desc);

create index if not exists reminders_user_person_idx
  on public.reminders (user_id, person_id);

create index if not exists reminders_user_debt_idx
  on public.reminders (user_id, debt_type, debt_id);

create or replace function public.ious_refuse_delete_settled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.settlements s
    where s.debt_id = old.id and s.debt_type = 'iou'
  ) then
    raise exception 'Delete the settlements before deleting this IOU';
  end if;
  return old;
end;
$$;

drop trigger if exists ious_refuse_delete_settled on public.ious;

create trigger ious_refuse_delete_settled
  before delete on public.ious
  for each row execute function public.ious_refuse_delete_settled();

-- ============ MIGRATION 0007_dashboard_rpc.sql ============
create or replace function public.month_totals(p_from date, p_to date)
returns table (total numeric)
language sql
set search_path = ''
as $$
  select coalesce(round(sum(amount), 2), 0)::numeric(12, 2) as total
  from public.expenses
  where date >= p_from and date <= p_to
$$;

create or replace function public.category_breakdown(p_from date, p_to date)
returns table (category_id uuid, category_name text, amount numeric)
language sql
set search_path = ''
as $$
  select
    e.category_id,
    c.name as category_name,
    coalesce(round(sum(e.amount), 2), 0)::numeric(12, 2) as amount
  from public.expenses e
  left join public.categories c on c.id = e.category_id
  where e.date >= p_from and e.date <= p_to
  group by e.category_id, c.name
  order by amount desc
$$;

create or replace function public.outstanding_summary()
returns table (direction text, total numeric)
language sql
set search_path = ''
as $$
  with debts as (
    select s.id as debt_id, s.amount as gross, 'to_receive'::text as direction, 'split'::text as debt_type
    from public.splits s
    union all
    select i.id, i.amount, i.direction::text, 'iou'::text
    from public.ious i
  ),
  settled as (
    select x.debt_type, x.debt_id, sum(x.amount)::numeric(12, 2) as paid
    from public.settlements x
    group by x.debt_type, x.debt_id
  )
  select d.direction,
         coalesce(sum(greatest(d.gross - s.paid, 0)), 0)::numeric(12, 2) as total
  from debts d
  left join settled s on s.debt_type = d.debt_type and s.debt_id = d.debt_id
  group by d.direction
$$;

-- ============ MIGRATION 0008_analytics_rpc.sql ============
create or replace function public.spend_series(p_from date, p_to date, p_granularity text)
returns table (bucket date, total numeric)
language sql
set search_path = ''
as $$
  select
    case p_granularity
      when 'day' then date_trunc('day', date)::date
      when 'week' then date_trunc('week', date)::date
      else date_trunc('month', date)::date
    end as bucket,
    coalesce(round(sum(amount), 2), 0)::numeric(12, 2) as total
  from public.expenses
  where date >= p_from and date <= p_to
  group by bucket
  order by bucket
$$;

create or replace function public.highest_expense(p_from date, p_to date)
returns table (id uuid, description text, date date, amount numeric)
language sql
set search_path = ''
as $$
  select
    e.id,
    e.description,
    e.date,
    round(e.amount, 2)::numeric(12, 2) as amount
from public.expenses e
  where e.date >= p_from and e.date <= p_to
  order by e.amount desc
  limit 1
$$;

-- ============ MIGRATION 0009_outstanding_summary_sync.sql ============
create or replace function public.outstanding_summary()
returns table (direction text, total numeric)
language sql
set search_path = ''
as $$
  with debts as (
    select s.id as debt_id, s.amount as gross, 'to_receive'::text as direction, 'split'::text as debt_type
    from public.splits s
    union all
    select i.id, i.amount, i.direction::text, 'iou'::text
    from public.ious i
  ),
  settled as (
    select x.debt_type, x.debt_id, sum(x.amount)::numeric(12, 2) as paid
    from public.settlements x
    group by x.debt_type, x.debt_id
  )
  select d.direction,
         coalesce(sum(greatest(d.gross - s.paid, 0)), 0)::numeric(12, 2) as total
  from debts d
  left join settled s on s.debt_type = d.debt_type and s.debt_id = d.debt_id
  group by d.direction
$$;


