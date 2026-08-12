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