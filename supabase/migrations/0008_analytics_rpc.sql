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
