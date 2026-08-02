import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSaasServerClient, getCurrentUser } from "@/lib/supabase/saasServer"
import { signMedia } from "@/lib/server/media"
import { CreateGift } from "./CreateGift"
import { DashboardClient } from "./DashboardClient"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }

// The authenticated buyer dashboard. Auth-gated; replaces the shared "thebeauty"
// /rosesecret for the productized gift. RLS scopes every query to the buyer.
export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const sb = await getSaasServerClient()
  const { data: tenant } = await sb
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!tenant) return <CreateGift email={user.email ?? ""} />

  const [{ data: messages }, { data: moments }] = await Promise.all([
    sb.from("scheduled_messages").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
    sb.from("scheduled_moments").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
  ])

  // Same private-bucket signing as the gift page, so the owner can preview his
  // own uploads without the files being publicly reachable.
  const c = (tenant.customization ?? {}) as Record<string, string>
  const [introVideoUrl, songUrl] = await Promise.all([
    signMedia(c.introVideoUrl),
    signMedia(c.songUrl),
  ])

  return (
    <DashboardClient
      tenant={tenant}
      messages={messages ?? []}
      moments={moments ?? []}
      email={user.email ?? ""}
      media={{ introVideoUrl, songUrl }}
    />
  )
}
