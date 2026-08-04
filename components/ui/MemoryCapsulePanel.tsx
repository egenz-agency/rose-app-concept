"use client"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createMemoryStar } from "@/lib/data/roseApi"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "@/lib/constellation/useConstellation"
import type { StarRow } from "@/lib/supabase/starColumns"
import {
  CloseIcon, StarIcon, HeartIcon, MusicIcon, FilmIcon, MicIcon, LockIcon, ScrollIcon,
} from "./Icons"

// `capsule-field` carries the focus ring (globals.css). Inline styles can't
// express :focus, and an input with `outline: none` and no replacement is
// invisible to keyboard users.
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(184,148,74,0.15)",
  color: "#f2ece0",
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: "15px",
  borderRadius: "12px",
  padding: "12px 15px",
  outline: "none",
  width: "100%",
  lineHeight: 1.5,
  // The native date picker renders its calendar glyph light-on-light without this.
  colorScheme: "dark",
}

const labelStyle: React.CSSProperties = { fontSize: "8.5px", letterSpacing: "0.22em" }

interface FormState {
  title: string
  date: string
  memory: string
  quote: string
  location: string
  songUrl: string
  videoUrl: string
  voiceUrl: string
  isFavorite: boolean
  isAnniversary: boolean
}

const EMPTY_FORM: FormState = {
  title: "", date: "", memory: "", quote: "", location: "",
  songUrl: "", videoUrl: "", voiceUrl: "", isFavorite: false, isAnniversary: false,
}

/**
 * One star, opened.
 *
 * A star that is still asleep says so gently. A woken, empty one invites a
 * memory into it. A filled one is a capsule — everything that was put inside,
 * kept exactly as it was written.
 */
