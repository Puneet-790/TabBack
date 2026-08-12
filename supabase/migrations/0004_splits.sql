create index if not exists splits_user_expense_idx
  on public.splits (user_id, expense_id);

create index if not exists splits_user_person_idx
  on public.splits (user_id, person_id);