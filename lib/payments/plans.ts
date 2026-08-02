// ────────────────────────────────────────────────────────────────────────────
// Packages (plans).
//
// One entry per tier the buyer can choose. Each maps to its own Stripe Price,
// read from an env var so amounts and currency live in Stripe, never in code.
//
// To add a tier: add an entry here, create the Price in Stripe (one-time, with a
// tax_behavior), set the env var. Nothing else needs to change — checkout, the
// webhook, and the operator console all read this catalogue.
//
// `plan` on tenants/gift_payments stores the KEY. It is deliberately not the
// billing shape ("one_time") — every package is a one-off purchase, so that told
// us nothing. It names the product tier.
// ────────────────────────────────────────────────────────────────────────────

export type PlanKey = "regular"

export interface Plan {
  key: PlanKey
  label: string
  blurb: string
  /** Env var holding the Stripe Price id for this tier. */
  priceEnvVar: string
  /** Feature flags, so gating a feature is a lookup rather than a plan-name check. */
  features: {
    scheduledMessages: boolean
    moments: boolean
    introVideo: boolean
    customSong: boolean
    missYouPush: boolean
  }
}

export const DEFAULT_PLAN: PlanKey = "regular"

export const PLANS: Record<PlanKey, Plan> = {
  regular: {
    key: "regular",
    label: "Regular",
    blurb: "The full gift: a living rose, messages, moments and memories, for one year.",
    priceEnvVar: "STRIPE_PRICE_ID",
    features: {
      scheduledMessages: true,
      moments: true,
      introVideo: true,
      customSong: true,
      missYouPush: true,
    },
  },
}

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PLANS, v)
}

// Never trust a stored or client-supplied value — an unknown plan falls back to
// the base tier rather than throwing and taking a page down.
export function planOf(v: unknown): Plan {
  return isPlanKey(v) ? PLANS[v] : PLANS[DEFAULT_PLAN]
}

export function planLabel(v: unknown): string {
  return planOf(v).label
}
