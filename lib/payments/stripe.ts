import "server-only"
import Stripe from "stripe"

// Server-only Stripe client. The secret key must never reach the browser (the
// `server-only` import above turns that into a build error).
//
// Nothing is hardcoded here: an unconfigured deployment throws a clear error
// rather than silently falling back, because a wrong key would take money
// against the wrong account.

let stripe: Stripe | null = null

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Payments are not configured — set STRIPE_SECRET_KEY in the environment")
  }
  if (!stripe) {
    stripe = new Stripe(key)
  }
  return stripe
}

// The one-off price for a year of one gift. Created in the Stripe dashboard; we
// only ever reference it by id so the amount/currency live in one place.
export function getPriceId(): string {
  const price = process.env.STRIPE_PRICE_ID
  if (!price) {
    throw new Error("Payments are not configured — set STRIPE_PRICE_ID in the environment")
  }
  return price
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("Payments are not configured — set STRIPE_WEBHOOK_SECRET in the environment")
  }
  return secret
}

// Stripe Tax is OPT-IN and off by default.
//
// Two reasons. First, `automatic_tax` on an account that never completed Stripe
// Tax setup (no origin/head-office address) makes checkout fail outright — a
// dead paywall is far worse than uncollected VAT. Second, with no active
// registrations it collects nothing anyway, so leaving it on would only create
// false confidence that VAT is handled.
//
// Flip this to "true" once registrations show as *Collecting* in the Dashboard.
export function isAutomaticTaxEnabled(): boolean {
  return process.env.STRIPE_AUTOMATIC_TAX === "true"
}

// Absolute URLs for Stripe's redirect back into the app.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return "http://localhost:3000"
}
