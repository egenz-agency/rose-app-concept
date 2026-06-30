"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { RoseIcon, LetterIcon, StarIcon, ScrollIcon } from "./Icons"

const NAV_ITEMS = [
  { id: "care",         label: "Tend Rose",  Icon: RoseIcon,   phase: "CARING" as const },
  { id: "letters",     label: "Letters",    Icon: LetterIcon, panel: "letters" },
  { id: "memory-stars",label: "Stars",      Icon: StarIcon,   panel: "memory-stars" },
  { id: "guide",       label: "Guide",      Icon: ScrollIcon, panel: "guide" },
]

export function NavigationHUD() {
  const phase = useSceneStore((s) => s.phase)
  const setPhase = useSceneStore((s) => s.setPhase)
  const openPanel = useSceneStore((s) => s.openPanel)
  const closePanel = useSceneStore((s) => s.closePanel)
  const activePanelId = useSceneStore((s) => s.activePanelId)

  const isVisible = ["IDLE","CARING","VIEWING_STAR","VIEWING_LETTER"].includes(phase)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className="fixed top-7 left-1/2 z-30"
          style={{ transform: "translateX(-50%)" }}
          initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="flex items-center gap-px px-1.5 py-1.5 rounded-full"
            style={{
              background: "rgba(8, 1, 6, 0.72)",
              border: "1px solid rgba(184, 148, 74, 0.18)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,248,240,0.06), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                (item.phase && phase === item.phase) ||
                (item.panel && activePanelId === item.panel)

              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    if (item.phase) { closePanel(); setPhase(item.phase) }
                    if (item.panel) { setPhase("IDLE"); openPanel(item.panel) }
                  }}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: isActive ? "rgba(138, 21, 40, 0.45)" : "transparent",
                    border: isActive ? "1px solid rgba(184, 148, 74, 0.22)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <item.Icon
                    size={13}
                    color={isActive ? "rgba(242,236,224,0.9)" : "rgba(242,236,224,0.38)"}
                  />
                  <span
                    className="t-label"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.18em",
                      color: isActive ? "rgba(242,236,224,0.85)" : "rgba(242,236,224,0.38)",
                      transition: "color 0.4s ease",
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Active underline dot */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute bottom-0.5 left-1/2 w-1 h-1 rounded-full"
                      style={{
                        x: "-50%",
                        background: "var(--gold)",
                        boxShadow: "0 0 6px rgba(184,148,74,0.8)",
                      }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
