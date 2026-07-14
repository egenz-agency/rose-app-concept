import { getTenantBySlug } from "@/lib/server/tenantQueries"
import { tokensMatch } from "@/lib/security/giftAccess"

// Per-gift PWA manifest. Requires the gift's token (?k=) so it can't be scraped
// for the secret, and so the installed app is branded + scoped to THIS gift:
//   • name / short_name → the couple's names
//   • start_url → /g/<token>, so launching the installed app re-establishes the
//     access cookie and lands on her gift (not the generic root).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const k = new URL(request.url).searchParams.get("k") ?? ""

  const notFound = () => new Response("Not found", { status: 404 })
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return notFound()

  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status === "suspended" || !tokensMatch(k, tenant.access_token)) {
    return notFound()
  }

  const who = tenant.recipient_name?.trim()
  const manifest = {
    name: who ? `A gift for ${who} 🌹` : "A gift for you 🌹",
    short_name: who ? `${who}'s Rose`.slice(0, 30) : "Your Rose",
    description: "A living rose to care for, every day.",
    start_url: `/g/${tenant.access_token}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0205",
    theme_color: "#0a0205",
    categories: ["lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      // Token-bearing → never cache in shared/CDN caches.
      "Cache-Control": "private, no-store",
    },
  })
}
