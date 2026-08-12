-- Reconciles public.outstanding_summary with the settled-remaining definition.
-- Earlier deployments could carry an older body (IOU-only or pre-settlement) that
-- under-counted split debts on the dashboard balance cards. The dashboard now
-- derives those balances from fetchDebtView pure helpers; this migration keeps the
-- stored function truthful and idempotent for any remaining callers.
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