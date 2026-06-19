import { createBrowserClient } from "@supabase/ssr"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any>> | null = null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http://") || SUPABASE_URL.startsWith("https://")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): ReturnType<typeof createBrowserClient<any>> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL in .env.local")
  }
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createBrowserClient<any>(SUPABASE_URL, SUPABASE_KEY)
  }
  return client
}
