-- Public SEO catalog for indexable book detail pages.
-- This table is intentionally separate from `books` to avoid leaking private library data.

create table if not exists public.public_books (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid unique references public.books(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_books_is_published on public.public_books(is_published);
create index if not exists idx_public_books_updated_at on public.public_books(updated_at desc);

create or replace function public.set_updated_at_public_books()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_public_books_updated_at on public.public_books;
create trigger trg_public_books_updated_at
before update on public.public_books
for each row execute function public.set_updated_at_public_books();

alter table public.public_books enable row level security;

-- Anyone can read published catalog entries.
drop policy if exists "Public can read published books catalog" on public.public_books;
create policy "Public can read published books catalog"
  on public.public_books
  for select
  using (is_published = true);

-- Only admins can manage catalog entries.
drop policy if exists "Admins can insert books catalog" on public.public_books;
create policy "Admins can insert books catalog"
  on public.public_books
  for insert
  with check (public.is_admin());

drop policy if exists "Admins can update books catalog" on public.public_books;
create policy "Admins can update books catalog"
  on public.public_books
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete books catalog" on public.public_books;
create policy "Admins can delete books catalog"
  on public.public_books
  for delete
  using (public.is_admin());

