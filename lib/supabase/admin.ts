import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { ROSE_SAAS_URL } from "./roseSaasPublic"

// Server-only admin client for the multi-tenant `rose-saas` project. It uses the
// SERVICE ROLE key, which bypasses RLS — so this file must NEVER be imported from
// client code (the `server-only` import above turns that into a build error).
//
// Security model: the service role can touch every tenant's data, so the SERVER
// code is the gatekeeper. Every tenant-scoped query filters by a `tenant_id` that
// was resolved from a gift slug — the browser never receives this key and never
// picks the tenant_id directly.
//
// The URL is public (falls back via roseSaasPublic); only the SECRET service-role
// key must be supplied via env — it is never hardcoded.

let admin: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  const url = process.env.ROSE_SAAS_URL || ROSE_SAAS_URL
  const key = process.env.ROSE_SAAS_SERVICE_ROLE_KEY
  if (!url || !key || key === "your_rose_saas_service_role_key") {
    throw new Error(
      "rose-saas not configured — set ROSE_SAAS_SERVICE_ROLE_KEY (the service-role secret) in the environment"
    )
  }
  if (!admin) {
    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return admin
}
