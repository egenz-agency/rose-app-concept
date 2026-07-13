import { createBrowserClient } from "@supabase/ssr"
import { FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY } from "./config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any>> | null = null

// This branch (multi-tenant) targets rose-saas. The fallback values live in
// config.ts. The rose-saas Supabase Vercel integration injects
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, which take priority below.
const FALLBACK_URL = FALLBACK_SUPABASE_URL
const FALLBACK_KEY = FALLBACK_SUPABASE_ANON_KEY

// Use the environment override ONLY when BOTH the URL and the anon key are present.
// Otherwise a half-configured Vercel integration (e.g. a stray
// NEXT_PUBLIC_SUPABASE_URL pointing at a different/empty project) could pair a
// wrong URL with the fallback key and break the app. Both-or-neither keeps the
// deployed app pinned to the rose-saas fallback unless you deliberately set
// a complete, matching pair.
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const useEnv = Boolean(envUrl && envKey)

const SUPABASE_URL = useEnv ? (envUrl as string) : FALLBACK_URL
const SUPABASE_KEY = useEnv ? (envKey as string) : FALLBACK_KEY

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
