import "server-only"
import { headers } from "next/headers"
import { getAdminClient } from "@/lib/supabase/admin"

// Distributed rate limiting via a Postgres sliding-window counter (works across
// serverless instances, unlike an in-memory map). Server actions are a public
// HTTP surface, so the expensive/abusable ones are gated here.

export class RateLimitError extends Error {
  constructor(msg = "Too many requests — please slow down and try again in a moment.") {
    super(msg)
  }
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export async function clientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64) || "unknown"
  return (h.get("x-real-ip") || "unknown").slice(0, 64)
}

// Throws RateLimitError when the bucket exceeds maxHits within windowSecs.
// Fails OPEN on limiter-infrastructure errors so a DB hiccup never takes down
// the gift experience — the limiter is a safety net, not a hard dependency.
export async function enforceRateLimit(bucket: string, maxHits: number, windowSecs: number): Promise<void> {
  try {
    const sb = getAdminClient()
    const { data, error } = await sb.rpc("hit_rate_limit", {
      p_bucket: bucket.slice(0, 160),
      p_max: maxHits,
      p_window_secs: windowSecs,
    })
    if (error) return // fail open
    if (data === false) throw new RateLimitError()
  } catch (e) {
    if (e instanceof RateLimitError) throw e
    // any other (infra) error → fail open
  }
}
