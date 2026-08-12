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