import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config"

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  // Pinned to enchanted-rose via config.ts (not process.env) so the rose-saas
  // Supabase integration's injected NEXT_PUBLIC_SUPABASE_URL can't repoint main.
  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
