"use server"

import { revalidatePath } from "next/cache"
import { getSaasServerClient, getCurrentUser } from "@/lib/supabase/saasServer"
import { getAdminClient } from "@/lib/supabase/admin"

// All dashboard mutations run through the buyer's OWN session, so Postgres RLS
// guarantees they can only ever touch their own tenant's rows. We additionally
// resolve the tenant_id server-side (never trust a client-supplied id).

async function requireMyTenantId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  const sb = await getSaasServerClient()
  const { data } = await sb.from("tenants").select("id").order("created_at", { ascending: true }).limit(1).single()
  if (!data) throw new Error("No gift yet")
  return data.id as string
}

export async function createGiftAction(input: { slug: string; recipient: string; giver: string }) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!slug) throw new Error("Please choose a link name")
  const sb = await getSaasServerClient()
  const { error } = await sb.rpc("create_my_tenant", {
    p_slug: slug,
    p_recipient: input.recipient.trim() || null,
    p_giver: input.giver.trim() || null,
  })
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      throw new Error("That link name is taken — try another.")
    }
    throw new Error(error.message)
  }
  revalidatePath("/dashboard")
}

export async function addMessageAction(input: { message: string; author?: string; scheduled_for?: string | null }) {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_messages").insert({
    tenant_id: tenantId,
    message: input.message.trim(),
    author: input.author?.trim() || "Your love",
    scheduled_for: input.scheduled_for || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function deleteMessageAction(id: string) {
  await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_messages").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function addMomentAction(input: {
  title?: string
  message?: string
  photo_url?: string | null
  video_url?: string | null
  trigger_visit?: number | null
  trigger_date?: string | null
  repeat_every?: number | null
}) {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_moments").insert({
    tenant_id: tenantId,
    title: input.title?.trim() || null,
    message: input.message?.trim() || null,
    photo_url: input.photo_url || null,
    video_url: input.video_url || null,
    trigger_visit: input.trigger_visit ?? null,
    trigger_date: input.trigger_date || null,
    repeat_every: input.repeat_every ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function deleteMomentAction(id: string) {
  await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_moments").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function updateNamesAction(input: { recipient: string; giver: string }) {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb
    .from("tenants")
    .update({ recipient_name: input.recipient.trim() || null, giver_name: input.giver.trim() || null })
    .eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

// Upload an intro video or song to the tenant's media folder and save its public
// URL into customization. Upload uses the service role (storage), the customization
// write uses the buyer's session (RLS).
export async function uploadMediaAction(formData: FormData) {
  const tenantId = await requireMyTenantId()
  const kind = String(formData.get("kind") || "")
  const file = formData.get("file") as File | null
  if (kind !== "intro" && kind !== "song") throw new Error("Bad media kind")
  if (!file || file.size === 0) throw new Error("No file")

  const ext = (file.name.split(".").pop() || "bin").toLowerCase()
  const path = `${tenantId}/${kind}-${Date.now()}.${ext}`

  const admin = getAdminClient()
  const { error: upErr } = await admin.storage.from("tenant-media").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  })
  if (upErr) throw new Error(upErr.message)
  const url = admin.storage.from("tenant-media").getPublicUrl(path).data.publicUrl

  const sb = await getSaasServerClient()
  const { data: t } = await sb.from("tenants").select("customization").eq("id", tenantId).single()
  const key = kind === "intro" ? "introVideoUrl" : "songUrl"
  const customization = { ...((t?.customization as Record<string, unknown>) ?? {}), [key]: url }
  const { error } = await sb.from("tenants").update({ customization }).eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function clearMediaAction(kind: "intro" | "song") {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { data: t } = await sb.from("tenants").select("customization").eq("id", tenantId).single()
  const customization = { ...((t?.customization as Record<string, unknown>) ?? {}) }
  delete customization[kind === "intro" ? "introVideoUrl" : "songUrl"]
  const { error } = await sb.from("tenants").update({ customization }).eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function signOutAction() {
  const sb = await getSaasServerClient()
  await sb.auth.signOut()
  revalidatePath("/dashboard")
}
