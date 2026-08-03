"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { SaveMoment } from "./SaveMoment"
import { MicIcon, CloseIcon } from "./Icons"

// Shows a scheduled "moment" — a photo, a clip, and/or a message the owner
// pre-loaded for this visit/date — as a tender full-screen reveal after tending.
export function MomentPanel() {
  const moment          = useSceneStore((s) => s.activeMoment)
  const setActiveMoment = useSceneStore((s) => s.setActiveMoment)

  const close = () => setActiveMoment(null)

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          style={{ background: "rgba(8,1,6,0.86)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <motion.div
            className="w-full"
            style={{ maxWidth: 460 }}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="glass-bezel rounded-[26px]">
              <div className="glass-bezel-inner rounded-[25px] p-6 flex flex-col gap-5">

                <div className="flex items-start justify-between gap-3">
                  <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.28em" }}>
                    A moment for you
                  </span>
                  <button
                    onClick={close}
                    aria-label="Close"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer" }}
                  >
                    <CloseIcon size={13} color="rgba(242,236,224,0.5)" />
                  </button>
                </div>

                {moment.title && (
                  <h2 className="t-display glow-crimson" style={{ fontSize: 26, fontStyle: "italic", lineHeight: 1.15 }}>
                    {moment.title}
                  </h2>
                )}

                {moment.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={moment.photo_url}
                    alt={moment.title ?? "A memory"}
                    style={{ width: "100%", borderRadius: 16, display: "block", border: "1px solid rgba(184,148,74,0.18)" }}
                  />
                )}

                {moment.video_url && (
                  <video
                    src={moment.video_url}
                    controls
                    playsInline
                    style={{ width: "100%", borderRadius: 16, display: "block", border: "1px solid rgba(184,148,74,0.18)", background: "#000" }}
                  />
                )}

                {moment.audio_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(184,148,74,0.22)", background: "rgba(255,255,255,0.03)" }}>
                    <MicIcon size={16} color="rgba(201,168,76,0.85)" />
                    {/* preload="none" — a voice note shouldn't start fetching
                        before she's chosen to listen, especially on mobile data. */}
                    <audio src={moment.audio_url} controls preload="none" style={{ flex: 1, minWidth: 0, height: 36 }} />
                  </div>
                )}

                {moment.message && (
                  <p
                    className="t-serif"
                    style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(242,236,224,0.82)", whiteSpace: "pre-wrap" }}
                  >
                    {moment.message}
                  </p>
                )}

                {/* Hers to keep. Media saves the file; a words-only moment
                    saves the words, so there's always something to take away. */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {moment.photo_url && <SaveMoment url={moment.photo_url} baseName={moment.title || "photo"} label="Save photo" />}
                  {moment.video_url && <SaveMoment url={moment.video_url} baseName={moment.title || "video"} label="Save video" />}
                  {moment.audio_url && <SaveMoment url={moment.audio_url} baseName={moment.title || "voice-message"} label="Save voice" />}
                  {!moment.photo_url && !moment.video_url && !moment.audio_url && moment.message && (
                    <SaveMoment
                      text={`${moment.title ? moment.title + "\n\n" : ""}${moment.message}`}
                      baseName={moment.title || "message"}
                      label="Save these words"
                    />
                  )}
                </div>

                <button
                  onClick={close}
                  className="w-full rounded-full py-3.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
                    border: "1px solid rgba(184,148,74,0.28)",
                    color: "rgba(242,236,224,0.9)",
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 15, letterSpacing: "0.06em", cursor: "pointer",
                  }}
                >
                  Close
                </button>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
