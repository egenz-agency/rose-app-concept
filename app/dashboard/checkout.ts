"use server"

import { getSaasServerClient, getCurrentUser } from "@/lib/supabase/saasServer"
import { enforceRateLimit } from "@/lib/security/ratelimit"
import { getStripe, getPriceId, getBaseUrl, isAutomaticTaxEnabled } from "@/lib/payments/stripe"
import { planOf, DEFAULT_PLAN, type PlanKey } from "@/lib/payments/plans"

// Checkout for one gift-year. The buyer builds their gift for free; this is the
// step that makes the share link work, and the same call renews a gift whose
// year is running out.
//
// The tenant is resolved from the buyer's OWN session (RLS-scoped) — never from
// a client-supplied id — so nobody can start a checkout that would credit
// someone else's gift.

// Tags these sessions in the Stripe Dashboard so this flow can be compared
// against any future one. Stable by design — the 8-letter suffix is fixed, not
// regenerated per session, or the sessions wouldn't group together.
const INTEGRATION_IDENTIFIER = "rose-gift-year-qwmzkrvt"

interface TenantRow {
  id: string
  expires_at: string | null
  stripe_customer_id: string | null
  plan: string | null
}

// One persistent Stripe Customer per buyer. Required for invoicing (a guest
// customer can't be invoiced or looked up later) and it keeps every renewal on
// the same customer record.
async function getOrCreateCustomerId(
  tenant: TenantRow,
  email: string | undefined,
  userId: string
): Promise<string> {
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id

  const customer = await getStripe().customers.create({
    email,
    metadata: { tenant_id: tenant.id, user_id: userId },
  })

  const sb = await getSaasServerClient()
  const { error } = await sb
    .from("tenants")
    .update({ stripe_customer_id: customer.id })
    .eq("id", tenant.id)
  if (error) throw new Error(error.message)

  return customer.id
}

export async function createCheckoutSessionAction(
  planKey: PlanKey = DEFAULT_PLAN
): Promise<{ url: string }> {
  const plan = planOf(planKey)
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")

  const sb = await getSaasServerClient()
  const { data } = await sb
    .from("tenants")
    .select("id, expires_at, stripe_customer_id, plan")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  if (!data) throw new Error("Create your gift first.")
  const tenant = data as TenantRow

  await enforceRateLimit(`checkout:${user.id}`, 12, 3600) // 12/hour per account

  const base = getBaseUrl()
  const isRenewal = Boolean(tenant.expires_at)
  const customerId = await getOrCreateCustomerId(tenant, user.email ?? undefined, user.id)

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    customer: customerId,
    // NOTE: `payment_method_types` is deliberately omitted so Stripe picks the
    // eligible methods per buyer (dynamic payment methods). Hardcoding it would
    // silently disable everything except cards.

    // The webhook trusts ONLY this metadata to decide which gift to credit.
    metadata: {
      tenant_id: tenant.id,
      user_id: user.id,
      kind: isRenewal ? "renewal" : "initial",
      // Which package this payment is for. The webhook records it against both
      // the gift and the ledger row, so revenue-by-package stays accurate even
      // if the gift is later upgraded to a different tier.
      plan: plan.key,
    },

    // VAT/GST — off until STRIPE_AUTOMATIC_TAX=true (see isAutomaticTaxEnabled).
    // Even when on, this collects NOTHING until an active registration exists in
    // the buyer's jurisdiction, and Stripe returns no error in that case.
    automatic_tax: { enabled: isAutomaticTaxEnabled() },
    // Always collected: the invoice needs an address, and with a saved Customer
    // Checkout would otherwise reuse a stale one and tax the wrong place once
    // tax is switched on.
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },

    // A real invoice for every purchase, not just Stripe's email receipt.
    invoice_creation: { enabled: true },

    // EU consumers get a 14-day right of withdrawal on distance contracts. It
    // can end early for digital services ONLY if the buyer expressly consents to
    // immediate delivery AND acknowledges losing that right. This records both,
    // with a timestamp Stripe stores on the session — which is the evidence that
    // makes a "problems only" refund practice defensible after the gift is live.
    // Without this, the full 14 days apply no matter what the terms say.
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "Your gift link goes live as soon as this payment completes. By accepting, you ask us to start immediately and agree you lose the 14-day right of withdrawal once it does. If anything goes wrong with your gift, we'll put it right or refund you.",
      },
    },

    integration_identifier: INTEGRATION_IDENTIFIER,

    success_url: `${base}/dashboard?paid=1`,
    cancel_url: `${base}/dashboard?canceled=1`,
    client_reference_id: tenant.id,
  })

  if (!session.url) throw new Error("Could not start checkout — please try again.")
  return { url: session.url }
}
