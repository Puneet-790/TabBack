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