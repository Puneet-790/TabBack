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