-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-04.
--
-- Voice messages on scheduled moments.

-- NOTE the asymmetry with the neighbouring columns: photo_url and video_url
-- hold EXTERNAL urls the owner pastes in, while audio_url holds a PATH inside
-- our private `tenant-media` bucket, because a voice note is recorded in the
-- app rather than hosted somewhere else. The recipient's copy is signed at
-- render time, exactly like the intro video and background song — so a lapsed
-- or refunded gift stops serving it.
alter table public.scheduled_moments add column if not exists audio_url text;

comment on column public.scheduled_moments.audio_url is
  'Storage PATH in the private tenant-media bucket (not a URL, unlike photo_url/video_url). Signed at render time.';
