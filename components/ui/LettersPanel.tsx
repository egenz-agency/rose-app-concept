"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { fetchLetters } from "@/lib/data/roseApi"
import { useSceneStore } from "@/lib/store/sceneStore"
import { TRANSITION_PANEL, TRANSITION_STAGGER, TRANSITION_ITEM } from "@/lib/animation/easings"

export function LettersPanel() {
  const activePanelId = useSceneStore((s) => s.activePanelId)
  const closePanel = useSceneStore((s) => s.closePanel)
  const rose = useSceneStore((s) => s.rose)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isVisible = activePanelId === "letters"

  const { data: letters = [] } = useQuery({
    queryKey: ["letters"],
    queryFn: fetchLetters,
    enabled: isVisible,
  })

  const selectedLetter = letters.find((l) => l.id === selectedId)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8"
          style={{ background: "rgba(5, 0, 2, 0.88)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}
        >
          <motion.div
            className="w-full max-w-lg max-h-full overflow-auto"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={TRANSITION_PANEL}
          >
            <div
              className="p-[1px] rounded-[2rem]"
              style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(139,0,0,0.15))" }}
            >
              <div
                className="rounded-[calc(2rem-1px)] px-8 py-8 flex flex-col gap-6"
                style={{ background: "rgba(10, 2, 5, 0.94)", backdropFilter: "blur(32px)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(201,168,76,0.6)" }}>
                      Unlockable letters
                    </p>
                    <h2
                      className="text-2xl font-light mt-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8" }}
                    >
                      {selectedLetter ? selectedLetter.title : "Letters for you"}
                    </h2>
                  </div>
                  <button
                    onClick={selectedLetter ? () => setSelectedId(null) : closePanel}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", color: "rgba(245,240,232,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {selectedLetter ? "←" : "✕"}
                  </button>
                </div>

                {!selectedLetter ? (
                  <motion.div
                    className="flex flex-col gap-3"
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: TRANSITION_STAGGER } }}
                  >
                    {letters.map((letter) => {
                      const totalDays = rose?.totalVisits ?? 0
                      const isUnlocked = letter.unlocked || totalDays >= letter.unlock_days
                      const daysLeft = Math.max(0, letter.unlock_days - totalDays)

                      return (
                        <motion.button
                          key={letter.id}
                          onClick={() => isUnlocked && setSelectedId(letter.id)}
                          className="text-left rounded-2xl px-5 py-5 transition-all duration-300"
                          style={{
                            background: isUnlocked ? "rgba(139,0,0,0.1)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isUnlocked ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)"}`,
                            cursor: isUnlocked ? "pointer" : "not-allowed",
                          }}
                          variants={{
                            hidden: { opacity: 0, y: 12 },
                            show: { opacity: 1, y: 0, transition: TRANSITION_ITEM },
                          }}
                          whileHover={isUnlocked ? { scale: 1.01, background: "rgba(139,0,0,0.15)" } : {}}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span style={{ fontSize: "20px", filter: isUnlocked ? "none" : "grayscale(1) opacity(0.4)" }}>
                                {isUnlocked ? "📜" : "🔒"}
                              </span>
                              <div>
                                <p
                                  className="text-base font-light"
                                  style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    color: isUnlocked ? "#f5f0e8" : "rgba(245,240,232,0.3)",
                                  }}
                                >
                                  {letter.title}
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.3)" }}>
                                  {isUnlocked
                                    ? "Unlocked — tap to read"
                                    : `Unlocks in ${daysLeft} more visit${daysLeft !== 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                            {isUnlocked && (
                              <span style={{ color: "rgba(201,168,76,0.6)", fontSize: "12px" }}>→</span>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={TRANSITION_ITEM}
                  >
                    <div
                      className="rounded-2xl px-6 py-6"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.1)" }}
                    >
                      <p
                        className="whitespace-pre-line text-base font-light leading-loose"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: "rgba(245,240,232,0.85)",
                          fontSize: "16px",
                        }}
                      >
                        {selectedLetter.content}
                      </p>
                    </div>
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
