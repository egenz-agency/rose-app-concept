"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { useSceneStore } from "@/lib/store/sceneStore"
import { respondToInvitation } from "@/lib/supabase/queries"
import { Envelope, Flap } from "./MomentPanel"
import { LetterPaper, RoseCrest, LetterDivider } from "./LetterPaper"

const INK = "#6e1228"
function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="12" height="11" rx="2" stroke={INK} strokeWidth="1.1" />
      <path d="M2 6.5h12M5.5 2v2M10.5 2v2" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8Z" stroke="#7a3a28" strokeWidth="1.1" />
      <circle cx="8" cy="6" r="1.7" stroke="#7a3a28" strokeWidth="1.1" />
    </svg>
  )
}

// An interactive date invitation, revealed in the envelope. She can accept the
// proposed time, or propose another — her answer is written back for the owner.
function formatWhen(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function InvitationPanel() {
  const invitation = useSceneStore((s) => s.activeInvitation)
  const setInvitation = useSceneStore((s) => s.setActiveInvitation)
  const queryClient = useQueryClient()

  const [opened, setOpened] = useState(false)
  const [mode, setMode] = useState<"idle" | "propose" | "done">("idle")
  const [altTime, setAltTime] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [doneMsg, setDoneMsg] = useState("")

  useEffect(() => {
    if (!invitation) return
    setOpened(false); setMode("idle"); setAltTime(""); setNote(""); setDoneMsg("")
  }, [invitation])

  const close = () => setInvitation(null)

  async function accept() {
    if (!invitation) return
    setBusy(true)
    try {
      await respondToInvitation(invitation.id, { accepted: true, responseTime: invitation.proposed_for })
      queryClient.invalidateQueries({ queryKey: ["date-invitations"] })
      setDoneMsg("Yes — I'll be there 💛"); setMode("done")
    } finally { setBusy(false) }
  }

  async function sendProposal() {
    if (!invitation || !altTime) return
    setBusy(true)
    try {
      await respondToInvitation(invitation.id, { accepted: false, responseTime: new Date(altTime).toISOString(), note })
      queryClient.invalidateQueries({ queryKey: ["date-invitations"] })
      setDoneMsg("Sent — I proposed another time 💛"); setMode("done")
    } finally { setBusy(false) }
  }

  const when = formatWhen(invitation?.proposed_for ?? null)

  return (
    <AnimatePresence>
      {invitation && (
        <motion.div
          className="fixed inset-0 z-[72] flex items-center justify-center px-5"
          style={{ background: "rgba(8,1,6,0.92)", backdropFilter: "blur(10px)", perspective: 1200 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={(e) => { if (e.target === e.currentTarget && opened && mode === "done") close() }}
        >
          {!opened ? (
            <motion.button
              onClick={() => setOpened(true)}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}
            >
              <Envelope sealed />
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,200,130,0.8)" }}>
                An invitation — tap to open
              </span>
            </motion.button>
          ) : (
            <motion.div
              className="w-full" style={{ maxWidth: 440, maxHeight: "88dvh" }}
              initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: -14 }}
                initial={{ rotateX: 0, opacity: 1 }} animate={{ rotateX: -165, opacity: 0 }} transition={{ duration: 0.5, ease: "easeIn" }}
              >
                <Flap />
              </motion.div>

              <motion.div
                initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <LetterPaper maxHeight="82dvh">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, marginBottom: 16 }}>
                  <RoseCrest />
                  <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(120,30,45,0.6)" }}>
                    {invitation.title || "An invitation"}
                  </p>
                </div>

                {invitation.message && (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, lineHeight: 1.55, color: "#3a2418", fontStyle: "italic", whiteSpace: "pre-wrap", textAlign: "center" }}>
                    {invitation.message}
                  </p>
                )}

                {(when || invitation.location) && (
                  <div style={{ marginTop: 18, padding: "13px 15px", borderRadius: 10, background: "rgba(120,30,45,0.06)", border: "1px solid rgba(120,30,45,0.14)", display: "flex", flexDirection: "column", gap: 7 }}>
                    {when && <p style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#6e1228" }}><CalIcon /> {when}</p>}
                    {invitation.location && <p style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#7a3a28" }}><PinIcon /> {invitation.location}</p>}
                  </div>
                )}

                <div style={{ marginTop: 20 }}><LetterDivider /></div>

                {/* RSVP */}
                <div style={{ marginTop: 14 }}>
                  {mode === "done" ? (
                    <>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 19, color: "#6e1228", textAlign: "center", marginBottom: 16 }}>
                        {doneMsg}
                      </p>
                      <button onClick={close} style={primaryBtn}>Close</button>
                    </>
                  ) : mode === "propose" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={fieldLabel}>Suggest a time that works for you</label>
                      <input type="datetime-local" value={altTime} onChange={(e) => setAltTime(e.target.value)} style={field} />
                      <input type="text" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={field} />
                      <button onClick={sendProposal} disabled={busy || !altTime} style={{ ...primaryBtn, opacity: busy || !altTime ? 0.5 : 1 }}>
                        {busy ? "Sending…" : "Send my suggestion"}
                      </button>
                      <button onClick={() => setMode("idle")} style={linkBtn}>← back</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={accept} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
                        {busy ? "…" : when ? "Yes — I'll be there 💛" : "Yes, I'd love to 💛"}
                      </button>
                      <button onClick={() => setMode("propose")} style={secondaryBtn}>I'd like to propose another time</button>
                    </div>
                  )}
                </div>
                </LetterPaper>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const primaryBtn: React.CSSProperties = { width: "100%", padding: "12px", borderRadius: 999, background: "linear-gradient(135deg, #8a1528, #640c1c)", border: "1px solid rgba(184,148,74,0.4)", color: "#f6eeda", fontFamily: "'EB Garamond', serif", fontSize: 15, letterSpacing: "0.04em", cursor: "pointer" }
const secondaryBtn: React.CSSProperties = { width: "100%", padding: "11px", borderRadius: 999, background: "transparent", border: "1px solid rgba(120,30,45,0.3)", color: "#6e1228", fontFamily: "'EB Garamond', serif", fontSize: 14, cursor: "pointer" }
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "rgba(120,30,45,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "'EB Garamond', serif" }
const field: React.CSSProperties = { padding: "11px 13px", borderRadius: 9, border: "1px solid rgba(120,30,45,0.25)", background: "rgba(255,255,255,0.6)", color: "#3a2418", fontSize: 14, fontFamily: "'EB Garamond', serif", outline: "none" }
const fieldLabel: React.CSSProperties = { fontFamily: "'EB Garamond', serif", fontSize: 12, color: "rgba(120,30,45,0.7)" }
