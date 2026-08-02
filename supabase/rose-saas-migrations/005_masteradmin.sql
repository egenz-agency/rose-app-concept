-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-02.
--
-- The operator's own admin identity, backing the /admin console.

-- Keyed on user_id, never on an email address: emails change, and an
-- email-based check would silently hand admin to whoever later registers the
-- old address. The row survives an email change; it dies with the account.
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('masteradmin')),
  granted_at timestamptz not null default now(),
  note       text
);

-- Exactly ONE masteradmin may exist in the entire database. The partial unique
-- index is on a constant, so a second insert with role='masteradmin' collides
-- regardless of which user it names — the database refuses, rather than relying
-- on application code remembering to check.
create unique index if not exists app_admins_single_masteradmin
  on public.app_admins ((true))
  where role = 'masteradmin';

-- RLS on with NO policy: unreachable from anon or a signed-in customer. Only the
-- service-role server code can read it (same pattern as app_config / rate_limits
-- / gift_payments). A customer cannot even discover that this table has rows.
alter table public.app_admins enable row level security;

-- Grant it to the operator's current account.
insert into public.app_admins (user_id, role, note)
select id, 'masteradmin', 'operator — Iliyan Tachev'
from auth.users
where email = 'iliqn.tachev@gmail.com'
on conflict (user_id) do nothing;

-- To move masteradmin to a different account later (it is unique, so delete first):
--   delete from app_admins where role = 'masteradmin';
--   insert into app_admins (user_id, role, note)
--   select id, 'masteradmin', 'operator' from auth.users where email = '<new address>';
