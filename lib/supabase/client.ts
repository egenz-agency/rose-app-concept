import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any>> | null = null

// This branch (main) is pinned to enchanted-rose via lib/supabase/config.ts.
// We deliberately do NOT read process.env.NEXT_PUBLIC_SUPABASE_URL here: the
// Supabase Vercel integration for rose-saas injects that exact name, which used
// to silently repoint main at the wrong database (date_invitations lives only in
// enchanted-rose). See config.ts for the full explanation.

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http://") || SUPABASE_URL.startsWith("https://")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): ReturnType<typeof createBrowserClient<any>> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL in .env.local")
  }
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createBrowserClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}
