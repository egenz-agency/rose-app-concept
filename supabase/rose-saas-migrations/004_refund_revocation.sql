-- rose-saas (multi-tenant) migration.
-- Applied to project fqosivbvqgjjfgfpfcbu on 2026-08-01.
--
-- A refund must revoke EVERYTHING, not just the entitlement flag.
--
-- Also applied outside this file (storage config, no SQL equivalent):
--   update storage.buckets set public = false where id = 'tenant-media';
-- Media is now served only via short-lived signed URLs minted server-side in
-- lib/server/media.ts, after the access + entitlement gates have passed. A
-- public URL would outlive the refund and keep the most personal content in the
-- gift reachable forever.

alter table public.gift_payments add column if not exists refunded_at timestamptz;

-- Undo one payment's entitlement. Idempotent on the payment intent (Stripe
-- retries webhooks), and safe when a gift has several stacked years: the window
-- is recomputed from whatever payments remain un-refunded rather than blindly
-- rewound, so refunding year 1 doesn't erase a separately-paid year 2.
--
-- Difference from a lapsed year, which is deliberate:
--   • Year expires  → same link comes back when they buy another year.
--   • Refunded      → the old link is destroyed. Buying again issues a NEW one,
--                     so any copy already forwarded, screenshotted or bookmarked
--                     is permanently dead.
-- Her registered devices are dropped too, so no push can reach her afterwards
-- and we stop holding her endpoint data for a gift that no longer exists.
create or replace function public.revoke_gift_payment(p_payment_intent text)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record; v_new_end timestamptz;
begin
  select * into r from gift_payments
  where stripe_payment_intent = p_payment_intent and refunded_at is null;
  if not found then
    return null; -- unknown or already processed
  end if;

  update gift_payments set refunded_at = now() where id = r.id;

  update tenants t set
    expires_at = (
      select max(g.period_end) from gift_payments g
      where g.tenant_id = t.id and g.refunded_at is null
    ),
    paid = exists (
      select 1 from gift_payments g
      where g.tenant_id = t.id and g.refunded_at is null
    )
  where t.id = r.tenant_id
  returning t.expires_at into v_new_end;

  -- Only burn the link when no paid time survives the refund. Refunding one of
  -- two stacked years must not break a link the buyer is still entitled to.
  if v_new_end is null or v_new_end <= now() then
    update tenants
    set access_token = replace(gen_random_uuid()::text, '-', '')
                    || replace(gen_random_uuid()::text, '-', '')
    where id = r.tenant_id;

    delete from push_subscriptions where tenant_id = r.tenant_id;
  end if;

  return v_new_end;
end;
$$;

revoke all on function public.revoke_gift_payment(text) from public;
revoke all on function public.revoke_gift_payment(text) from anon;
revoke all on function public.revoke_gift_payment(text) from authenticated;
