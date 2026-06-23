-- "Moments" — photos / clips / messages the owner schedules from /rosesecret.
-- A moment fires when she tends the rose on the matching visit number OR on/after
-- the matching calendar date. Both triggers are optional; set one (or both).
create table if not exists scheduled_moments (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  message       text,
  photo_url     text,
  video_url     text,
  trigger_visit integer,          -- show on/after this visit number (nullable)
  trigger_date  date,             -- OR show on/after this date (nullable)
  shown         boolean default false,
  shown_at      timestamptz,
  created_at    timestamptz default now()
);

alter table scheduled_moments enable row level security;
drop policy if exists "allow all scheduled_moments" on scheduled_moments;
create policy "allow all scheduled_moments" on scheduled_moments
  for all using (true) with check (true);

-- Public storage bucket for the moment photos & clips
insert into storage.buckets (id, name, public)
values ('moments', 'moments', true)
on conflict (id) do nothing;

drop policy if exists "moments read"   on storage.objects;
drop policy if exists "moments insert" on storage.objects;
drop policy if exists "moments delete" on storage.objects;
create policy "moments read"   on storage.objects for select using (bucket_id = 'moments');
create policy "moments insert" on storage.objects for insert with check (bucket_id = 'moments');
create policy "moments delete" on storage.objects for delete using (bucket_id = 'moments');
