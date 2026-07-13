// Single source of truth for which Supabase project this branch talks to.
//
// multi-tenant → rose-saas. These values are PUBLIC by design (the anon key
// ships to the browser via the NEXT_PUBLIC_ prefix). The rose-saas Supabase
// Vercel integration injects NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, which take
// priority (see client.ts); these constants are the fallback so a deployment
// without those env vars still lands on rose-saas rather than the wrong DB.
export const FALLBACK_SUPABASE_URL = "https://fqosivbvqgjjfgfpfcbu.supabase.co"
export const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxb3NpdmJ2cWdqamZnZnBmY2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDE5MzAsImV4cCI6MjA5ODA3NzkzMH0.MZXrIjkGvJ6Xyk_PbDcvtsEEdrOS0zCbmCMtbDO6tBE"
