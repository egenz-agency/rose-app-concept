"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addMessageAction, deleteMessageAction,
  addMomentAction, deleteMomentAction, signOutAction,
  updateNamesAction, uploadMediaAction, clearMediaAction,
} from "./actions"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

export function DashboardClient({
  tenant, messages, moments, email,
}: { tenant: Row; messages: Row[]; moments: Row[]; email: string }) {
  const router = useRouter()
  const giftPath = `/r/${tenant.slug}`
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}${giftPath}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  const refresh = () => router.refresh()

  return (
    <div style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0205", padding: "32px 20px 80px", color: "#f2ece0" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ color: "rgba(242,236,224,0.45)", fontSize: 12, fontFamily: "'EB Garamond', serif" }}>{email}</span>
          <form action={async () => { await signOutAction(); router.replace("/login") }}>
            <button type="submit" style={ghostBtn}>Sign out</button>
          </form>
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 30, marginBottom: 4 }}>
          {tenant.recipient_name ? `For ${tenant.recipient_name}` : "Your gift"}
        </h1>

        {/* Gift link */}
        <div style={card}>
          <div style={sectionLabel}>The gift link to send her</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 14, color: "#e8c882", wordBreak: "break-all" }}>{giftPath}</code>
            <button onClick={copyLink} style={smallBtn}>{copied ? "Copied!" : "Copy"}</button>
            <a href={giftPath} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: "none" }}>Open</a>
          </div>
        </div>

        {/* Customize */}
        <Section title="Customize">
          <Customize tenant={tenant} onDone={refresh} />
        </Section>

        {/* Scheduled messages */}
        <Section title="Scheduled messages">
          <AddMessage onDone={refresh} />
          {messages.length === 0 && <Empty>No messages yet.</Empty>}
          {messages.map((m) => (
            <RowItem key={m.id}
              title={m.message}
              subtitle={`${m.author ?? ""}${m.scheduled_for ? ` · ${m.scheduled_for}` : " · next visit"}${m.shown ? " · delivered" : ""}`}
              onDelete={async () => { await deleteMessageAction(m.id); refresh() }}
            />
          ))}
        </Section>

        {/* Moments */}
        <Section title="Moments (photo / clip / message)">
          <AddMoment onDone={refresh} />
          {moments.length === 0 && <Empty>No moments yet.</Empty>}
          {moments.map((m) => (
            <RowItem key={m.id}
              title={m.title || m.message || "(media)"}
              subtitle={momentWhen(m)}
              onDelete={async () => { await deleteMomentAction(m.id); refresh() }}
            />
          ))}
        </Section>
      </div>
    </div>
  )
}

function momentWhen(m: Row): string {
  if (m.repeat_every) return `every ${m.repeat_every} visits`
  if (m.trigger_visit != null) return `on visit ${m.trigger_visit}`
  if (m.trigger_date) return `on ${m.trigger_date}`
  return "next visit"
}

function Customize({ tenant, onDone }: { tenant: Row; onDone: () => void }) {
  const c = (tenant.customization ?? {}) as Record<string, string>
  const [recipient, setRecipient] = useState(tenant.recipient_name ?? "")
  const [giver, setGiver] = useState(tenant.giver_name ?? "")
  const [busy, setBusy] = useState(false)

  async function saveNames(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try { await updateNamesAction({ recipient, giver }); onDone() } finally { setBusy(false) }
  }

  return (
    <>
      <form onSubmit={saveNames} style={formBox}>
        <div style={sectionLabel}>Names</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Her name" style={{ ...input, flex: 1, minWidth: 120 }} />
          <input value={giver} onChange={(e) => setGiver(e.target.value)} placeholder="Your name" style={{ ...input, flex: 1, minWidth: 120 }} />
        </div>
        <button type="submit" disabled={busy} style={addBtn(busy)}>{busy ? "Saving…" : "Save names"}</button>
      </form>

      <MediaUpload kind="intro" label="Intro video" accept="video/*" current={c.introVideoUrl} onDone={onDone} />
      <MediaUpload kind="song" label="Background song" accept="audio/*" current={c.songUrl} onDone={onDone} />
    </>
  )
}

function MediaUpload({ kind, label, accept, current, onDone }: {
  kind: "intro" | "song"; label: string; accept: string; current?: string; onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.set("kind", kind)
      fd.set("file", file)
      await uploadMediaAction(fd)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally { setBusy(false) }
  }

  return (
    <div style={formBox}>
      <div style={sectionLabel}>{label}</div>
      <div style={{ fontSize: 13, color: current ? "#9c7" : "rgba(242,236,224,0.4)", fontFamily: "'EB Garamond', serif" }}>
        {busy ? "Uploading…" : current ? "✓ custom file set" : "using default"}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept={accept} onChange={upload} disabled={busy} style={{ fontSize: 12, color: "rgba(242,236,224,0.7)" }} />
        {current && (
          <button onClick={async () => { setBusy(true); try { await clearMediaAction(kind); onDone() } finally { setBusy(false) } }} disabled={busy} style={{ ...smallBtn, color: "#e58" }}>
            Reset to default
          </button>
        )}
      </div>
      {error && <p style={{ color: "#e58", fontSize: 12 }}>{error}</p>}
    </div>
  )
}

