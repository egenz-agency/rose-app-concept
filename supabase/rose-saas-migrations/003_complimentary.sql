-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-01.
--
-- Adds tenants.stripe_customer_id (persistent Stripe Customer, needed for
-- invoicing), gift_payments.stripe_invoice_id, and a way to comp a gift a free
-- year without going through Stripe.

alter table public.tenants add column if not exists stripe_customer_id text;

create unique index if not exists tenants_stripe_customer_id_key
  on public.tenants (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.gift_payments add column if not exists stripe_invoice_id text;

-- Comp a gift a free period: your own test roses, a friend's gift, or making
-- good on a support issue.
--
-- It writes a ledger row like a real purchase (amount 0, a "comp_" session id)
-- so free grants are auditable and never silently indistinguishable from paid
-- ones. Reuses record_gift_payment so entitlement maths stays in ONE place.
create or replace function public.grant_complimentary_year(
  p_slug text,
  p_note text default 'complimentary'
) returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_tenant uuid; v_end timestamptz;
begin
  select id into v_tenant from tenants where slug = lower(trim(p_slug));
  if not found then
    raise exception 'no gift with slug %', p_slug;
  end if;

  v_end := record_gift_payment(
    v_tenant,
    'comp_' || lower(trim(p_slug)) || '_' || extract(epoch from now())::bigint,
    null,
    0,
    'eur'
  );

  update gift_payments
  set stripe_invoice_id = p_note
  where tenant_id = v_tenant and stripe_payment_intent is null and stripe_invoice_id is null;

  return v_end;
end;
$$;

-- Service role / SQL editor only — never callable from the app.
revoke all on function public.grant_complimentary_year(text, text) from public;
revoke all on function public.grant_complimentary_year(text, text) from anon;
revoke all on function public.grant_complimentary_year(text, text) from authenticated;
