"use client"
import { createBrowserClient } from "@supabase/ssr"

// Browser client for rose-saas, used only for buyer auth actions on the client
// (request magic link, sign out, read current session). All real data access
// still goes through server actions; this just manages the auth session cookie.
let client: ReturnType<typeof createBrowserClient> | null = null

export function getSaasBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_ROSE_SAAS_URL!,
      process.env.NEXT_PUBLIC_ROSE_SAAS_ANON_KEY!
    )
  }
  return client
}
