"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addMessageAction, deleteMessageAction,
  addMomentAction, deleteMomentAction, signOutAction,
  updateNamesAction, uploadMediaAction, clearMediaAction, deleteAccountAction
} from "./actions"
import { MissYouOwner } from "./MissYouOwner"
import { GiftStatus } from "./GiftStatus"
import { isGiftLive } from "@/lib/payments/entitlement"
import { LEGAL } from "@/components/legal/LegalLayout"
import { InstallAppButton } from "@/components/ui/InstallAppButton"
import { SupportLinks } from "@/components/ui/SupportLinks"
import { DashboardTour, ReopenTourButton } from "./DashboardTour"
import { VoiceRecorder } from "./VoiceRecorder"
import { FilmIcon, MusicIcon, UploadIcon, CheckIcon, TrashIcon } from "@/components/ui/Icons"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

export interface SignedMedia {
  introVideoUrl: string | null
  songUrl: string | null
}

export function DashboardClient({
  tenant, messages, moments, email, media, isOperator = false, tourSeen = true
}: {
  tenant: Row; messages: Row[]; moments: Row[]; email: string
  media: SignedMedia; isOperator?: boolean; tourSeen?: boolean
}) {
  const router = useRouter()
  const isLive = isGiftLive({
    status: String(tenant.status ?? "draft"),
    paid: Boolean(tenant.paid),
    expires_at: (tenant.expires_at as string | null) ?? null
  })
  const refresh = () => router.refresh()

  return (
    <div className="ui-surface" style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0205", padding: "32px 20px 80px", color: "#f2ece0" }}>
      {/* Runs once, on the first visit after signing up. */}
      <DashboardTour open={!tourSeen} />

      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "rgba(242,236,224,0.45)", fontSize: 12 }}>{email}</span>
            {isOperator && (
              <a href="/admin" style={{ ...ghostBtn, textDecoration: "none", borderColor: "rgba(232,200,130,0.4)", color: "#e8c882" }}>
                Operator
              </a>
            )}
          </span>
          <form action={async () => { await signOutAction(); router.replace("/login") }}>
            <button type="submit" style={ghostBtn}>Sign out</button>
          </form>
        </div>

        <h1 style={{ fontSize: 30, marginBottom: 4 }}>
          {tenant.recipient_name ? `For ${tenant.recipient_name}` : "Your gift"}
        </h1>

        {/* Gift link — or the paywall in front of it while unpaid/expired */}
        <GiftStatus tenant={tenant} />

        {/* Install the owner app. Removes itself once installed. */}
        <InstallAppButton
          label="Install the owner app"
          hint="Keep your gift one tap away — and get her “I miss you” notifications on your phone."
          style={{ marginTop: 14 }}
        />

        {/* "I miss you" — reach her from here, no need to open her gift link.
            Pointless before the gift is live: she has no device registered yet. */}
        {isLive && <MissYouOwner recipientName={(tenant.recipient_name as string | null) ?? null} />}

        {/* Customize */}
        <Section title="Customize">
          <Customize tenant={tenant} media={media} onDone={refresh} />
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
        <Section title="Moments (photo / clip / voice / message)">
          <AddMoment onDone={refresh} />
          {moments.length === 0 && <Empty>No moments yet.</Empty>}
          {moments.map((m) => (
            <RowItem key={m.id}
              title={m.title || m.message || (m.audio_url ? "Voice message" : "(media)")}
              subtitle={`${m.audio_url ? "voice · " : ""}${momentWhen(m)}`}
              onDelete={async () => { await deleteMomentAction(m.id); refresh() }}
            />
          ))}
        </Section>

        <footer style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid rgba(184,148,74,0.12)", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          <a href="/legal/privacy" style={footLink}>Privacy</a>
          <a href="/legal/terms" style={footLink}>Terms</a>
          <a href="/legal/cookies" style={footLink}>Cookies</a>
          <a href={`mailto:${LEGAL.contactEmail}`} style={footLink}>Contact</a>
          <ReopenTourButton />
          {/* GDPR right to erasure. A footer link rather than a permanent
              red-bordered panel: it's a rare, terminal action, and giving it a
              whole section made the dashboard feel like it was warning you
              about something every visit. */}
          <DeleteAccountLink />
        </footer>

        <SupportLinks context="owner dashboard" style={{ marginTop: 22 }} />
      </div>
    </div>
  )
}

