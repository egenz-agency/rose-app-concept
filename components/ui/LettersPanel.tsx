"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { fetchScheduledMessages, type ScheduledMessage } from "@/lib/supabase/queries"
import { useSceneStore } from "@/lib/store/sceneStore"
import { TRANSITION_PANEL, TRANSITION_STAGGER, TRANSITION_ITEM } from "@/lib/animation/easings"

// Letters = the scheduled messages the owner wrote. Delivered ones are kept here
// to be re-read; upcoming ones are locked and show how many days until they open.
function localToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return 0
  return differenceInCalendarDays(parseISO(dateStr), localToday())
}

function isReadable(m: ScheduledMessage): boolean {
  if (m.shown) return true
  const d = daysUntil(m.scheduled_for)
  return d === null || d <= 0
}

function unlockLabel(m: ScheduledMessage): string {
  const d = daysUntil(m.scheduled_for)
  if (d === null || d <= 0) return ""
  if (d === 1) return "Unlocks tomorrow"
  return `Unlocks in ${d} days`
}

export function LettersPanel() {
  const activePanelId = useSceneStore((s) => s.activePanelId)
  const closePanel = useSceneStore((s) => s.closePanel)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isVisible = activePanelId === "letters"

  const { data: messages = [] } = useQuery({
    queryKey: ["scheduled-letters"],
    queryFn: fetchScheduledMessages,
    enabled: isVisible,
  })

  const delivered = messages
    .filter(isReadable)
    .sort((a, b) => (b.scheduled_for ?? b.created_at).localeCompare(a.scheduled_for ?? a.created_at))
  const upcoming = messages
    .filter((m) => !isReadable(m))
    .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""))

  const selected = messages.find((m) => m.id === selectedId)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8"
          style={{ background: "rgba(5, 0, 2, 0.9)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}
        >
          <motion.div
            className="w-full max-w-lg max-h-full overflow-auto"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={TRANSITION_PANEL}
          >
            <div className="p-[1px] rounded-[2rem]" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(139,0,0,0.15))" }}>
              <div className="rounded-[calc(2rem-1px)] px-7 py-7 flex flex-col gap-5" style={{ background: "rgba(10, 2, 5, 0.95)", backdropFilter: "blur(32px)" }}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(201,168,76,0.6)" }}>
                      {selected ? "A letter" : "Letters"}
                    </p>
                    <h2 className="text-2xl font-light mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8" }}>
                      {selected ? `From ${selected.author ?? "your love"}` : "Letters for you"}
                    </h2>
                  </div>
                  <button
                    onClick={selected ? () => setSelectedId(null) : closePanel}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", color: "rgba(245,240,232,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {selected ? "←" : "✕"}
                  </button>
                </div>

                {selected ? (
                  // ── Reading view (cream letter) ──────────────────────────
                  <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={TRANSITION_ITEM}>
                    <div style={{ background: "linear-gradient(168deg, #f6eeda, #efe3c8)", borderRadius: 12, padding: "26px 24px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }}>
                      {selected.scheduled_for && (
                        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(120,30,45,0.5)", marginBottom: 14 }}>
                          {selected.scheduled_for}
                        </p>
                      )}
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 20, lineHeight: 1.6, color: "#3a2418", whiteSpace: "pre-wrap" }}>
                        {selected.message}
                      </p>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#6e1228", textAlign: "right", marginTop: 20 }}>
                        — {selected.author ?? "Your love"}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  // ── List view ────────────────────────────────────────────
                  <motion.div className="flex flex-col gap-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: TRANSITION_STAGGER } }}>
                    {messages.length === 0 && (
                      <p style={{ color: "rgba(245,240,232,0.35)", fontStyle: "italic", fontSize: 14 }}>No letters yet.</p>
                    )}

                    {delivered.map((m) => (
                      <motion.button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className="text-left rounded-2xl px-5 py-4"
                        style={{ background: "rgba(139,0,0,0.1)", border: "1px solid rgba(201,168,76,0.2)", cursor: "pointer" }}
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: TRANSITION_ITEM } }}
                        whileHover={{ scale: 1.01, background: "rgba(139,0,0,0.15)" }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span style={{ fontSize: 18 }}>✉️</span>
                            <div className="min-w-0">
                              <p className="truncate" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", fontSize: 16 }}>
                                {m.message}
                              </p>
                              <p style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", marginTop: 2 }}>
                                {m.author ?? "Your love"}{m.scheduled_for ? ` · ${m.scheduled_for}` : ""}
                              </p>
                            </div>
                          </div>
                          <span style={{ color: "rgba(201,168,76,0.6)", fontSize: 12 }}>→</span>
                        </div>
                      </motion.button>
                    ))}

                    {upcoming.map((m) => (
                      <motion.div
                        key={m.id}
                        className="rounded-2xl px-5 py-4"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: TRANSITION_ITEM } }}
                      >
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: 18, filter: "grayscale(1) opacity(0.5)" }}>🔒</span>
                          <div>
                            <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,240,232,0.45)", fontSize: 16 }}>
                              A sealed letter
                            </p>
                            <p style={{ fontSize: 11, color: "rgba(201,168,76,0.65)", marginTop: 2 }}>
                              {unlockLabel(m)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
