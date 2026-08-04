"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { RoseIcon, LetterIcon, StarIcon, SparkleIcon } from "./Icons"

const NAV_ITEMS = [
  { id: "care",         label: "Tend Rose",  Icon: RoseIcon,   phase: "CARING" as const },
  { id: "letters",     label: "Letters",    Icon: LetterIcon, panel: "letters" },
  { id: "memory-stars",label: "Stars",      Icon: StarIcon,   panel: "memory-stars" },
  // The way up to the constellation. It lives here rather than floating at the
  // bottom of the screen, where a real gift already stacks the "I miss you"
  // button and its hint — and where it stayed hidden behind the emergence.
  { id: "universe",     label: "Universe",   Icon: SparkleIcon, ascend: true },
]

export function NavigationHUD() {
  const phase = useSceneStore((s) => s.phase)
  const setPhase = useSceneStore((s) => s.setPhase)
  const openPanel = useSceneStore((s) => s.openPanel)
  const closePanel = useSceneStore((s) => s.closePanel)
  const activePanelId = useSceneStore((s) => s.activePanelId)
  const universeMode = useSceneStore((s) => s.universeMode)
  const setUniverseMode = useSceneStore((s) => s.setUniverseMode)
  const isEmergence = useSceneStore((s) => s.isEmergence)
  const magicActive = useSceneStore((s) => s.magicActive)

  // The flight up can't start while a cinematic already owns the camera.
  const cameraIsBusy = isEmergence || magicActive

  const isVisible =
    ["IDLE","CARING","VIEWING_STAR","VIEWING_LETTER"].includes(phase) &&
    // The nav belongs to the rose; the sky has its own, quieter controls.
    universeMode === "rose"

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
              const disabled = Boolean(item.ascend) && cameraIsBusy

              return (
                <motion.button
                  key={item.id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return
                    if (item.phase) { closePanel(); setPhase(item.phase) }
                    if (item.panel) { setPhase("IDLE"); openPanel(item.panel) }
                    if (item.ascend) { closePanel(); setUniverseMode("ascending") }
                  }}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: isActive ? "rgba(138, 21, 40, 0.45)" : "transparent",
                    border: isActive ? "1px solid rgba(184, 148, 74, 0.22)" : "1px solid transparent",
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? "default" : "pointer",
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
