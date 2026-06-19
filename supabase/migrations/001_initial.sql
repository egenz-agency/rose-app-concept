-- Rose state: single row, the heart of the app
create table if not exists rose_state (
  id uuid primary key default gen_random_uuid(),
  petals_remaining integer not null default 40,
  revivals_remaining integer not null default 3,
  last_visited timestamptz,
  streak_days integer not null default 0,
  total_visits integer not null default 0,
  is_dead boolean not null default false,
  is_final_death boolean not null default false,
  garden_stage integer not null default 0 check (garden_stage between 0 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert the single rose on first run
insert into rose_state (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Daily messages pool (seeded, never user-edited)
create table if not exists daily_messages (
  id uuid primary key default gen_random_uuid(),
  day_number integer unique,  -- null = pool, specific = locked to day
  message text not null,
  author text not null default 'Your love',
  created_at timestamptz not null default now()
);

-- Memory stars (relationship milestones in 3D space)
create table if not exists memory_stars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  memory text not null,
  photos text[] not null default '{}',
  position_x real not null default 0,
  position_y real not null default 0,
  position_z real not null default 0,
  created_at timestamptz not null default now()
);

-- Unlockable letters
create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  unlock_days integer not null,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Photo gallery
create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  taken_at date,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Visit log for streak tracking
create table if not exists visit_log (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now(),
  petals_at_visit integer not null,
  message_shown text
);

-- Auto-update updated_at on rose_state
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rose_state_updated_at
  before update on rose_state
  for each row execute function update_updated_at();

-- RLS: open for now (single-user app, add auth later)
alter table rose_state enable row level security;
alter table daily_messages enable row level security;
alter table memory_stars enable row level security;
alter table letters enable row level security;
alter table gallery_photos enable row level security;
alter table visit_log enable row level security;

create policy "allow all" on rose_state for all using (true) with check (true);
create policy "allow all" on daily_messages for all using (true) with check (true);
create policy "allow all" on memory_stars for all using (true) with check (true);
create policy "allow all" on letters for all using (true) with check (true);
create policy "allow all" on gallery_photos for all using (true) with check (true);
create policy "allow all" on visit_log for all using (true) with check (true);
