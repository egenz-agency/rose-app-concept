"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "@/lib/constellation/useConstellation"
import {
  canRecord,
  captureImage,
  deliver,
  extensionFor,
  recordClip,
} from "@/lib/constellation/captureSky"
import { UploadIcon, FilmIcon, CloseIcon, CheckIcon } from "./Icons"

/**
 * Sharing a finished sky.
 *
 * Only offered once a constellation is complete — before that there is nothing to
 * show. The still is whatever is on screen; the clip re-runs the arrival
 * cinematic and records it, so what leaves the app is the sky at its best rather
 * than a static frame.
 */

/** Camera overture (~12.3s) plus a beat at each end. */
const CLIP_MS = 13_400

type Job = null | "image" | "video"
type Done = null | "shared" | "saved"

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "our-sky"
}

export function ShareSky() {
  const universeMode = useSceneStore((s) => s.universeMode)
  const activeSlot = useSceneStore((s) => s.activeSlot)
  const guideActive = useSceneStore((s) => s.guideActive)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const setOvertureActive = useSceneStore((s) => s.setOvertureActive)
  const setVisionActive = useSceneStore((s) => s.setVisionActive)
  const view = useConstellation()

  const [open, setOpen] = useState(false)
  const [job, setJob] = useState<Job>(null)
  const [done, setDone] = useState<Done>(null)
  const [error, setError] = useState<string | null>(null)

  const name = view.constellation.name
  const base = slugify(name)

  const finish = (result: Done) => {
    setJob(null)
    setDone(result)
    window.setTimeout(() => setDone(null), 3200)
  }

  const saveImage = async () => {
    setError(null)
    setJob("image")
    try {
      const blob = await captureImage()
      if (!blob) throw new Error("The sky could not be captured.")
      finish(await deliver(blob, `${base}.${extensionFor(blob)}`, name))
    } catch (e) {
      setJob(null)
      setError(e instanceof Error ? e.message : "Could not save the image.")
    }
  }

  const saveClip = async () => {
    setError(null)
    setJob("video")
    // Close the panel and replay the cinematic — the recording is of that.
    setOpen(false)
    setVisionActive(true)
    setOvertureActive(true)
    try {
      const blob = await recordClip(CLIP_MS)
      if (!blob) throw new Error("This browser can't record the sky. Try saving an image.")
      finish(await deliver(blob, `${base}.${extensionFor(blob)}`, name))
    } catch (e) {
      setJob(null)
      setError(e instanceof Error ? e.message : "Could not record the clip.")
    }
  }

  // Deliberately available in the growth preview too: it is the owner's way to
  // check the share flow before launch, and the "Preview · day N" badge sits in
  // the captured frame, so a simulated sky labels itself.
  const available =
    universeMode === "universe" &&
    view.isComplete &&
    activeSlot === null &&
    !guideActive

  // Recording keeps the button alive through the cinematic so there is always
  // something on screen saying what is happening.
  const visible = (available && !overtureActive) || job === "video"

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed z-40"
            style={{ right: "20px", bottom: "26px" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            {job === "video" ? (
              <div
                className="flex items-center gap-2.5 rounded-full px-5 py-3"
                style={{
                  background: "rgba(8,1,6,0.72)",
                  border: "1px solid rgba(184,148,74,0.3)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <motion.span
                  style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(212,68,88,0.95)" }}
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <span
                  className="t-label"
                  style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.8)" }}
                >
                  Recording your sky
                </span>
              </div>
            ) : !open ? (
              <motion.button
                onClick={() => { setOpen(true); setError(null) }}
                className="flex items-center gap-2 rounded-full px-4 py-2.5"
                style={{
                  background: "rgba(8,1,6,0.6)",
                  border: "1px solid rgba(184,148,74,0.22)",
                  backdropFilter: "blur(20px)",
                  cursor: "pointer",
                }}
                whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.4)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              >
                <UploadIcon size={12} color="rgba(201,168,76,0.75)" />
                <span
                  className="t-label"
                  style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.7)" }}
                >
                  {done === "shared" ? "Shared" : done === "saved" ? "Saved" : "Share this sky"}
                </span>
              </motion.button>
            ) : (
              <motion.div
                className="w-[290px] max-w-[calc(100vw-40px)]"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
              >
                <div className="glass-bezel rounded-[20px]">
                  <div className="glass-bezel-inner rounded-[19px] px-6 py-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="t-label" style={{ fontSize: "8.5px", letterSpacing: "0.24em" }}>
                          Share this sky
                        </span>
                        <p
                          className="t-display"
                          style={{ fontSize: "17px", fontStyle: "italic", lineHeight: 1.25 }}
                        >
                          {name}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                        whileHover={{ background: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <CloseIcon size={12} color="rgba(242,236,224,0.45)" />
                      </motion.button>
                    </div>

                    <ShareOption
                      icon={<UploadIcon size={13} color="rgba(201,168,76,0.75)" />}
                      title="Save a picture"
                      note="The sky exactly as it looks now."
                      busy={job === "image"}
                      onClick={saveImage}
                    />

                    {canRecord() && (
                      <ShareOption
                        icon={<FilmIcon size={13} color="rgba(201,168,76,0.75)" />}
                        title="Record a clip"
                        note="Replays the cinematic and films it — about 13 seconds."
                        busy={false}
                        onClick={saveClip}
                      />
                    )}

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="t-serif"
                          style={{ fontSize: "12.5px", color: "rgba(220,80,80,0.85)", fontStyle: "italic" }}
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ShareOption({
  icon, title, note, busy, onClick,
}: {
  icon: React.ReactNode
  title: string
  note: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      className="flex items-start gap-3 rounded-xl px-3 py-3 -mx-1 text-left"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        cursor: busy ? "default" : "pointer",
      }}
      whileHover={busy ? {} : { background: "rgba(184,148,74,0.07)" }}
      whileTap={busy ? {} : { scale: 0.99 }}
    >
      <span className="shrink-0" style={{ marginTop: "2px" }}>
        {busy ? <CheckIcon size={13} color="rgba(201,168,76,0.75)" /> : icon}
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="t-serif" style={{ fontSize: "14px", color: "rgba(242,236,224,0.86)" }}>
          {busy ? "Preparing…" : title}
        </span>
        <span className="t-serif" style={{ fontSize: "12px", color: "rgba(242,236,224,0.38)", lineHeight: 1.5 }}>
          {note}
        </span>
      </span>
    </motion.button>
  )
}
