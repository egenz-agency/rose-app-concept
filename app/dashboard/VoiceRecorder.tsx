"use client"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { uploadVoiceAction } from "./actions"
import { MusicIcon, UploadIcon, CheckIcon, TrashIcon } from "@/components/ui/Icons"

// ────────────────────────────────────────────────────────────────────────────
// Record a voice message for a moment — or attach an audio file instead.
//
// Recording is the point: a written note and a spoken one land very
// differently, and hearing someone's voice is the whole reason to add this. The
// file picker is a fallback for browsers without MediaRecorder and for anyone
// who already has a recording they'd rather use.
//
// Format is whatever the browser prefers — Chrome/Firefox produce audio/webm
// (opus), Safari produces audio/mp4. Both are accepted server-side; forcing one
// would silently fail on half of all phones.
//
// The blob is uploaded as soon as recording stops, so by the time the moment is
// saved we already hold a storage path. That keeps the moment insert a plain
// row write and means a failed upload surfaces here, next to the microphone,
// rather than when they press "Add moment".
// ────────────────────────────────────────────────────────────────────────────

const MAX_SECONDS = 180 // three minutes — a message, not a podcast

// Recording support is a browser capability, not React state. Reading it through
// useSyncExternalStore keeps it out of an effect and gives a stable SSR answer.
const noopSubscribe = () => () => {}
const canRecord = () =>
  typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
// Assume supported on the server so the Record button doesn't pop in after
// hydration; a browser without it falls back on the very next render.
const serverCanRecord = () => true

type State = "idle" | "recording" | "uploading" | "ready" | "error"

export function VoiceRecorder({
  value,
  onChange,
}: {
  /** Storage path of the uploaded voice note, or null. */
  value: string | null
  onChange: (path: string | null) => void
}) {
  const [state, setState] = useState<State>(value ? "ready" : "idle")
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const supported = useSyncExternalStore(noopSubscribe, canRecord, serverCanRecord)

  // Tick while recording, and stop automatically at the cap.
  useEffect(() => {
    if (state !== "recording") return
    const t = setInterval(() => {
      setSeconds((n) => {
        if (n + 1 >= MAX_SECONDS) stop()
        return n + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [state])

  // Release the microphone and any object URL if the component goes away
  // mid-recording — otherwise the browser keeps showing the recording
  // indicator, which is alarming and looks like a bug.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const type = rec.mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        await upload(blob, type)
      }
      rec.start()
      recorderRef.current = rec
      setSeconds(0)
      setState("recording")
    } catch {
      // Denied, or no microphone. Not fatal — the file picker still works.
      setError("Microphone unavailable. You can attach an audio file instead.")
      setState("idle")
    }
  }

  function stop() {
    const rec = recorderRef.current
    if (rec && rec.state !== "inactive") rec.stop()
    recorderRef.current = null
  }

  async function upload(blob: Blob, mime: string) {
    setState("uploading")
    setError(null)
    try {
      // validateUpload derives the extension from the filename, and a recorded
      // Blob has none — so give it one that matches the browser's format.
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime })

      const fd = new FormData()
      fd.set("file", file)
      const { path } = await uploadVoiceAction(fd)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
      onChange(path)
      setState("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setState("error")
    }
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSeconds(0)
    onChange(null)
    setState("idle")
    setError(null)
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <MusicIcon size={14} color="rgba(201,168,76,0.8)" />
        <span style={label}>Voice message (optional)</span>
      </div>

      {state === "ready" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#8fbf7a", fontSize: 13 }}>
            <CheckIcon size={14} /> Recorded
          </span>
          {/* Local preview — no round trip needed to hear it back. */}
          {previewUrl && <audio src={previewUrl} controls style={{ height: 34, maxWidth: "100%" }} />}
          <button type="button" className="ctl" onClick={clear} style={{ ...btn, color: "rgba(242,236,224,0.6)" }}>
            <TrashIcon size={13} /> Remove
          </button>
        </div>
      ) : state === "recording" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#e07a8a", fontSize: 14 }}>
            <span style={dot} /> {mmss}
          </span>
          <button type="button" className="ctl" onClick={stop} style={{ ...btn, borderColor: "rgba(232,200,130,0.5)", color: "#f6eeda" }}>
            Stop &amp; save
          </button>
          <span style={hint}>Up to {MAX_SECONDS / 60} minutes</span>
        </div>
      ) : state === "uploading" ? (
        <div>
          <span style={{ fontSize: 13, color: "rgba(242,236,224,0.7)" }}>Saving your recording…</span>
          <div className="sheen" style={{ position: "relative", overflow: "hidden", height: 2, borderRadius: 2, background: "var(--gold-dim)", marginTop: 8 }} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {supported && (
            <button type="button" className="ctl" onClick={start} style={{ ...btn, borderColor: "rgba(232,200,130,0.45)", color: "#f6eeda" }}>
              <span style={{ ...dot, background: "#e07a8a", animation: "none" }} /> Record
            </button>
          )}
          <label className="ctl" style={{ ...btn, cursor: "pointer" }}>
            <UploadIcon size={13} />
            {supported ? "or attach a file" : "Attach an audio file"}
            <input
              type="file" accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f, f.type || "audio/mpeg")
              }}
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            />
          </label>
        </div>
      )}

      {error && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#e58" }}>{error}</p>}
      {!supported && state === "idle" && !error && (
        <p style={{ ...hint, margin: "8px 0 0" }}>
          This browser can&apos;t record audio — attaching a file works everywhere.
        </p>
      )}
    </div>
  )
}

const wrap: React.CSSProperties = {
  border: "1px solid var(--border)", borderRadius: 12,
  padding: "12px 14px", marginTop: 8, background: "rgba(255,255,255,0.02)",
}
const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
  color: "rgba(232,200,130,0.7)",
}
const btn: React.CSSProperties = {
  position: "relative", display: "inline-flex", alignItems: "center", gap: 7,
  padding: "7px 13px", borderRadius: 999,
  border: "1px solid var(--border)", background: "var(--bg-surface)",
  color: "rgba(242,236,224,0.75)", fontSize: 12.5, cursor: "pointer",
}
const hint: React.CSSProperties = { fontSize: 11.5, color: "var(--ivory-ghost)" }
const dot: React.CSSProperties = {
  width: 9, height: 9, borderRadius: 999, background: "#e07a8a",
  display: "inline-block", animation: "pulseDot 1.1s ease-in-out infinite",
}
