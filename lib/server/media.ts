import "server-only"
import { getAdminClient } from "@/lib/supabase/admin"

// ────────────────────────────────────────────────────────────────────────────
// Tenant media (intro video / song).
//
// The `tenant-media` bucket is PRIVATE. Files are reachable only through
// short-lived signed URLs minted here, on the server, for a caller that has
// already passed the access + entitlement gates.
//
// Why not a public bucket: a public URL outlives everything. It would keep
// working after the year lapsed, after a refund, after the gift was deleted —
// so "revoke their access" would quietly not include the most personal content
// in the gift. Unguessable paths are not revocation.
// ────────────────────────────────────────────────────────────────────────────

const BUCKET = "tenant-media"

// Long enough to sit with the gift (and re-watch the intro) without the link
// dying mid-visit; short enough that a URL copied out of devtools is useless by
// the next day. Each page load mints a fresh one.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6 // 6 hours

// What we store in customization is the storage PATH (`<tenantId>/intro-….mp4`).
// Older rows may hold a full public URL from when the bucket was public, so
// accept both rather than silently dropping a gift's video.
export function toStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null
  const marker = `/${BUCKET}/`
  const at = stored.indexOf(marker)
  if (at !== -1) return stored.slice(at + marker.length)
  // A bare path (the current format). Anything else http-ish isn't ours.
  return stored.startsWith("http") ? null : stored
}

// Mint a signed URL for one stored media value. Returns null when there's
// nothing stored or the object has gone — callers fall back to their default.
export async function signMedia(stored: string | null | undefined): Promise<string | null> {
  const path = toStoragePath(stored)
  if (!path) return null
  try {
    const { data, error } = await getAdminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}
