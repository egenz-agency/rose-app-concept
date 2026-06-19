"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { TRANSITION_ITEM, EASE_CINEMATIC } from "@/lib/animation/easings"

const FINAL_LINES = [
  "Every rose that has ever lived",
  "has also fallen.",
  "",
  "But not before it was beautiful.",
  "Not before it was loved.",
  "",
  "You loved this one well.",
  "",
  "And that is the only thing",
  "that was ever asked of you.",
]

const PERSONAL_MESSAGE = `My love,

You visited every day you could. You cared when it was easy and when it wasn't. You came back even when the petals were falling.

That is who you are.

The rose is gone now. But this garden — everything you grew just by showing up — is yours forever.

Thank you for being the kind of person who tends to beautiful things.

I love you more than this rose ever could.

Always,
Your love`

export function FinalDeathScene() {
  const phase = useSceneStore((s) => s.phase)
  const [lineIndex, setLineIndex] = useState(0)
  const [showMessage, setShowMessage] = useState(false)

  const isVisible = phase === "FINAL_DEATH"

  useEffect(() => {
    if (!isVisible) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setLineIndex(i)
      if (i >= FINAL_LINES.length) {
        clearInterval(interval)
        setTimeout(() => setShowMessage(true), 1500)
      }
    }, 900)
    return () => clearInterval(interval)
  }, [isVisible])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: EASE_CINEMATIC }}
          style={{
            background: "radial-gradient(ellipse at center, #0d0508 0%, #050103 100%)",
          }}
        >
          {!showMessage ? (
            <motion.div className="flex flex-col items-center gap-4 text-center max-w-sm">
              {FINAL_LINES.slice(0, lineIndex).map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: line === "" ? 0 : 1, y: 0 }}
                  transition={{ ...TRANSITION_ITEM, delay: 0 }}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: i < 2 ? "28px" : "20px",
                    color: i < 2 ? "#f5f0e8" : "rgba(245,240,232,0.6)",
                    fontStyle: i >= 3 ? "italic" : "normal",
                    lineHeight: 1.4,
                    minHeight: line === "" ? "1rem" : "auto",
                  }}
                >
                  {line}
                </motion.p>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="w-full max-w-md"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: EASE_CINEMATIC }}
            >
              {/* Letter card */}
              <div
                className="p-[1px] rounded-[2rem]"
                style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.5), rgba(139,0,0,0.2))" }}
              >
                <div
                  className="rounded-[calc(2rem-1px)] px-10 py-12 flex flex-col gap-8"
                  style={{
                    background: "rgba(8, 2, 4, 0.95)",
                    backdropFilter: "blur(40px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.8)",
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <p
                      className="text-[9px] uppercase tracking-[0.3em]"
                      style={{ color: "rgba(201,168,76,0.5)" }}
                    >
                      A final letter
                    </p>
                    <div
                      className="h-px w-12"
                      style={{ background: "linear-gradient(to right, rgba(201,168,76,0.4), transparent)" }}
                    />
                  </div>

                  <p
                    className="whitespace-pre-line text-base font-light leading-loose"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "rgba(245,240,232,0.85)",
                      fontSize: "16px",
                    }}
                  >
                    {PERSONAL_MESSAGE}
                  </p>

                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                  >
                    <span style={{ color: "#c9a84c", fontSize: "24px" }}>✦</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
