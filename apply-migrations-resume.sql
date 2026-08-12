-- ============ 0002 storage policies (bucket already exists) ============
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


