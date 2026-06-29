import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Server-only admin client for the multi-tenant `rose-saas` project. It uses the
// SERVICE ROLE key, which bypasses RLS — so this file must NEVER be imported from
// client code (the `server-only` import above turns that into a build error).
//
// Security model: the service role can touch every tenant's data, so the SERVER
// code is the gatekeeper. Every tenant-scoped query filters by a `tenant_id` that
// was resolved from a gift slug — the browser never receives this key and never
// picks the tenant_id directly.

let admin: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  const url = process.env.ROSE_SAAS_URL
  const key = process.env.ROSE_SAAS_SERVICE_ROLE_KEY
  if (!url || !key || key === "your_rose_saas_service_role_key") {
    throw new Error(
      "rose-saas not configured — set ROSE_SAAS_URL and ROSE_SAAS_SERVICE_ROLE_KEY in .env.local"
    )
  }
  if (!admin) {
    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return admin
}
