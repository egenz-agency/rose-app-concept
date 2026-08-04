-- rose-saas (multi-tenant) migration — Memory Constellation.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-04.
--
-- Same capsule fields as supabase/migrations/006_memory_constellation.sql, but
-- every uniqueness guarantee is scoped by tenant_id: two different gifts each
-- own slot 7 of their own chapter 0, and neither can see the other.

alter table public.memory_stars
  add column if not exists constellation_index integer not null default 0,
  add column if not exists slot_index integer,
  add column if not exists video_url text,
  add column if not exists voice_url text,
  add column if not exists song_url text,
  add column if not exists location text,
  add column if not exists quote text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_anniversary boolean not null default false;

-- One memory per slot, per constellation, per gift.
create unique index if not exists memory_stars_tenant_slot_key
  on public.memory_stars (tenant_id, constellation_index, slot_index)
  where slot_index is not null;

create index if not exists memory_stars_tenant_constellation_idx
  on public.memory_stars (tenant_id, constellation_index);
