import { notFound } from "next/navigation"
import { getTenantBySlug } from "@/lib/server/tenantQueries"
import { ExperiencePage } from "@/app/experience/ExperiencePage"

// The public gift page for one couple. The slug resolves to a tenant on the
// server; an unknown or suspended gift 404s. The experience then runs in
// tenant mode (all data calls go through the secured server actions).
export default async function GiftPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status === "suspended") notFound()

  const c = tenant.customization ?? {}
  return (
    <ExperiencePage
      slug={slug}
      config={{
        recipientName: tenant.recipient_name,
        giverName: tenant.giver_name,
        introVideoUrl: c.introVideoUrl ?? null,
        songUrl: c.songUrl ?? null,
      }}
    />
  )
}
