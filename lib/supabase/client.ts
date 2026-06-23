import { createBrowserClient } from "@supabase/ssr"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any>> | null = null

// These values are PUBLIC by design (the anon key ships to the browser via the
// NEXT_PUBLIC_ prefix), so we keep them as a built-in fallback. That means the
// app connects to Supabase even on a free Vercel plan WITHOUT setting any env
// vars. Setting the env vars on Vercel still takes priority if you prefer.
const FALLBACK_URL = "https://gwjmiqjativwhsiwryqw.supabase.co"
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3am1pcWphdGl2d2hzaXdyeXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODE4MDQsImV4cCI6MjA5NjE1NzgwNH0.--kQuhqwrvdLa_Q9zA34y4bvmX5_5btahAICINKbyu4"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY

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