export function MemoryCapsulePanel() {
  const activeSlot = useSceneStore((s) => s.activeSlot)
  const setActiveSlot = useSceneStore((s) => s.setActiveSlot)
  const view = useConstellation()

  const isOpen = activeSlot !== null
  const memory: StarRow | undefined = activeSlot !== null ? view.memories.get(activeSlot) : undefined
  const isUnlocked = activeSlot !== null && view.unlockedSlots.includes(activeSlot)

  // Where this star sits in the story — "the 12th star to wake".
  const wakeNumber = useMemo(() => {
    if (activeSlot === null) return 0
    return view.constellation.unlockOrder.indexOf(activeSlot) + 1
  }, [activeSlot, view.constellation])

  const close = () => setActiveSlot(null)

  const heading = memory
    ? memory.title
    : isUnlocked
      ? "An empty star"
      : "Still sleeping"

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
          style={{ background: "rgba(4,0,3,0.72)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <motion.div
            className="w-full max-w-[420px] max-h-[86dvh] flex flex-col"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="glass-bezel rounded-[24px] flex flex-col overflow-hidden">
              <div className="glass-bezel-inner rounded-[23px] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 shrink-0">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.26em" }}>
                      {view.title} · star {wakeNumber}
                    </span>
                    <h2 className="t-display" style={{ fontSize: "22px", fontStyle: "italic" }}>
                      {heading}
                    </h2>
                  </div>
                  <motion.button
                    onClick={close}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      marginTop: "1px",
                    }}
                    whileHover={{
                      background: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(184,148,74,0.3)",
                    }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  >
                    <CloseIcon size={13} color="rgba(242,236,224,0.5)" />
                  </motion.button>
                </div>

                <div
                  style={{
                    height: "1px",
                    background:
                      "linear-gradient(to right, transparent, rgba(184,148,74,0.12), transparent)",
                    flexShrink: 0,
                  }}
                />

                <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">

                  {/* ── A star that hasn't woken yet ── */}
                  {!memory && !isUnlocked && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <LockIcon size={20} color="rgba(184,148,74,0.28)" />
                      <p
                        className="t-serif"
                        style={{
                          fontSize: "14px",
                          fontStyle: "italic",
                          color: "rgba(242,236,224,0.4)",
                          maxWidth: "260px",
                          lineHeight: 1.8,
                        }}
                      >
                        This one is still asleep. Keep caring for the rose and it will
                        wake in its own time.
                      </p>
                    </div>
                  )}

                  {/* ── A filled capsule ── */}
                  {memory && <CapsuleView memory={memory} />}

                  {/* ── An empty, woken star ── */}
                  {/* Keyed by slot so moving to another star always opens a
                      genuinely blank page, with no state carried across. */}
                  {!memory && isUnlocked && activeSlot !== null && (
                    <CapsuleComposer
                      key={activeSlot}
                      slot={activeSlot}
                      chapterIndex={view.chapterIndex}
                      onSaved={close}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Writing a memory into an empty star ──────────────────────────────────────

/**
 * The composer for one specific star. It owns its own draft, and the panel
 * mounts it under a `key` of the slot — so opening a different star always
 * starts from a clean page instead of inheriting the last one's half-written
 * thoughts.
 */
function CapsuleComposer({
  slot,
  chapterIndex,
  onSaved,
}: {
  slot: number
  chapterIndex: number
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    date: new Date().toISOString().slice(0, 10),
  }))
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      createMemoryStar({
        title: form.title.trim(),
        date: form.date,
        memory: form.memory.trim(),
        photos: [],
        // Kept for the older orbiting star field, which still reads a position.
        position: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6],
        constellationIndex: chapterIndex,
        slotIndex: slot,
        quote: form.quote.trim() || null,
        location: form.location.trim() || null,
        songUrl: form.songUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        voiceUrl: form.voiceUrl.trim() || null,
        isFavorite: form.isFavorite,
        isAnniversary: form.isAnniversary,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-stars"] })
      setSaved(true)
      setError(null)
      // Let her watch the star catch light before the panel steps away.
      window.setTimeout(onSaved, 1500)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not save. Try again.")
    },
  })

  const canSubmit =
    form.title.trim().length > 0 &&
    form.date.length > 0 &&
    form.memory.trim().length > 0 &&
    !mutation.isPending &&
    !saved

  return (
    <>
      <Field label="What happened">
        <input
          className="capsule-field"
          style={inputStyle}
          placeholder="The night it rained and we stayed anyway"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          maxLength={110}
        />
      </Field>

      <Field label="When">
        <input
          type="date"
          className="capsule-field"
          style={inputStyle}
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
      </Field>

      <Field label="The memory">
        <textarea
          className="capsule-field"
          style={{ ...inputStyle, minHeight: "116px", resize: "none" }}
          placeholder="Write it the way you remember it…"
          value={form.memory}
          onChange={(e) => setForm((f) => ({ ...f, memory: e.target.value }))}
          maxLength={2000}
        />
      </Field>

      {/* Everything else is optional and stays folded away until asked for.
          Sits on its own hairline so it reads as a seam in the form rather than
          another field, and carries a real tap target. */}
      <motion.button
        onClick={() => setShowMore((v) => !v)}
        className="t-label self-start -mx-2 rounded-full px-3 py-2"
        style={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          cursor: "pointer",
          background: "none",
          border: "none",
          color: "rgba(184,148,74,0.72)",
        }}
        whileHover={{ color: "rgba(201,168,76,0.95)" }}
        whileTap={{ scale: 0.98 }}
      >
        {showMore ? "— Fewer details" : "+ A song, a place, a voice"}
      </motion.button>

      <AnimatePresence>
        {showMore && (
          <motion.div
            className="flex flex-col gap-4 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Field label="A quote from that day">
              <input
                className="capsule-field"
                style={inputStyle}
                placeholder="Something one of you said"
                value={form.quote}
                onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
                maxLength={500}
              />
            </Field>
            <Field label="Where">
              <input
                className="capsule-field"
                style={inputStyle}
                placeholder="The bench by the river"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                maxLength={200}
              />
            </Field>
            <Field label="Your song (link)">
              <input
                className="capsule-field"
                style={inputStyle}
                placeholder="https://…"
                value={form.songUrl}
                onChange={(e) => setForm((f) => ({ ...f, songUrl: e.target.value }))}
              />
            </Field>
            <Field label="A video (link)">
              <input
                className="capsule-field"
                style={inputStyle}
                placeholder="https://…"
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              />
            </Field>
            <Field label="A voice message (link)">
              <input
                className="capsule-field"
                style={inputStyle}
                placeholder="https://…"
                value={form.voiceUrl}
                onChange={(e) => setForm((f) => ({ ...f, voiceUrl: e.target.value }))}
              />
            </Field>

            <div className="flex gap-2">
              <Toggle
                active={form.isFavorite}
                onClick={() => setForm((f) => ({ ...f, isFavorite: !f.isFavorite }))}
                label="Favourite"
              />
              <Toggle
                active={form.isAnniversary}
                onClick={() => setForm((f) => ({ ...f, isAnniversary: !f.isAnniversary }))}
                label="Anniversary"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="t-serif"
            style={{ fontSize: "13px", color: "rgba(220,80,80,0.85)", fontStyle: "italic" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* The one action stays within reach however long the form gets. The
          negative offsets cancel the scroll body's own padding so the scrim
          bleeds to the panel edges and content passes cleanly underneath. */}
      <div
        className="sticky -bottom-6 -mx-8 -mb-6 px-8 pt-5 pb-6"
        style={{
          background:
            "linear-gradient(to top, rgba(10,2,5,0.97) 58%, rgba(10,2,5,0.82) 82%, rgba(10,2,5,0))",
        }}
      >
        <motion.button
          onClick={() => { setError(null); mutation.mutate() }}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 flex items-center justify-center relative overflow-hidden"
          style={{
            background: saved
              ? "rgba(60,120,60,0.5)"
              : canSubmit
                ? "linear-gradient(135deg, rgba(138,21,40,0.88), rgba(90,8,20,0.95))"
                : "rgba(255,255,255,0.04)",
            border: `1px solid ${saved ? "rgba(100,180,100,0.4)" : "rgba(184,148,74,0.24)"}`,
            boxShadow: canSubmit
              ? "inset 0 1px 0 rgba(255,248,240,0.09), 0 10px 26px -12px rgba(90,8,20,0.9)"
              : "inset 0 1px 0 rgba(255,248,240,0.04)",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
          }}
          whileHover={canSubmit ? { y: -1 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <span
            className="t-serif"
            style={{
              fontSize: "15px",
              color: canSubmit || saved ? "rgba(242,236,224,0.9)" : "rgba(242,236,224,0.34)",
              letterSpacing: "0.04em",
            }}
          >
            {saved
              ? "The star is lit"
              : mutation.isPending
                ? "Lighting the star…"
                : "Keep this memory here"}
          </span>
        </motion.button>
      </div>
    </>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="t-label" style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({
  active, onClick, label,
}: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-full py-2.5 flex items-center justify-center gap-2"
      style={{
        background: active ? "rgba(184,148,74,0.16)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(184,148,74,0.4)" : "rgba(255,255,255,0.06)"}`,
        cursor: "pointer",
        transition: "all 0.3s ease",
      }}
    >
      <HeartIcon size={11} color={active ? "rgba(201,168,76,0.9)" : "rgba(242,236,224,0.25)"} />
      <span
        className="t-label"
        style={{
          fontSize: "8.5px",
          letterSpacing: "0.18em",
          color: active ? "rgba(242,236,224,0.8)" : "rgba(242,236,224,0.3)",
        }}
      >
        {label}
      </span>
    </button>
  )
}

/** A memory, read back. Only the parts that were actually filled in show up. */
function CapsuleView({ memory }: { memory: StarRow }) {
  const date = new Date(memory.date)
  const dateLabel = isNaN(date.getTime())
    ? memory.date
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <StarIcon size={11} color="rgba(184,148,74,0.65)" />
        <span className="t-serif" style={{ fontSize: "13px", color: "rgba(184,148,74,0.75)" }}>
          {dateLabel}
        </span>
        {memory.is_favorite && <Chip label="Favourite" />}
        {memory.is_anniversary && <Chip label="Anniversary" tone="rose" />}
      </div>

      <p
        className="t-serif"
        style={{
          fontSize: "15px",
          lineHeight: 1.8,
          fontStyle: "italic",
          color: "rgba(242,236,224,0.82)",
          whiteSpace: "pre-wrap",
        }}
      >
        {memory.memory}
      </p>

      {memory.quote && (
        <blockquote
          className="t-serif"
          style={{
            fontSize: "14px",
            lineHeight: 1.75,
            fontStyle: "italic",
            color: "rgba(242,236,224,0.6)",
            borderLeft: "1px solid rgba(184,148,74,0.3)",
            paddingLeft: "14px",
          }}
        >
          “{memory.quote}”
        </blockquote>
      )}

      {memory.location && (
        <Detail icon={<ScrollIcon size={12} color="rgba(184,148,74,0.55)" />} text={memory.location} />
      )}

      {memory.photos?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {memory.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              style={{
                width: "88px",
                height: "88px",
                objectFit: "cover",
                borderRadius: "12px",
                border: "1px solid rgba(184,148,74,0.16)",
              }}
            />
          ))}
        </div>
      )}

      {memory.voice_url && (
        <MediaRow icon={<MicIcon size={12} color="rgba(184,148,74,0.55)" />} label="Voice message">
          <audio controls src={memory.voice_url} style={{ width: "100%", height: "34px" }} />
        </MediaRow>
      )}

      {memory.song_url && (
        <MediaRow icon={<MusicIcon size={12} color="rgba(184,148,74,0.55)" />} label="Our song">
          <a
            href={memory.song_url}
            target="_blank"
            rel="noopener noreferrer"
            className="t-serif"
            style={{ fontSize: "13px", color: "rgba(201,168,76,0.8)", wordBreak: "break-all" }}
          >
            {memory.song_url}
          </a>
        </MediaRow>
      )}

      {memory.video_url && (
        <MediaRow icon={<FilmIcon size={12} color="rgba(184,148,74,0.55)" />} label="A video">
          <a
            href={memory.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="t-serif"
            style={{ fontSize: "13px", color: "rgba(201,168,76,0.8)", wordBreak: "break-all" }}
          >
            {memory.video_url}
          </a>
        </MediaRow>
      )}
    </motion.div>
  )
}

function Chip({ label, tone = "gold" }: { label: string; tone?: "gold" | "rose" }) {
  const rose = tone === "rose"
  return (
    <span
      className="t-label"
      style={{
        fontSize: "8px",
        letterSpacing: "0.18em",
        padding: "3px 9px",
        borderRadius: "999px",
        color: rose ? "rgba(255,168,200,0.85)" : "rgba(201,168,76,0.85)",
        background: rose ? "rgba(255,168,200,0.08)" : "rgba(201,168,76,0.08)",
        border: `1px solid ${rose ? "rgba(255,168,200,0.22)" : "rgba(201,168,76,0.22)"}`,
        opacity: 1,
      }}
    >
      {label}
    </span>
  )
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="t-serif" style={{ fontSize: "13px", color: "rgba(242,236,224,0.55)" }}>
        {text}
      </span>
    </div>
  )
}

function MediaRow({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="t-label" style={labelStyle}>{label}</span>
      </div>
      {children}
    </div>
  )
}
