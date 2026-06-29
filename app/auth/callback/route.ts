import { NextResponse } from "next/server"
import { getSaasServerClient } from "@/lib/supabase/saasServer"

// Magic-link landing: Supabase redirects here with a `code`; we exchange it for a
// session cookie, then send the buyer to their dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const sb = await getSaasServerClient()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=link`)
}
