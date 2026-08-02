import { NextResponse } from "next/server"
import { getTenantByToken } from "@/lib/server/tenantQueries"
import { giftCookieName, GIFT_COOKIE_MAX_AGE } from "@/lib/security/giftAccess"
import { isGiftLive } from "@/lib/payments/entitlement"

// Private gift entry point. The share link is /g/<access_token>. We validate the
// token, drop an httpOnly cookie that grants access to this one gift, then
// redirect to the clean /r/<slug> URL (so the secret token isn't left sitting in
// the address bar / history). The installed PWA's start_url points back here, so
// launching the app re-establishes the cookie.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { origin } = new URL(request.url)
  const clean = typeof token === "string" ? token.trim() : ""

  // Tokens are 2×uuid hex (64 chars); reject anything malformed before hitting the DB.
  if (!/^[a-f0-9]{32,128}$/.test(clean)) {
    return NextResponse.redirect(`${origin}/gift-unavailable`)
  }

  // A correct token is not enough: the gift must also be paid for and inside its
  // year. Unpaid drafts and lapsed gifts look exactly like a bad token here.
  const tenant = await getTenantByToken(clean)
  if (!tenant || !isGiftLive(tenant)) {
    return NextResponse.redirect(`${origin}/gift-unavailable`)
  }

  const res = NextResponse.redirect(`${origin}/r/${tenant.slug}`)
  res.cookies.set(giftCookieName(tenant.slug), tenant.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GIFT_COOKIE_MAX_AGE,
  })
  return res
}
