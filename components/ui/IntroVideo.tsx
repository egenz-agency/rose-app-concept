"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

const FIRST_VISIT_KEY = "rose_first_visit_done"
const MUSIC_VOLUME_TARGET = 0.45

export function IntroVideo() {
  const phase    = useSceneStore((s) => s.phase)
  const setPhase = useSceneStore((s) => s.setPhase)
  const [isMuted,  setIsMuted]  = useState(true)        // start muted → guaranteed autoplay on mobile
  const [showSkip, setShowSkip] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string>("/intro.mp4") // never null
  const videoRef  = useRef<HTMLVideoElement>(null)
  const musicRef  = useRef<HTMLAudioElement | null>(null)

  // Start background music loop once the video is done (phase leaves VIDEO)
  useEffect(() => {
    if (phase === "VIDEO") return
    if (musicRef.current) return
    const audio = new Audio("/audio/background_music.mp3")
    audio.loop = true
    audio.volume = 0
    musicRef.current = audio
    audio.play().catch(() => {
      const unlock = () => { audio.play().catch(() => {}); window.removeEventListener("pointerdown", unlock) }
      window.addEventListener("pointerdown", unlock)
    })
    let vol = 0
    const step = MUSIC_VOLUME_TARGET / 80
    const fade = setInterval(() => {
      vol = Math.min(vol + step, MUSIC_VOLUME_TARGET)
      audio.volume = vol
      if (vol >= MUSIC_VOLUME_TARGET) clearInterval(fade)
    }, 50)
    return () => clearInterval(fade)
  }, [phase])

  // On return visits, swap in the latest daily video if one exists.
  useEffect(() => {
    if (phase !== "VIDEO") return
    const isFirstEver = !localStorage.getItem(FIRST_VISIT_KEY)
    if (isFirstEver) {
      localStorage.setItem(FIRST_VISIT_KEY, "1")
      return // keep default /intro.mp4
    }
    import("@/lib/supabase/client").then(({ getSupabaseClient }) => {
      try {
        const sb = getSupabaseClient()
        sb.from("daily_videos")
          .select("video_url").eq("is_active", true)
          .order("created_at", { ascending: false }).limit(1).single()
          .then(({ data }) => { if (data?.video_url) setVideoSrc(data.video_url) })
      } catch { /* keep default */ }
    }).catch(() => {})
  }, [phase])

  // Play handling: muted autoplay always works; then try to unmute (the
  // Preloader "tap to begin" gesture usually still counts), and unmute on the
  // first tap as a fallback.
  useEffect(() => {
    if (phase !== "VIDEO") return
    const vid = videoRef.current
    if (!vid) return

    vid.muted = true
    vid.play().catch(() => {})

    // Best-effort immediate unmute (carries the recent tap gesture)
    const tryUnmute = () => {
      if (!videoRef.current) return
      videoRef.current.muted = false
      videoRef.current.play()
        .then(() => setIsMuted(false))
        .catch(() => {
          if (!videoRef.current) return
          videoRef.current.muted = true
          setIsMuted(true)
          videoRef.current.play().catch(() => {})
        })
    }
    tryUnmute()

    const unlock = () => { tryUnmute() }
    window.addEventListener("pointerdown", unlock, { once: true })

    const skipTimer = setTimeout(() => setShowSkip(true), 1500)
    return () => {
      clearTimeout(skipTimer)
      window.removeEventListener("pointerdown", unlock)
    }
  }, [phase, videoSrc])

  const handleVideoEnd = () => setPhase("INTRO_ANIMATION")

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
    v.play().catch(() => {})
  }

  // Fullscreen so she can rotate the phone and watch it landscape.
  const goFullscreen = () => {
    const vid = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitRequestFullscreen?: () => void })
      | null
    if (!vid) return
    if (vid.requestFullscreen) vid.requestFullscreen().catch(() => {})
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen()
    else if (vid.webkitRequestFullscreen) vid.webkitRequestFullscreen()
  }

  if (phase !== "VIDEO") return null

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    minHeight: 46, padding: "10px 18px", borderRadius: 999,
    background: "rgba(201,168,76,0.12)",
    border: "1px solid rgba(201,168,76,0.3)",
    color: "#c9a84c",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 15, letterSpacing: "0.08em",
    cursor: "pointer", WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation", pointerEvents: "auto",
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "#0a0205" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 1.5, ease: [0.32, 0.72, 0, 1] } }}
      >
        {/* Letterbox bars (behind controls) */}
        <div className="fixed top-0 left-0 right-0 h-[6vh] z-20 pointer-events-none" style={{ background: "#0a0205" }} />
        <div className="fixed bottom-0 left-0 right-0 h-[6vh] z-20 pointer-events-none" style={{ background: "#0a0205" }} />

        {/* Video — tap it for fullscreen + sound */}
        <div className="relative overflow-hidden" style={{ width: "92%", maxWidth: 900, aspectRatio: "16/9" }}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnd}
            onClick={goFullscreen}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }}
          />
          <div className="absolute inset-x-0 top-0 h-16 pointer-events-none z-10" style={{ background: "linear-gradient(to bottom, #0a0205, transparent)" }} />
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none z-10" style={{ background: "linear-gradient(to top, #0a0205, transparent)" }} />
        </div>

        {/* Controls — fixed bottom bar, above everything, safe-area aware */}
        <div
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60,
            display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 14,
            padding: "14px 16px calc(14px + env(safe-area-inset-bottom, 0px))",
            pointerEvents: "auto",
          }}
        >
          <button type="button" onClick={toggleMute} style={btnStyle}>
            {isMuted ? <SoundOffIcon /> : <SoundOnIcon />}
            <span>{isMuted ? "Tap for sound" : "Mute"}</span>
          </button>

          <button type="button" onClick={goFullscreen} style={btnStyle}>
            <ExpandIcon />
            <span>Fullscreen</span>
          </button>

          <button
            type="button"
            onClick={handleVideoEnd}
            style={{
              ...btnStyle,
              background: "transparent",
              border: "1px solid rgba(245,240,232,0.18)",
              color: "rgba(245,240,232,0.65)",
              textTransform: "uppercase",
              fontSize: 12, letterSpacing: "0.16em",
              opacity: showSkip ? 1 : 0.6,
            }}
          >
            Skip intro
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}
