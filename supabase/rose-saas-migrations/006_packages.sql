-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-02.
--
-- Packages (plans), and the operator console's stats query.

-- `plan` previously held 'one_time', which described the BILLING SHAPE, not the
-- product tier — every gift is one-time, so it carried no information. It now
-- names the package the buyer chose; 'regular' is the base tier and future tiers
-- add features on top. The catalogue lives in lib/payments/plans.ts.
alter table public.tenants alter column plan set default 'regular';
update public.tenants set plan = 'regular' where plan = 'one_time' or plan is null;

-- Record the package ON THE PAYMENT too. A gift may be upgraded later, but the
-- money that came in was for the package bought at the time — revenue-by-package
-- has to stay historically accurate rather than following the tenant's current
-- tier.
alter table public.gift_payments add column if not exists plan text;
update public.gift_payments p
set plan = coalesce(t.plan, 'regular')
from public.tenants t
where p.tenant_id = t.id and p.plan is null;
alter table public.gift_payments alter column plan set default 'regular';

-- One call backing the operator console: package breakdown, revenue per package,
-- and the signup funnel. Done in SQL rather than by pulling every user into the
-- app — auth.users isn't reachable through PostgREST, and this stays O(1) calls
-- as the account count grows.
create or replace function public.admin_overview()
returns json
language sql
security definer
set search_path to 'public'
as $$
  with gift as (
    select
      coalesce(plan, 'regular') as plan,
      status,
      paid,
      expires_at,
      owner_user_id,
      (status <> 'suspended' and paid and expires_at is not null and expires_at > now()) as is_live,
      (not paid or expires_at is null) as is_draft,
      (paid and expires_at is not null and expires_at <= now()) as is_expired
    from tenants
  ),
  pay as (
    select coalesce(plan, 'regular') as plan, amount_total, currency,
           stripe_payment_intent, refunded_at
    from gift_payments
  ),
  packages as (
    select g.plan,
           count(*)                        as gifts,
           count(*) filter (where g.is_live)    as live,
           count(*) filter (where g.is_draft)   as draft,
           count(*) filter (where g.is_expired) as expired,
           coalesce((select count(*) from pay p
                     where p.plan = g.plan and p.stripe_payment_intent is not null
                       and p.refunded_at is null), 0) as purchases,
           coalesce((select sum(p.amount_total) from pay p
                     where p.plan = g.plan and p.stripe_payment_intent is not null
                       and p.refunded_at is null), 0) as revenue_cents,
           coalesce((select count(*) from pay p
                     where p.plan = g.plan and p.stripe_payment_intent is null), 0) as comped
    from gift g group by g.plan
  ),
  -- The signup funnel: registered → made a gift → actually paid.
  funnel as (
    select
      (select count(*) from auth.users) as accounts,
      (select count(*) from auth.users u
         where not exists (select 1 from gift g where g.owner_user_id = u.id)) as accounts_no_gift,
      (select count(*) from auth.users u
         where exists (select 1 from gift g where g.owner_user_id = u.id)
           and not exists (select 1 from gift g where g.owner_user_id = u.id and g.paid)
      ) as accounts_gift_never_paid,
      (select count(*) from auth.users u
         where exists (select 1 from gift g where g.owner_user_id = u.id and g.paid)) as accounts_paying
  )
  select json_build_object(
    'packages', coalesce((select json_agg(row_to_json(packages) order by packages.plan) from packages), '[]'::json),
    'funnel',   (select row_to_json(funnel) from funnel),
    'refunds',  (select count(*) from pay where refunded_at is not null),
    'currency', coalesce((select currency from pay where currency is not null limit 1), 'eur')
  );
$$;

revoke all on function public.admin_overview() from public;
revoke all on function public.admin_overview() from anon;
revoke all on function public.admin_overview() from authenticated;
