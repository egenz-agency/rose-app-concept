-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-07-26.
--
-- Payments: a gift is bought once and stays live for one year. There is no
-- auto-renewing subscription — when the year lapses the owner buys another.

-- 1. The entitlement window. NULL = never paid.
alter table public.tenants add column if not exists expires_at timestamptz;

-- 2. Payment ledger. RLS on with NO policy, so only the service-role webhook can
-- read or write it (same pattern as app_config / rate_limits).
create table if not exists public.gift_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  amount_total integer,
  currency text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists gift_payments_tenant_id_idx on public.gift_payments (tenant_id);
alter table public.gift_payments enable row level security;

-- 3. Apply one paid year to a gift. Idempotent on the Stripe session id, so a
-- webhook delivered twice (Stripe retries) grants exactly one year. Renewals
-- stack on the remaining time; a gift that already lapsed restarts from today.
create or replace function public.record_gift_payment(
  p_tenant_id uuid,
  p_session_id text,
  p_payment_intent text default null,
  p_amount integer default null,
  p_currency text default null
) returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_existing timestamptz;
begin
  select period_end into v_existing from gift_payments where stripe_session_id = p_session_id;
  if found then
    return v_existing;
  end if;

  select greatest(coalesce(expires_at, now()), now()) into v_start
  from tenants where id = p_tenant_id;
  if not found then
    raise exception 'unknown tenant %', p_tenant_id;
  end if;

  v_end := v_start + interval '1 year';

  insert into gift_payments (
    tenant_id, stripe_session_id, stripe_payment_intent,
    amount_total, currency, period_start, period_end
  ) values (
    p_tenant_id, p_session_id, p_payment_intent,
    p_amount, p_currency, v_start, v_end
  );

  update tenants set
    paid = true,
    status = 'active',
    expires_at = v_end,
    stripe_session_id = p_session_id,
    published_at = coalesce(published_at, now())
  where id = p_tenant_id;

  return v_end;
end;
$$;

-- Only the service role (the Stripe webhook) may grant paid time.
revoke all on function public.record_gift_payment(uuid, text, text, integer, text) from public;
revoke all on function public.record_gift_payment(uuid, text, text, integer, text) from anon;
revoke all on function public.record_gift_payment(uuid, text, text, integer, text) from authenticated;

-- 4. New gifts start as unpaid drafts: the owner builds them freely, but the
-- share link stays dead until checkout completes.
create or replace function public.create_my_tenant(
  p_slug text,
  p_recipient text default null,
  p_giver text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare uid uuid := auth.uid(); new_id uuid; existing int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select count(*) into existing from tenants where owner_user_id = uid;
  if existing >= 25 then raise exception 'gift limit reached for this account'; end if;
  insert into tenants (slug, owner_user_id, recipient_name, giver_name, status)
  values (lower(trim(p_slug)), uid, p_recipient, p_giver, 'draft')
  returning id into new_id;
  insert into rose_state (tenant_id) values (new_id);
  return new_id;
end; $$;

-- 5. Grandfather the gifts that already exist: they were created before payment
-- existed and are live today, so they keep a free year rather than going dark.
update public.tenants
set paid = true,
    expires_at = coalesce(expires_at, now() + interval '1 year'),
    published_at = coalesce(published_at, created_at)
where status = 'active' and expires_at is null;
