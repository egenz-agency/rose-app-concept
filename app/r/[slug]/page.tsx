import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAccessibleTenant, readGiftCookie } from "@/lib/security/giftAccess"
import { signMedia } from "@/lib/server/media"
import { ExperiencePage } from "@/app/experience/ExperiencePage"

// Private gift — never index or follow.
// The per-gift manifest link is added only when the caller holds the access
// cookie, and it carries the token so the installed PWA stays scoped to this gift.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const base: Metadata = { robots: { index: false, follow: false } }
  const token = /^[a-z0-9-]{1,64}$/.test(slug) ? await readGiftCookie(slug) : null
  if (!token) return base
  return {
    ...base,
    title: "A gift for you 🌹",
    manifest: `/r/${slug}/manifest.webmanifest?k=${encodeURIComponent(token)}`,
  }
}

// The public gift page for one couple. Access requires the secret token cookie
// (set by /g/[token]); without it the gift is treated as unavailable — a slug
// alone reveals nothing. The experience then runs in tenant mode (all data calls
// go through the secured server actions, which enforce the same token).
export default async function GiftPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getAccessibleTenant(slug)
  if (!tenant) redirect("/gift-unavailable")

  const c = tenant.customization ?? {}
  // The media bucket is private: mint short-lived signed URLs here, AFTER the
  // access + entitlement gates above have passed. A revoked gift therefore never
  // hands out a playable link.
  const [introVideoUrl, songUrl] = await Promise.all([
    signMedia(c.introVideoUrl),
    signMedia(c.songUrl),
  ])

  return (
    <ExperiencePage
      slug={slug}
      config={{
        recipientName: tenant.recipient_name,
        giverName: tenant.giver_name,
        introVideoUrl,
        songUrl,
      }}
    />
  )
}
