import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Cookie-bound server client for the AUTHENTICATED buyer dashboard on rose-saas.
// Unlike admin.ts (service role, bypasses RLS), this carries the buyer's session,
// so every query runs as that user and RLS owner-policies restrict them to their
// own tenant. Used by the dashboard's server components + server actions.
export async function getSaasServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_ROSE_SAAS_URL!,
    process.env.NEXT_PUBLIC_ROSE_SAAS_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // Setting cookies throws when called from a Server Component render;
          // it succeeds in route handlers / server actions. Safe to ignore here.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* called from a Server Component — ignore */
          }
        },
      },
    }
  )
}

// Returns the logged-in buyer (validated against Supabase), or null.
export async function getCurrentUser() {
  const sb = await getSaasServerClient()
  const { data } = await sb.auth.getUser()
  return data.user ?? null
}
