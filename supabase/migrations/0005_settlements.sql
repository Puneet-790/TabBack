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