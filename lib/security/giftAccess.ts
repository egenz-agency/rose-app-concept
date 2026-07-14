import "server-only"
import { cookies } from "next/headers"
import { timingSafeEqual } from "crypto"
import { getTenantBySlug, type TenantRecord } from "@/lib/server/tenantQueries"

// ─────────────────────────────────────────────────────────────────────────────
// Gift access control.
//
// A gift is private: knowing the slug is NOT enough. The share link carries the
// tenant's secret `access_token`; the /g/[token] entry route validates it and
// drops an httpOnly cookie. From then on the recipient page AND every server
// action require that cookie to match the tenant's token. No cookie / wrong
// token → the gift is treated as non-existent.
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE_PREFIX = "gift_"
// ~180 days: long enough that the recipient's phone keeps access between visits.
export const GIFT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

export function giftCookieName(slug: string): string {
  return COOKIE_PREFIX + slug
}

// Constant-time string compare (avoids leaking token length/prefix via timing).
export function tokensMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// Read the access token the browser is presenting for this gift, if any.
export async function readGiftCookie(slug: string): Promise<string | null> {
  const store = await cookies()
  return store.get(giftCookieName(slug))?.value ?? null
}

// Returns the tenant only if the caller holds a valid token cookie for it and the
// gift is live. Otherwise null — callers should treat that as "no such gift".
export async function getAccessibleTenant(slug: string): Promise<TenantRecord | null> {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,64}$/.test(slug)) return null
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status === "suspended") return null
  const presented = await readGiftCookie(slug)
  if (!tokensMatch(presented, tenant.access_token)) return null
  return tenant
}
