"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { useSceneStore } from "@/lib/store/sceneStore"
import { respondToInvitation } from "@/lib/supabase/queries"
import { Envelope, Flap } from "./MomentPanel"

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
                style={{ position: "relative", background: "linear-gradient(168deg, #f6eeda 0%, #efe3c8 100%)", borderRadius: 14, padding: "30px 26px 26px", boxShadow: "0 30px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.6)", overflowY: "auto", maxHeight: "82dvh" }}
              >
                <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(120,30,45,0.55)", marginBottom: 14 }}>
                  {invitation.title || "An invitation"}
                </p>

                {invitation.message && (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, lineHeight: 1.55, color: "#3a2418", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                    {invitation.message}
                  </p>
                )}

                {(when || invitation.location) && (
                  <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 10, background: "rgba(120,30,45,0.07)", border: "1px solid rgba(120,30,45,0.15)" }}>
                    {when && <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#6e1228" }}>🗓 {when}</p>}
                    {invitation.location && <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#7a3a28", marginTop: 4 }}>📍 {invitation.location}</p>}
                  </div>
                )}

                {/* RSVP */}
                <div style={{ marginTop: 22 }}>
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
