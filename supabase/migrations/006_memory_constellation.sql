-- Memory Constellation.
-- Applied to project gwjmiqjativwhsiwryqw on 2026-08-04.
--
-- A memory star stops being a free-floating orb and becomes a capsule bound to
-- one slot of one procedurally generated constellation. The constellation's
-- geometry is never stored — it is regenerated from the gift's seed — so all we
-- need here is which chapter and which slot a memory occupies, plus the richer
-- contents a capsule can now hold.

alter table memory_stars
  -- Which constellation (chapter) this memory belongs to. 0 = the first sky.
  add column if not exists constellation_index integer not null default 0,
  -- Which generated star of that constellation holds it. Null for legacy rows
  -- created before constellations existed; those are adopted into free slots.
  add column if not exists slot_index integer,
  add column if not exists video_url text,
  add column if not exists voice_url text,
  add column if not exists song_url text,
  add column if not exists location text,
  add column if not exists quote text,
  -- Favourites burn a little brighter; anniversaries carry a coloured aura.
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_anniversary boolean not null default false;

-- One memory per slot per constellation. Partial, so the legacy rows with a
-- null slot_index don't collide with each other.
create unique index if not exists memory_stars_slot_key
  on memory_stars (constellation_index, slot_index)
  where slot_index is not null;

create index if not exists memory_stars_constellation_idx
  on memory_stars (constellation_index);
