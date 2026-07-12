import { NextResponse } from "next/server"
import { getSaasServerClient } from "@/lib/supabase/saasServer"

// Magic-link landing: Supabase redirects here with a `code`; we exchange it for a
// session cookie, then send the buyer to their dashboard.
// Only allow same-origin relative paths (starting with a single "/"), never a
// protocol-relative "//host" or absolute URL — prevents open-redirect abuse.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard"
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (code) {
    const sb = await getSaasServerClient()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=link`)
}
