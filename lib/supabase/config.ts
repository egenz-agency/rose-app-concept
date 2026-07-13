// Single source of truth for which Supabase project this branch talks to.
//
// main → enchanted-rose. These values are PUBLIC by design (the anon key ships
// to the browser via the NEXT_PUBLIC_ prefix), so we pin them here rather than
// read process.env.NEXT_PUBLIC_SUPABASE_URL. That env name gets auto-injected by
// the Supabase Vercel integration for OTHER projects (e.g. rose-saas), which
// would silently repoint this app at the wrong database. Pinning keeps main on
// enchanted-rose no matter what integrations are attached to the Vercel project.
export const SUPABASE_URL = "https://gwjmiqjativwhsiwryqw.supabase.co"
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3am1pcWphdGl2d2hzaXdyeXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODE4MDQsImV4cCI6MjA5NjE1NzgwNH0.--kQuhqwrvdLa_Q9zA34y4bvmX5_5btahAICINKbyu4"
