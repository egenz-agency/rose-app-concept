import type Stripe from "stripe"
import { getStripe, getWebhookSecret } from "@/lib/payments/stripe"
import { getAdminClient } from "@/lib/supabase/admin"
import { planOf } from "@/lib/payments/plans"

// Stripe webhook — the ONLY place a gift becomes paid.
//
// Trust model: we never mark a gift paid from the browser's success redirect
// (anyone can visit /dashboard?paid=1). Payment is granted here and only after
// Stripe's signature over the raw body verifies, which proves the event came
// from Stripe and wasn't replayed with a tampered payload.
//
// Idempotency lives in the database: record_gift_payment() is keyed on the
// checkout session id, so Stripe's automatic retries grant exactly one year.

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) return new Response("Missing signature", { status: 400 })

  // The signature is computed over the exact bytes — read the body as raw text,
  // never as parsed JSON.
  const raw = await request.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, getWebhookSecret())
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload"
    console.error("[stripe] signature verification failed:", message)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // `complete` + unpaid happens for async methods that later fail; only a
      // genuinely paid session grants time.
      if (session.payment_status !== "paid") {
        return Response.json({ received: true, ignored: "unpaid" })
      }

      const tenantId = session.metadata?.tenant_id
      if (!tenantId) {
        console.error("[stripe] checkout.session.completed without tenant_id", session.id)
        // 200: retrying will not add the metadata. Surfaced in logs instead.
        return Response.json({ received: true, ignored: "no tenant_id" })
      }

      const admin = getAdminClient()
      const { data, error } = await admin.rpc("record_gift_payment", {
        p_tenant_id: tenantId,
        p_session_id: session.id,
        p_payment_intent:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        p_amount: session.amount_total ?? null,
        p_currency: session.currency ?? null,
      })
      if (error) throw new Error(error.message)

      // Which package was bought. Recorded on the ledger row so revenue-by-package
      // stays historically accurate, and on the gift so feature gating reads the
      // tier the buyer actually paid for. An unknown value falls back to the base
      // tier rather than writing something the app can't interpret.
      const plan = planOf(session.metadata?.plan).key

      // Invoice id isn't known until the session completes, so it's attached
      // here rather than inside the (idempotent) grant above.
      const invoiceId = typeof session.invoice === "string" ? session.invoice : null
      await admin
        .from("gift_payments")
        .update({ plan, ...(invoiceId ? { stripe_invoice_id: invoiceId } : {}) })
        .eq("stripe_session_id", session.id)

      await admin.from("tenants").update({ plan }).eq("id", tenantId)

      // Backfill the customer for gifts that predate the persistent-customer
      // change, so future renewals and invoices stay on one customer record.
      const customerId = typeof session.customer === "string" ? session.customer : null
      if (customerId) {
        await admin
          .from("tenants")
          .update({ stripe_customer_id: customerId })
          .eq("id", tenantId)
          .is("stripe_customer_id", null)
      }

      console.log(`[stripe] gift ${tenantId} paid through ${data}`)
    }

    // A refund has to take the gift back too, or a buyer could pay, collect the
    // share link, refund, and keep a working gift for the full year. Only a FULL
    // refund revokes — a partial one (e.g. a goodwill part-refund for a problem)
    // leaves the gift running, which is usually the intent.
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      const fullyRefunded = charge.amount_refunded >= charge.amount

      if (!fullyRefunded) {
        return Response.json({ received: true, ignored: "partial refund" })
      }

      const paymentIntent =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null
      if (!paymentIntent) {
        return Response.json({ received: true, ignored: "no payment_intent" })
      }

      const { data, error } = await getAdminClient().rpc("revoke_gift_payment", {
        p_payment_intent: paymentIntent,
      })
      if (error) throw new Error(error.message)

      console.log(
        `[stripe] refund on ${paymentIntent} → entitlement now ${data ?? "revoked (no paid time left)"}`
      )
    }

    return Response.json({ received: true })
  } catch (err) {
    // 500 → Stripe retries, and the DB-level idempotency makes that safe.
    const message = err instanceof Error ? err.message : "unknown error"
    console.error(`[stripe] failed to handle ${event.type}:`, message)
    return new Response("Webhook handler failed", { status: 500 })
  }
}