function DeleteAccountLink() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...footLink, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12 }}>
        Delete account
      </button>

      {open && (
        <div style={confirmBackdrop} role="dialog" aria-modal="true" aria-label="Delete account">
          <div style={confirmPanel}>
            <div style={{ ...sectionLabel, color: "#e07a8a" }}>Delete account &amp; all data</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(242,236,224,0.7)", margin: "0 0 6px" }}>
              This permanently deletes your account, every gift you made, and all uploaded media.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(242,236,224,0.45)", margin: "0 0 18px" }}>
              Her rose stops working immediately. This cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="ctl" onClick={() => { setOpen(false); setError(null) }} disabled={busy} style={ghostBtn}>
                Keep my account
              </button>
              <button
                className="ctl"
                disabled={busy}
                onClick={async () => {
                  setBusy(true); setError(null)
                  try { await deleteAccountAction(); router.replace("/login") }
                  catch (e) { setError(e instanceof Error ? e.message : "Failed"); setBusy(false) }
                }}
                style={{ ...smallBtn, background: "rgba(160,20,30,0.85)", color: "#f6eeda", borderColor: "rgba(200,60,60,0.5)", padding: "9px 16px" }}
              >
                {busy ? "Deleting…" : "Delete everything"}
              </button>
            </div>
            {error && <p style={{ color: "#e07a8a", fontSize: 12, marginTop: 10 }}>{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}

const confirmBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 70,
  background: "rgba(6,2,4,0.82)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
}
const confirmPanel: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#140510",
  border: "1px solid rgba(200,60,60,0.35)", borderRadius: 18,
  padding: "22px 22px 20px", color: "#f2ece0",
  boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
}

const footLink: React.CSSProperties = { color: "rgba(242,236,224,0.5)", textDecoration: "none" }

function momentWhen(m: Row): string {
  if (m.repeat_every) return `every ${m.repeat_every} visits`
  if (m.trigger_visit != null) return `on visit ${m.trigger_visit}`
  if (m.trigger_date) return `on ${m.trigger_date}`
  return "next visit"
}

function Customize({ tenant, media, onDone }: { tenant: Row; media: SignedMedia; onDone: () => void }) {
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

      <MediaUpload kind="intro" label="Intro video" accept="video/*" current={media.introVideoUrl ?? undefined} onDone={onDone} />
      <MediaUpload kind="song" label="Background song" accept="audio/*" current={media.songUrl ?? undefined} onDone={onDone} />
    </>
  )
}

