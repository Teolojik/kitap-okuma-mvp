-- Drawings table for cross-device handwriting sync
-- Run in Supabase SQL Editor once.

create table if not exists public.drawings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  page_key text not null,
  data text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_key)
);

alter table public.drawings enable row level security;

drop policy if exists "drawings_select_own" on public.drawings;
create policy "drawings_select_own"
on public.drawings
for select
using (auth.uid() = user_id);

drop policy if exists "drawings_insert_own" on public.drawings;
create policy "drawings_insert_own"
on public.drawings
for insert
with check (auth.uid() = user_id);

drop policy if exists "drawings_update_own" on public.drawings;
create policy "drawings_update_own"
on public.drawings
for update
using (auth.uid() = user_id);

drop policy if exists "drawings_delete_own" on public.drawings;
create policy "drawings_delete_own"
on public.drawings
for delete
using (auth.uid() = user_id);

create or replace function public.set_drawings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists drawings_set_updated_at on public.drawings;
create trigger drawings_set_updated_at
before update on public.drawings
for each row
execute function public.set_drawings_updated_at();
