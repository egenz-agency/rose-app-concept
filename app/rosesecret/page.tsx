"use client"
import { useState, useEffect, useCallback } from "react"
import {
  fetchScheduledMessages,
  createScheduledMessage,
  deleteScheduledMessage,
  fetchMoments,
  createMoment,
  deleteMoment,
  uploadMomentFile,
  type ScheduledMessage,
  type Moment,
} from "@/lib/supabase/queries"

const PASSWORD = "thebeauty"
const SESSION_KEY = "rosesecret_unlocked"

export default function RoseSecretPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState("")
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true)
    }
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1")
      setUnlocked(true)
      setErr(false)
    } else {
      setErr(true)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0205",
        color: "#f2ece0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px",
      }}
    >
      {!unlocked ? (
        <form onSubmit={submit} style={{ marginTop: "18vh", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(184,148,74,0.6)" }}>
            A secret place
          </span>
          <h1 className="t-display glow-crimson" style={{ fontSize: 30, fontStyle: "italic" }}>
            For the keeper of the rose.
          </h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(false) }}
            placeholder="Password"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${err ? "rgba(180,30,50,0.7)" : "rgba(184,148,74,0.28)"}`,
              color: "#f2ece0",
              fontFamily: "'EB Garamond', serif",
              fontSize: 15,
              outline: "none",
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          />
          {err && (
            <span className="t-serif" style={{ fontSize: 13, color: "rgba(200,80,90,0.85)" }}>
              That is not the word.
            </span>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 999,
              background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
              border: "1px solid rgba(184,148,74,0.28)",
              color: "rgba(242,236,224,0.9)",
              fontFamily: "'EB Garamond', serif",
              fontSize: 15,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            Enter
          </button>
        </form>
      ) : (
        <Admin />
      )}
    </main>
  )
}

function Admin() {
  const [items, setItems] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [author, setAuthor] = useState("")
  const [date, setDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await fetchScheduledMessages())
      setError(null)
    } catch {
      setError("Could not load messages. Is the database reachable?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSaving(true)
    try {
      await createScheduledMessage({
        message: message.trim(),
        author: author.trim() || undefined,
        scheduled_for: date || null,
      })
      setMessage(""); setAuthor(""); setDate("")
      await reload()
    } catch {
      setError("Could not save. Check the database connection.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteScheduledMessage(id)
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch {
      setError("Could not delete that message.")
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(184,148,74,0.22)",
    color: "#f2ece0",
    fontFamily: "'EB Garamond', serif",
    fontSize: 15,
    outline: "none",
  }

  const pending = items.filter((m) => !m.shown)
  const past = items.filter((m) => m.shown)

  return (
    <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(184,148,74,0.6)" }}>
          Keeper of the rose
        </span>
        <h1 className="t-display" style={{ fontSize: 28, fontStyle: "italic", color: "rgba(242,236,224,0.92)" }}>
          Messages for her
        </h1>
        <p className="t-serif" style={{ fontSize: 14, color: "rgba(242,236,224,0.5)", lineHeight: 1.5 }}>
          Anything you schedule here will greet her when she next tends the rose. Leave the date empty to show it on her very next visit, or pick a date to save it for a special day.
        </p>
      </header>

      {/* Compose */}
      <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write something only she will read…"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Signed (optional)"
            style={{ ...inputStyle, flex: "1 1 180px" }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 160px", colorScheme: "dark" }}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !message.trim()}
          style={{
            alignSelf: "flex-start",
            padding: "11px 26px",
            borderRadius: 999,
            background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
            border: "1px solid rgba(184,148,74,0.28)",
            color: "rgba(242,236,224,0.9)",
            fontFamily: "'EB Garamond', serif",
            fontSize: 14,
            letterSpacing: "0.05em",
            cursor: saving || !message.trim() ? "default" : "pointer",
            opacity: saving || !message.trim() ? 0.5 : 1,
          }}
        >
          {saving ? "Saving…" : "Schedule message"}
        </button>
      </form>

      {error && (
        <p className="t-serif" style={{ fontSize: 13, color: "rgba(200,80,90,0.85)" }}>{error}</p>
      )}

      {/* Pending */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(184,148,74,0.55)" }}>
          Upcoming ({pending.length})
        </span>
        {loading && <p className="t-serif" style={{ fontSize: 13, color: "rgba(242,236,224,0.4)" }}>Loading…</p>}
        {!loading && pending.length === 0 && (
          <p className="t-serif" style={{ fontSize: 14, color: "rgba(242,236,224,0.4)" }}>Nothing scheduled yet.</p>
        )}
        {pending.map((m) => (
          <MessageRow key={m.id} m={m} onDelete={() => remove(m.id)} />
        ))}
      </section>

      {/* Already shown */}
      {past.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(184,148,74,0.4)" }}>
            Already delivered ({past.length})
          </span>
          {past.map((m) => (
            <MessageRow key={m.id} m={m} onDelete={() => remove(m.id)} dim />
          ))}
        </section>
      )}

      <div style={{ height: 1, background: "rgba(184,148,74,0.14)", margin: "8px 0" }} />

      <MomentsAdmin />
    </div>
  )
}

// ── Moments: schedule a photo / clip / message for a visit number or a date ──
function MomentsAdmin() {
  const [items, setItems]     = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle]     = useState("")
  const [message, setMessage] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [triggerKind, setTriggerKind] = useState<"visit" | "date">("visit")
  const [visit, setVisit]     = useState("")
  const [date, setDate]       = useState("")
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState<"photo" | "video" | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchMoments()); setError(null) }
    catch { setError("Could not load moments. Is the database reachable?") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { reload() }, [reload])

  const onUpload = async (file: File | undefined, kind: "photo" | "video") => {
    if (!file) return
    setUploading(kind)
    try {
      const url = await uploadMomentFile(file)
      if (kind === "photo") setPhotoUrl(url); else setVideoUrl(url)
    } catch {
      setError("Upload failed. Run migration 005 (the 'moments' storage bucket) in Supabase.")
    } finally { setUploading(null) }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasContent = message.trim() || photoUrl || videoUrl || title.trim()
    const hasTrigger = (triggerKind === "visit" && visit) || (triggerKind === "date" && date)
    if (!hasContent || !hasTrigger) { setError("Add some content and a trigger (visit number or date)."); return }
    setSaving(true)
    try {
      await createMoment({
        title, message,
        photo_url: photoUrl || null,
        video_url: videoUrl || null,
        trigger_visit: triggerKind === "visit" ? parseInt(visit, 10) : null,
        trigger_date:  triggerKind === "date" ? date : null,
      })
      setTitle(""); setMessage(""); setPhotoUrl(""); setVideoUrl(""); setVisit(""); setDate("")
      await reload()
    } catch {
      setError("Could not save. Make sure migration 005 has been run in Supabase.")
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    try { await deleteMoment(id); setItems((p) => p.filter((m) => m.id !== id)) }
    catch { setError("Could not delete that moment.") }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,148,74,0.22)",
    color: "#f2ece0", fontFamily: "'EB Garamond', serif", fontSize: 15, outline: "none",
  }
  const pending = items.filter((m) => !m.shown)
  const past = items.filter((m) => m.shown)

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(184,148,74,0.6)" }}>
          Moments
        </span>
        <h2 className="t-display" style={{ fontSize: 24, fontStyle: "italic", color: "rgba(242,236,224,0.92)" }}>
          A photo, a clip, a message
        </h2>
        <p className="t-serif" style={{ fontSize: 13.5, color: "rgba(242,236,224,0.5)", lineHeight: 1.5 }}>
          Schedule a moment to appear when she tends the rose on a chosen visit (e.g. the 5th) or a date.
        </p>
      </div>

      <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" style={inputStyle} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (optional)" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />

        {/* Photo */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ ...inputStyle, flex: "1 1 150px", cursor: "pointer", color: uploading === "photo" ? "rgba(242,236,224,0.5)" : "#c9a84c" }}>
            {uploading === "photo" ? "Uploading photo…" : (photoUrl ? "✓ Photo added — replace" : "Upload photo")}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0], "photo")} />
          </label>
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="…or paste photo URL" style={{ ...inputStyle, flex: "1 1 150px" }} />
        </div>

        {/* Video */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ ...inputStyle, flex: "1 1 150px", cursor: "pointer", color: uploading === "video" ? "rgba(242,236,224,0.5)" : "#c9a84c" }}>
            {uploading === "video" ? "Uploading clip…" : (videoUrl ? "✓ Clip added — replace" : "Upload clip")}
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0], "video")} />
          </label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="…or paste clip URL" style={{ ...inputStyle, flex: "1 1 150px" }} />
        </div>

        {/* Trigger */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={triggerKind} onChange={(e) => setTriggerKind(e.target.value as "visit" | "date")} style={{ ...inputStyle, flex: "1 1 140px", colorScheme: "dark" }}>
            <option value="visit">On visit number</option>
            <option value="date">On a date</option>
          </select>
          {triggerKind === "visit" ? (
            <input type="number" min={1} value={visit} onChange={(e) => setVisit(e.target.value)} placeholder="e.g. 5" style={{ ...inputStyle, flex: "1 1 140px" }} />
          ) : (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, flex: "1 1 160px", colorScheme: "dark" }} />
          )}
        </div>

        <button type="submit" disabled={saving} style={{
          alignSelf: "flex-start", padding: "11px 26px", borderRadius: 999,
          background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
          border: "1px solid rgba(184,148,74,0.28)", color: "rgba(242,236,224,0.9)",
          fontFamily: "'EB Garamond', serif", fontSize: 14, letterSpacing: "0.05em",
          cursor: saving ? "default" : "pointer", opacity: saving ? 0.5 : 1,
        }}>
          {saving ? "Saving…" : "Schedule moment"}
        </button>
      </form>

      {error && <p className="t-serif" style={{ fontSize: 13, color: "rgba(200,80,90,0.85)" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(184,148,74,0.55)" }}>
          Upcoming moments ({pending.length})
        </span>
        {loading && <p className="t-serif" style={{ fontSize: 13, color: "rgba(242,236,224,0.4)" }}>Loading…</p>}
        {!loading && pending.length === 0 && <p className="t-serif" style={{ fontSize: 14, color: "rgba(242,236,224,0.4)" }}>No moments yet.</p>}
        {pending.map((m) => <MomentRow key={m.id} m={m} onDelete={() => remove(m.id)} />)}
        {past.map((m) => <MomentRow key={m.id} m={m} onDelete={() => remove(m.id)} dim />)}
      </div>
    </section>
  )
}

function MomentRow({ m, onDelete, dim }: { m: Moment; onDelete: () => void; dim?: boolean }) {
  const when = m.trigger_visit != null ? `Visit #${m.trigger_visit}` : m.trigger_date ? `On ${m.trigger_date}` : "—"
  const bits = [m.photo_url && "photo", m.video_url && "clip", m.message && "message"].filter(Boolean).join(" · ")
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", borderRadius: 14,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,148,74,0.16)", opacity: dim ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <span className="t-display" style={{ fontSize: 15, fontStyle: "italic", color: "rgba(242,236,224,0.9)" }}>
          {m.title || m.message || bits || "Moment"}
        </span>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(184,148,74,0.6)" }}>
          {when}{bits ? ` · ${bits}` : ""}{m.shown ? " · delivered" : ""}
        </span>
      </div>
      <button onClick={onDelete} aria-label="Delete" style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 999,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(242,236,224,0.6)", cursor: "pointer", fontSize: 14, lineHeight: 1,
      }}>×</button>
    </div>
  )
}

function MessageRow({ m, onDelete, dim }: { m: ScheduledMessage; onDelete: () => void; dim?: boolean }) {
  const when = m.scheduled_for ? `On ${m.scheduled_for}` : "Next visit"
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(184,148,74,0.16)",
        opacity: dim ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <span className="t-display" style={{ fontSize: 16, fontStyle: "italic", color: "rgba(242,236,224,0.9)", lineHeight: 1.45 }}>
          {m.message}
        </span>
        <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(184,148,74,0.6)" }}>
          {when}{m.author ? ` · ${m.author}` : ""}{m.shown ? " · delivered" : ""}
        </span>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete"
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(242,236,224,0.6)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
