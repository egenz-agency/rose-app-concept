-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-07-14.
--
-- Adds an unguessable per-gift access token. The public gift link now carries
-- this token (/g/<token>); knowing a slug is no longer enough to view a gift.

alter table public.tenants add column if not exists access_token text;

-- Backfill existing gifts (2x uuid = 64 hex chars; no pgcrypto dependency).
update public.tenants
set access_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where access_token is null;

alter table public.tenants
  alter column access_token set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

alter table public.tenants alter column access_token set not null;

create unique index if not exists tenants_access_token_key on public.tenants (access_token);
