-- "Pilihan" (choice) activities: e.g. dinner at Taburai OR Tom Sushi,
-- partner picks one from the shared link.
-- Safe to run multiple times. Includes the previous migration too.

alter table public.activities add column if not exists end_time time;

-- [{ id, label, note, location_name, latitude, longitude }, ...]
alter table public.activities add column if not exists options jsonb;
alter table public.activities add column if not exists chosen_option_id text;
alter table public.activities add column if not exists chosen_by text;

do $$ begin
  alter table public.activities
    add constraint activities_chosen_by_check check (chosen_by in ('owner', 'partner'));
exception when duplicate_object then null; end $$;

-- Per-place memories (from 2026-10-02, kept here so one file is enough).
create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  place_name text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  rating integer check (rating between 1 and 5),
  would_go_again boolean,
  notes text,
  food_menu text,
  created_at timestamptz not null default now()
);
create index if not exists place_reviews_journal_idx on public.place_reviews(journal_id);
alter table public.photos
  add column if not exists place_review_id uuid references public.place_reviews(id) on delete set null;
alter table public.place_reviews enable row level security;
drop policy if exists "open access" on public.place_reviews;
create policy "open access" on public.place_reviews for all using (true) with check (true);

notify pgrst, 'reload schema';