function AddMessage({ onDone }: { onDone: () => void }) {
  const [message, setMessage] = useState("")
  const [author, setAuthor] = useState("")
  const [date, setDate] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); if (!message.trim()) return
        setBusy(true)
        try { await addMessageAction({ message, author, scheduled_for: date || null }); setMessage(""); setAuthor(""); setDate(""); onDone() }
        finally { setBusy(false) }
      }}
      style={formBox}
    >
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message…" rows={2} style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="From (e.g. Yours)" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...input, width: 150 }} />
      </div>
      <button type="submit" disabled={busy} style={addBtn(busy)}>{busy ? "Adding…" : "Add message"}</button>
    </form>
  )
}

function AddMoment({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [photo, setPhoto] = useState("")
  const [video, setVideo] = useState("")
  const [kind, setKind] = useState<"visit" | "date" | "repeat">("visit")
  const [visit, setVisit] = useState("")
  const [date, setDate] = useState("")
  const [repeat, setRepeat] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await addMomentAction({
            title, message,
            photo_url: photo || null, video_url: video || null,
            trigger_visit: kind === "visit" && visit ? parseInt(visit, 10) : null,
            trigger_date: kind === "date" ? date || null : null,
            repeat_every: kind === "repeat" && repeat ? parseInt(repeat, 10) : null,
          })
          setTitle(""); setMessage(""); setPhoto(""); setVideo(""); setVisit(""); setDate(""); setRepeat(""); onDone()
        } finally { setBusy(false) }
      }}
      style={formBox}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" style={input} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (optional)" rows={2} style={input} />
      <input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="Photo URL (optional)" style={input} />
      <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Video URL (optional)" style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as any)} style={{ ...input, width: 150 }}>
          <option value="visit">On visit number</option>
          <option value="date">On a date</option>
          <option value="repeat">Every N visits</option>
        </select>
        {kind === "visit" && <input value={visit} onChange={(e) => setVisit(e.target.value)} placeholder="e.g. 3" type="number" style={{ ...input, width: 110 }} />}
        {kind === "date" && <input value={date} onChange={(e) => setDate(e.target.value)} type="date" style={{ ...input, width: 150 }} />}
        {kind === "repeat" && <input value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="e.g. 3" type="number" style={{ ...input, width: 110 }} />}
      </div>
      <button type="submit" disabled={busy} style={addBtn(busy)}>{busy ? "Adding…" : "Add moment"}</button>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 12, color: "rgba(242,236,224,0.9)" }}>{title}</h2>
      {children}
    </div>
  )
}

function RowItem({ title, subtitle, onDelete }: { title: string; subtitle: string; onDelete: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontFamily: "'EB Garamond', serif", whiteSpace: "pre-wrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(242,236,224,0.45)", marginTop: 4 }}>{subtitle}</div>
      </div>
      <button onClick={async () => { setBusy(true); await onDelete() }} disabled={busy} style={{ ...smallBtn, color: "#e58", flexShrink: 0 }}>
        {busy ? "…" : "Delete"}
      </button>
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) =>
  <p style={{ color: "rgba(242,236,224,0.35)", fontSize: 13, fontStyle: "italic" }}>{children}</p>

const card: React.CSSProperties = { border: "1px solid rgba(184,148,74,0.18)", borderRadius: 14, padding: 16, marginTop: 10, background: "rgba(255,255,255,0.02)" }
const formBox: React.CSSProperties = { ...card, display: "flex", flexDirection: "column", gap: 8 }
const sectionLabel: React.CSSProperties = { fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(232,200,130,0.7)", marginBottom: 8 }
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(184,148,74,0.25)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 14, outline: "none", fontFamily: "'EB Garamond', serif", resize: "vertical" }
const addBtn = (busy: boolean): React.CSSProperties => ({ alignSelf: "flex-start", padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "rgba(138,21,40,0.85)", color: "#f2ece0", fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1, fontFamily: "'EB Garamond', serif" })
const smallBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "rgba(255,255,255,0.05)", color: "#f2ece0", fontSize: 12, cursor: "pointer", fontFamily: "'EB Garamond', serif" }
const ghostBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(242,236,224,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "'EB Garamond', serif" }
