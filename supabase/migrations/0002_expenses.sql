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