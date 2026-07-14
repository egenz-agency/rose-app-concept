// PUBLIC rose-saas connection values (URL + anon key). The anon key is designed
// to ship to the browser, so we keep it as a built-in fallback — the app's auth
// and RLS-scoped queries work even if the Vercel NEXT_PUBLIC_ROSE_SAAS_* env vars
// aren't set. Setting those env vars still takes priority.
//
// NOTE: this is ONLY the anon/public pair. The service-role key (admin.ts) is a
// secret and is never hardcoded — it must come from ROSE_SAAS_SERVICE_ROLE_KEY.
const FALLBACK_URL = "https://fqosivbvqgjjfgfpfcbu.supabase.co"
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxb3NpdmJ2cWdqamZnZnBmY2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDE5MzAsImV4cCI6MjA5ODA3NzkzMH0.MZXrIjkGvJ6Xyk_PbDcvtsEEdrOS0zCbmCMtbDO6tBE"

export const ROSE_SAAS_URL = process.env.NEXT_PUBLIC_ROSE_SAAS_URL || FALLBACK_URL
export const ROSE_SAAS_ANON_KEY =
  process.env.NEXT_PUBLIC_ROSE_SAAS_ANON_KEY || FALLBACK_ANON_KEY
