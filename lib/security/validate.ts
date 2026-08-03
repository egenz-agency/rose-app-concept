import "server-only"

// Shared input validation + sanitization for all server actions. Server actions
// are a public HTTP surface — anything a browser (or a script) can invoke — so
// every field is length-capped and every URL/media type is checked here rather
// than trusting the client.

export class ValidationError extends Error {}

// ── Text ─────────────────────────────────────────────────────────────────────
export const LIMITS = {
  slug: 48,
  name: 60,
  message: 2000,
  title: 120,
  location: 200,
  note: 500,
  starMemory: 2000,
  starPhotos: 8,
  url: 2048,
} as const

// Trim, strip control characters (except newline/tab), and enforce a max length.
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  // Strip control characters except newline (10) and tab (9).
  let out = ""
  for (const ch of value) {
    const c = ch.codePointAt(0)!
    if (c === 9 || c === 10 || (c >= 32 && c !== 127)) out += ch
  }
  const trimmed = out.trim()
  if (!trimmed) return null
  if (trimmed.length > max) throw new ValidationError(`Too long (max ${max} characters).`)
  return trimmed
}

// Same, but required (throws if empty).
export function requireText(value: unknown, max: number, field = "field"): string {
  const v = cleanText(value, max)
  if (!v) throw new ValidationError(`${field} is required.`)
  return v
}

// ── URLs ─────────────────────────────────────────────────────────────────────
// Only http(s) URLs are allowed for owner-supplied media links, blocking
// javascript:, data:, and other scheme-based tricks.
export function cleanHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  const s = value.trim()
  if (!s) return null
  if (s.length > LIMITS.url) throw new ValidationError("URL is too long.")
  let u: URL
  try {
    u = new URL(s)
  } catch {
    throw new ValidationError("Invalid URL.")
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new ValidationError("Only http(s) links are allowed.")
  }
  return u.toString()
}

// ── Dates / numbers ──────────────────────────────────────────────────────────
export function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const s = value.trim()
  if (s.length > 40) throw new ValidationError("Invalid date.")
  const d = new Date(s)
  if (isNaN(d.getTime())) throw new ValidationError("Invalid date.")
  return s
}

export function cleanInt(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseInt(String(value), 10)
  if (!Number.isFinite(n)) return null
  if (n < min || n > max) throw new ValidationError(`Value must be between ${min} and ${max}.`)
  return Math.trunc(n)
}

export function cleanSlug(value: unknown): string {
  const raw = requireText(value, LIMITS.slug, "Link name")
  const slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!slug) throw new ValidationError("Please choose a valid link name (letters, numbers, dashes).")
  return slug.slice(0, LIMITS.slug)
}

// ── Uploads ──────────────────────────────────────────────────────────────────
// Caps both cost (bandwidth/storage) and file-type abuse. The tenant-media bucket
// is public, so we must never accept HTML/SVG/scripts that could execute when the
// file URL is opened directly.
export const UPLOAD_RULES = {
  intro: {
    maxBytes: 60 * 1024 * 1024, // 60 MB
    mimes: ["video/mp4", "video/webm", "video/quicktime"],
    exts: ["mp4", "webm", "mov"],
    label: "an MP4/WebM video (max 60 MB)",
  },
  song: {
    maxBytes: 15 * 1024 * 1024, // 15 MB
    mimes: ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac", "audio/mp4"],
    exts: ["mp3", "ogg", "wav", "aac", "m4a"],
    label: "an MP3/OGG/WAV audio file (max 15 MB)",
  },
  // A recorded voice note. Wider mime list than `song` because MediaRecorder
  // emits whatever the browser prefers: Chrome/Firefox give audio/webm (opus),
  // Safari gives audio/mp4. Both must be accepted or recording silently fails
  // on half the devices. Smaller cap — this is a spoken message, not a track.
  voice: {
    maxBytes: 10 * 1024 * 1024, // 10 MB — several minutes of speech
    mimes: [
      "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/mp3",
      "audio/wav", "audio/x-wav", "audio/aac", "audio/x-m4a",
    ],
    exts: ["webm", "ogg", "mp4", "m4a", "mp3", "wav", "aac"],
    label: "a voice recording (max 10 MB)",
  },
} as const

export type UploadKind = keyof typeof UPLOAD_RULES

export function validateUpload(kind: string, file: File | null): { kind: UploadKind; ext: string } {
  if (kind !== "intro" && kind !== "song" && kind !== "voice") {
    throw new ValidationError("Unsupported media type.")
  }
  const rule = UPLOAD_RULES[kind]
  if (!file || file.size === 0) throw new ValidationError("No file provided.")
  if (file.size > rule.maxBytes) throw new ValidationError(`File too large — please upload ${rule.label}.`)

  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const baseMime = (file.type || "").split(";")[0].trim().toLowerCase()
  const mimeOk = (rule.mimes as readonly string[]).includes(baseMime)
  const extOk = (rule.exts as readonly string[]).includes(ext)
  if (!mimeOk || !extOk) throw new ValidationError(`Unsupported file — please upload ${rule.label}.`)

  return { kind, ext }
}

// A storage path inside the tenant-media bucket: "<tenant-uuid>/<filename>".
// Distinct from cleanHttpUrl because voice notes live in OUR private bucket and
// are stored as paths, not URLs. Rejects traversal and anything not scoped to
// the caller's own tenant folder — the tenantId is resolved server-side, so a
// crafted value can't reach another gift's media.
export function cleanStoragePath(v: unknown, tenantId: string): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  if (!s || s.length > 300) return null
  if (s.includes("..") || s.startsWith("/") || s.includes("\\")) return null
  if (!s.startsWith(`${tenantId}/`)) return null
  if (!/^[A-Za-z0-9/_.-]+$/.test(s)) return null
  return s
}
