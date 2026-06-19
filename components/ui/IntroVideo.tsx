"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

const FIRST_VISIT_KEY = "rose_first_visit_done"
const MUSIC_VOLUME_TARGET = 0.45

export function IntroVideo() {
  const phase    = useSceneStore((s) => s.phase)
  const setPhase = useSceneStore((s) => s.setPhase)
  const [isMuted,   setIsMuted]   = useState(false)
  const [showSkip,  setShowSkip]  = useState(false)
  const [videoSrc,  setVideoSrc]  = useState<string | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const musicRef  = useRef<HTMLAudioElement | null>(null)

  // Start background music loop when the video ends (phase leaves VIDEO)
  useEffect(() => {
    if (phase === "VIDEO") return
    if (musicRef.current) return // already started

    const audio = new Audio("/audio/background_music.mp3")
    audio.loop = true
    audio.volume = 0
    musicRef.current = audio

    audio.play().catch(() => {
      // Autoplay blocked — will start on next user interaction
      const unlock = () => {
        audio.play().catch(() => {})
        window.removeEventListener("pointerdown", unlock)
      }
      window.addEventListener("pointerdown", unlock)
    })

    // Fade in over 4 seconds
    let vol = 0
    const step = MUSIC_VOLUME_TARGET / 80
    const fade = setInterval(() => {
      vol = Math.min(vol + step, MUSIC_VOLUME_TARGET)
      audio.volume = vol
      if (vol >= MUSIC_VOLUME_TARGET) clearInterval(fade)
    }, 50)

    return () => clearInterval(fade)
  }, [phase])

  // Determine which video to play: /intro.mp4 on first ever visit,
  // latest from daily_videos table on subsequent visits
  useEffect(() => {
    if (phase !== "VIDEO") return

    const isFirstEver = !localStorage.getItem(FIRST_VISIT_KEY)
    if (isFirstEver) {
      setVideoSrc("/intro.mp4")
      localStorage.setItem(FIRST_VISIT_KEY, "1")
      return
    }

    // Try to fetch latest daily video from Supabase
    import("@/lib/supabase/client").then(({ getSupabaseClient }) => {
      const sb = getSupabaseClient()
      sb.from("daily_videos")
        .select("video_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
        .then(({ data, error }) => {
          if (error || !data) setVideoSrc("/intro.mp4")
          else setVideoSrc(data.video_url ?? "/intro.mp4")
        })
    })
  }, [phase])

  useEffect(() => {
    if (phase !== "VIDEO" || !videoSrc) return
    const skipTimer = setTimeout(() => setShowSkip(true), 3000)

    const vid = videoRef.current
    if (!vid) return () => clearTimeout(skipTimer)

    let removeUnlock: (() => void) | null = null

    // Try to play WITH sound first (ideal — Preloader click is a user gesture).
    vid.muted = false
    setIsMuted(false)
    vid.play().catch(() => {
      // Browser blocked unmuted autoplay. Fall back to MUTED autoplay so the
      // video always plays visibly, then unmute on the very first interaction.
      vid.muted = true
      setIsMuted(true)
      vid.play().catch(() => {})

      const unlock = () => {
        if (!videoRef.current) return
        videoRef.current.muted = false
        setIsMuted(false)
        videoRef.current.play().catch(() => {})
        removeUnlock?.()
      }
      window.addEventListener("pointerdown", unlock, { once: true })
      window.addEventListener("keydown", unlock, { once: true })
      removeUnlock = () => {
        window.removeEventListener("pointerdown", unlock)
        window.removeEventListener("keydown", unlock)
      }
    })

    return () => {
      clearTimeout(skipTimer)
      removeUnlock?.()
    }
  }, [phase, videoSrc])

  const handleVideoEnd = () => setPhase("INTRO_ANIMATION")

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Open the video in fullscreen so she can rotate the phone and watch it
  // landscape. iOS Safari needs the video element's own webkitEnterFullscreen.
  const goFullscreen = () => {
    const vid = videoRef.current as
      | (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void
          webkitRequestFullscreen?: () => void
        })
      | null
    if (!vid) return
    if (vid.requestFullscreen) vid.requestFullscreen().catch(() => {})
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen() // iOS
    else if (vid.webkitRequestFullscreen) vid.webkitRequestFullscreen()
  }

  if (phase !== "VIDEO") return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "#0a0205" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 1.5, ease: [0.32, 0.72, 0, 1] } }}
      >
        {/* Letterbox bars */}
        <div className="fixed top-0 left-0 right-0 h-[8vh] z-20" style={{ background: "#0a0205" }} />
        <div className="fixed bottom-0 left-0 right-0 h-[8vh] z-20" style={{ background: "#0a0205" }} />

        {/* Video — 80% width, 16:9 */}
        <div className="relative overflow-hidden" style={{ width: "80%", aspectRatio: "16/9" }}>
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              onEnded={handleVideoEnd}
              onClick={goFullscreen}
              onCanPlay={(e) => {
                // Keep trying to play WITH sound the moment the data is ready.
                const v = e.currentTarget
                if (v.paused) {
                  v.muted = false
                  v.play().catch(() => {})
                }
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }}
            />
          )}
          {/* Cinematic gradient edges */}
          <div className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10"
            style={{ background: "linear-gradient(to bottom, #0a0205, transparent)" }} />
          <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none z-10"
            style={{ background: "linear-gradient(to top, #0a0205, transparent)" }} />
          <div className="absolute inset-y-0 left-0 w-24 pointer-events-none z-10"
            style={{ background: "linear-gradient(to right, #0a0205, transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10"
            style={{ background: "linear-gradient(to left, #0a0205, transparent)" }} />
        </div>

        {/* Controls */}
        <div className="relative z-30 flex items-center gap-6 mt-8">
          <motion.button
            onClick={toggleMute}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.2)",
              color: "#c9a84c",
              fontFamily: "'Cormorant Garamond', serif",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.02, background: "rgba(201,168,76,0.15)" }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}
          >
            {isMuted ? <SoundOffIcon /> : <SoundOnIcon />}
            <span>{isMuted ? "Unmute" : "Mute"}</span>
          </motion.button>

          <motion.button
            onClick={goFullscreen}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.2)",
              color: "#c9a84c",
              fontFamily: "'Cormorant Garamond', serif",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.02, background: "rgba(201,168,76,0.15)" }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.1 } }}
          >
            <ExpandIcon />
            <span>Fullscreen</span>
          </motion.button>

          <AnimatePresence>
            {showSkip && (
              <motion.button
                onClick={handleVideoEnd}
                style={{
                  color: "rgba(245,240,232,0.4)",
                  fontFamily: "'Cormorant Garamond', serif",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontSize: "11px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ color: "rgba(245,240,232,0.8)" }}
              >
                Skip intro
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}