function MediaUpload({ kind, label, accept, current, onDone }: {
  kind: "intro" | "song"; label: string; accept: string; current?: string; onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = `media-${kind}`

  // The native file input is visually hidden behind the label below. It can't
  // be styled meaningfully and renders as a different application on every OS —
  // but it stays in the DOM so keyboard and screen-reader users get the real
  // control, and the label's htmlFor keeps them connected.
  async function send(file: File | undefined) {
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
    } finally { setBusy(false); setDragging(false) }
  }

  const Icon = kind === "intro" ? FilmIcon : MusicIcon
  const hint = kind === "intro"
    ? "Plays once, the first time she opens the gift."
    : "Plays quietly behind the rose."

  return (
    <div style={{ marginTop: 12 }}>
      {/* Label above the control (never floating inside it) so the field is
          still identifiable while it's focused or filled. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon size={15} color="rgba(201,168,76,0.8)" />
        <span style={sectionLabel}>{label}</span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ivory-ghost)" }}>
        {hint}
      </p>

      <label
        htmlFor={inputId}
        className="dropzone"
        data-dragging={dragging}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); send(e.dataTransfer.files?.[0]) }}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 18px", borderRadius: 14,
          cursor: busy ? "default" : "pointer"
        }}
      >
        <input
          id={inputId} type="file" accept={accept} disabled={busy}
          onChange={(e) => send(e.target.files?.[0])}
          // Hidden from sight, not from assistive tech or the keyboard.
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />

        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid var(--border)", flexShrink: 0 }}>
          {busy ? <UploadIcon size={16} color="rgba(201,168,76,0.9)" />
                : current ? <CheckIcon size={16} color="#8fbf7a" />
                : <UploadIcon size={16} color="rgba(201,168,76,0.7)" />}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, color: "var(--ivory)" }}>
            {busy ? "Uploading…" : current ? "Your own file is set" : "Drop a file, or choose one"}
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ivory-ghost)", marginTop: 2 }}>
            {busy ? "Keep this page open" : current ? "Tap to replace it" : `Using the default ${kind === "intro" ? "video" : "song"}`}
          </span>
        </span>
      </label>

      {/* Indeterminate: the server action returns no percentage, so a moving
          sheen is honest where a progress bar would be inventing numbers. */}
      {busy && (
        <div style={{ position: "relative", overflow: "hidden", height: 2, borderRadius: 2, background: "var(--gold-dim)", marginTop: 8 }} className="sheen" />
      )}

      {current && !busy && (
        <button
          className="ctl"
          onClick={async () => { setBusy(true); try { await clearMediaAction(kind); onDone() } finally { setBusy(false) } }}
          style={{ ...smallBtn, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, color: "rgba(242,236,224,0.6)" }}
        >
          <TrashIcon size={13} />
          Remove, use the default
        </button>
      )}

      {/* Error below the control, where forms conventionally put it. */}
      {error && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#e58" }}>
          {error}
        </p>
      )}
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
  const [audioPath, setAudioPath] = useState<string | null>(null)
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
            audio_url: audioPath,
            trigger_visit: kind === "visit" && visit ? parseInt(visit, 10) : null,
            trigger_date: kind === "date" ? date || null : null,
            repeat_every: kind === "repeat" && repeat ? parseInt(repeat, 10) : null
          })
          setTitle(""); setMessage(""); setPhoto(""); setVideo("")
          setVisit(""); setDate(""); setRepeat(""); setAudioPath(null)
          onDone()
        } finally { setBusy(false) }
      }}
      style={formBox}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" style={input} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (optional)" rows={2} style={input} />
      <input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="Photo URL (optional)" style={input} />
      <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Video URL (optional)" style={input} />

      <VoiceRecorder value={audioPath} onChange={setAudioPath} />

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
      <h2 style={{ fontSize: 20, marginBottom: 12, color: "rgba(242,236,224,0.9)" }}>{title}</h2>
      {children}
    </div>
  )
}

function RowItem({ title, subtitle, onDelete }: { title: string; subtitle: string; onDelete: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(242,236,224,0.45)", marginTop: 4 }}>{subtitle}</div>
      </div>
      <button onClick={async () => { setBusy(true); await onDelete() }} disabled={busy} style={{ ...smallBtn, color: "#e58", flexShrink: 0 }}>
        {busy ? "…" : "Delete"}
      </button>
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) =>
  <p style={{ color: "rgba(242,236,224,0.35)", fontSize: 13 }}>{children}</p>

const card: React.CSSProperties = { border: "1px solid rgba(184,148,74,0.18)", borderRadius: 14, padding: 16, marginTop: 10, background: "rgba(255,255,255,0.02)" }
const formBox: React.CSSProperties = { ...card, display: "flex", flexDirection: "column", gap: 8 }
const sectionLabel: React.CSSProperties = { fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(232,200,130,0.7)", marginBottom: 8 }
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(184,148,74,0.25)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 14, outline: "none", resize: "vertical" }
const addBtn = (busy: boolean): React.CSSProperties => ({ alignSelf: "flex-start", padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "rgba(138,21,40,0.85)", color: "#f2ece0", fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1 })
const smallBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "rgba(255,255,255,0.05)", color: "#f2ece0", fontSize: 12, cursor: "pointer" }
const ghostBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(242,236,224,0.6)", fontSize: 12, cursor: "pointer" }
