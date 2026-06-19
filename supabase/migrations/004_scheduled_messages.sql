-- Custom messages the owner schedules from the secret /rosesecret admin page.
-- A scheduled message overrides the random daily note on her next qualifying visit.
--   scheduled_for = null  → show on the very next visit (FIFO queue)
--   scheduled_for = date  → show on/after that date
create table if not exists scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  author text default 'Your love',
  scheduled_for date,
  shown boolean default false,
  shown_at timestamptz,
  created_at timestamptz default now()
);

alter table scheduled_messages enable row level security;

drop policy if exists "allow all scheduled_messages" on scheduled_messages;
create policy "allow all scheduled_messages" on scheduled_messages
  for all using (true) with check (true);
