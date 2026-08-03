"use client"
import { useState } from "react"
import { DownloadIcon, CheckIcon } from "./Icons"

// ────────────────────────────────────────────────────────────────────────────
// "Save" for a revealed moment — she keeps it, not just sees it.
//
// Why this isn't <a download>: the anchor's `download` attribute is ignored for
// cross-origin responses, and the media lives on Supabase's storage domain
// behind a signed URL. The browser would navigate to the file instead of saving
// it, which on a phone means leaving the gift. So we fetch the bytes and hand
// the browser a same-origin blob: URL, which it will always save.
//
// A text-only moment saves as .txt rather than offering nothing — the words are
// the gift in that case.
// ────────────────────────────────────────────────────────────────────────────

type Status = "idle" | "working" | "done" | "error"

function extensionFor(url: string, mime: string): string {
  const fromUrl = url.split("?")[0].split(".").pop()?.toLowerCase()
  if (fromUrl && /^[a-z0-9]{2,4}$/.test(fromUrl)) return fromUrl
  const sub = mime.split("/")[1]?.split(";")[0]
  return sub && /^[a-z0-9]{2,4}$/.test(sub) ? sub : "dat"
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function SaveMoment({
  url,
  text,
  baseName = "moment",
  label = "Save",
}: {
  /** Signed media URL, if the moment has media. */
  url?: string | null
  /** Falls back to saving the words when there's no media. */
  text?: string | null
  baseName?: string
  label?: string
}) {
  const [status, setStatus] = useState<Status>("idle")

  if (!url && !text) return null

  const safeName = baseName.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").slice(0, 40) || "moment"

  async function save() {
    setStatus("working")
    try {
      if (url) {
        const res = await fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()
        const href = URL.createObjectURL(blob)
        triggerDownload(href, `${safeName}.${extensionFor(url, blob.type)}`)
        // Revoke on the next tick — revoking immediately can cancel the save
        // in some browsers before it has read the blob.
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
      } else if (text) {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
        const href = URL.createObjectURL(blob)
        triggerDownload(href, `${safeName}.txt`)
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
      }
      setStatus("done")
      setTimeout(() => setStatus("idle"), 2500)
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3500)
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={status === "working"}
      className="ctl"
      style={btn}
      aria-label={label}
    >
      {status === "done" ? <CheckIcon size={13} color="#8fbf7a" /> : <DownloadIcon size={13} />}
      {status === "working" ? "Saving…"
        : status === "done" ? "Saved"
        : status === "error" ? "Couldn't save"
        : label}
    </button>
  )
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "7px 14px", borderRadius: 999,
  border: "1px solid rgba(184,148,74,0.28)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(242,236,224,0.75)",
  fontSize: 12.5, cursor: "pointer",
  fontFamily: "'EB Garamond', Georgia, serif",
}
