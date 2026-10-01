-- Date Planner schema. Run in the Supabase SQL editor.
-- Private single-couple instance: no auth, the anon key has full access.

create extension if not exists "pgcrypto";

create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  plan_date date not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  status text not null default 'planned' check (status in ('planned', 'completed')),
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  date_plan_id uuid not null references public.date_plans(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  start_time time,
  end_time time,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'skipped')),
  location_name text,
  latitude double precision,
  longitude double precision,
  journey_duration_minutes integer,
  order_index integer not null default 0,
  options jsonb, -- choice alternatives, see migrations/2026-10-03_activity_choices.sql
  chosen_option_id text,
  chosen_by text check (chosen_by in ('owner', 'partner')),
  created_at timestamptz not null default now()
);
create index if not exists activities_plan_idx on public.activities(date_plan_id, order_index);
-- Upgrade path: end time added later.
alter table public.activities add column if not exists end_time time;
alter table public.activities add column if not exists options jsonb;
alter table public.activities add column if not exists chosen_option_id text;
alter table public.activities add column if not exists chosen_by text;

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  date_plan_id uuid not null unique references public.date_plans(id) on delete cascade,
  title text not null,
  rating integer check (rating between 1 and 5),
  would_go_again boolean,
  favorite_moment text,
  notes text,
  food_menu text,
  created_at timestamptz not null default now()
);

-- Per-place memory inside a date (rating, would go again, food, notes).
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

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  place_review_id uuid references public.place_reviews(id) on delete set null,
  image_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists photos_journal_idx on public.photos(journal_id);

-- Upgrade path for databases created before per-place reviews existed.
alter table public.photos
  add column if not exists place_review_id uuid references public.place_reviews(id) on delete set null;

-- Open policies (no authentication by design).
alter table public.date_plans enable row level security;
alter table public.activities enable row level security;
alter table public.journals enable row level security;
alter table public.photos enable row level security;
alter table public.place_reviews enable row level security;

do $$
declare t text;
begin
  foreach t in array array['date_plans', 'activities', 'journals', 'photos', 'place_reviews'] loop
    execute format('drop policy if exists "open access" on public.%I', t);
    execute format('create policy "open access" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Public storage bucket for journal photos.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos open access" on storage.objects;
create policy "photos open access" on storage.objects
  for all using (bucket_id = 'photos') with check (bucket_id = 'photos');
