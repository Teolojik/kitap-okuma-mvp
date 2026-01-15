-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Books Table
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  author text,
  file_url text not null, -- URL in Supabase Storage
  cover_url text,         -- URL in Supabase Storage (optional)
  progress jsonb default '{"percentage": 0, "location": null, "page": 1}'::jsonb,
  last_read timestamptz default now(),
  mode_pref text default 'single', -- single, double, split
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.books enable row level security;

-- Policies for Books
create policy "Users can view their own books"
  on public.books for select
  using (auth.uid() = user_id);

create policy "Users can insert their own books"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own books"
  on public.books for update
  using (auth.uid() = user_id);

create policy "Users can delete their own books"
  on public.books for delete
  using (auth.uid() = user_id);

-- Storage bucket creation (Note: Need to create bucket 'books' in dashboard or via API, SQL for policies below)
-- Assumes bucket 'books' exists and is private

-- Storage Policies
-- Policy to allow authenticated uploads to 'books' bucket
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'books' and auth.uid() = owner );

-- Policy to allow users to view their own files
create policy "Allow users to view own files"
on storage.objects for select
to authenticated
using ( bucket_id = 'books' and auth.uid() = owner );

-- Policy to allow users to update their own files
create policy "Allow users to update own files"
on storage.objects for update
to authenticated
using ( bucket_id = 'books' and auth.uid() = owner );

-- Policy to allow users to delete their own files
create policy "Allow users to delete own files"
on storage.objects for delete
to authenticated
using ( bucket_id = 'books' and auth.uid() = owner );
