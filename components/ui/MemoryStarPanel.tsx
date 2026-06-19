"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchMemoryStars, createMemoryStar } from "@/lib/supabase/queries"
import { useSceneStore } from "@/lib/store/sceneStore"
import { StarIcon, CloseIcon, ArrowLeftIcon, PlusIcon, SparkleIcon } from "./Icons"

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(184,148,74,0.15)",
  color: "#f2ece0",
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: "15px",
  borderRadius: "12px",
  padding: "11px 15px",
  outline: "none",
  width: "100%",
  lineHeight: 1.5,
}

export function MemoryStarPanel() {
  const activePanelId = useSceneStore((s) => s.activePanelId)
  const closePanel    = useSceneStore((s) => s.closePanel)

  const isPanel    = activePanelId === "memory-stars"
  const isStarView = typeof activePanelId === "string" && activePanelId.startsWith("star-")
  const isVisible  = isPanel || isStarView

  const [mode, setMode]       = useState<"list" | "create" | "view">("list")
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm]         = useState({ title: "", date: "", memory: "" })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk]   = useState(false)
  const queryClient = useQueryClient()

  const { data: stars = [], isLoading } = useQuery({
    queryKey: ["memory-stars"],
    queryFn: fetchMemoryStars,
    enabled: isVisible,
    staleTime: 0,
  })

  const selectedStar = isStarView
    ? stars.find((s) => s.id === activePanelId?.replace("star-", ""))
    : stars.find((s) => s.id === selected)

  const mutation = useMutation({
    mutationFn: () =>
      createMemoryStar({
        title: form.title.trim(),
        date: form.date,
        memory: form.memory.trim(),
        photos: [],
        position: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-stars"] })
      setSavedOk(true)
      setSaveError(null)
      setTimeout(() => {
        setSavedOk(false)
        setMode("list")
        setForm({ title: "", date: "", memory: "" })
      }, 1400)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not save. Try again."
      setSaveError(msg)
    },
  })

  const canSubmit =
    form.title.trim().length > 0 &&
    form.date.length > 0 &&
    form.memory.trim().length > 0 &&
    !mutation.isPending &&
    !savedOk

  const handleBack = () => {
    setMode("list")
    setSelected(null)
    setSaveError(null)
    setSavedOk(false)
  }

  const handleClose = () => {
    handleBack()
    closePanel()
  }

  // ── Panel header label ─────────────────────────────────────────
  const headingLabel =
    selectedStar   ? selectedStar.title :
    mode === "create" ? "New memory star" : "Memory constellation"

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4 py-10"
          style={{ background: "rgba(8,1,6,0.82)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            className="w-full max-w-[400px] max-h-[85dvh] flex flex-col"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="glass-bezel rounded-[24px] flex flex-col overflow-hidden">
              <div className="glass-bezel-inner rounded-[23px] flex flex-col overflow-hidden">

                {/* ── Header (fixed) ── */}
                <div className="flex items-start justify-between px-7 pt-7 pb-5 shrink-0">
                  <div className="flex flex-col gap-1">
                    <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.26em" }}>
                      Memory constellation
                    </span>
                    <h2 className="t-display" style={{ fontSize: "22px", fontStyle: "italic" }}>
                      {headingLabel}
                    </h2>
                  </div>
                  <button
                    onClick={selectedStar || mode !== "list" ? handleBack : handleClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                      marginTop: "2px",
                    }}
                  >
                    {selectedStar || mode !== "list"
                      ? <ArrowLeftIcon size={13} color="rgba(242,236,224,0.45)" />
                      : <CloseIcon    size={13} color="rgba(242,236,224,0.45)" />}
                  </button>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(184,148,74,0.12), transparent)", flexShrink: 0 }} />

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-4">

                  {/* STAR VIEW */}
                  {selectedStar && (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <StarIcon size={11} color="rgba(184,148,74,0.65)" />
                        <span className="t-serif" style={{ fontSize: "13px", color: "rgba(184,148,74,0.75)" }}>
                          {new Date(selectedStar.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      </div>
                      <p className="t-serif" style={{ fontSize: "15px", lineHeight: 1.75, fontStyle: "italic", color: "rgba(242,236,224,0.8)" }}>
                        {selectedStar.memory}
                      </p>
                    </motion.div>
                  )}

                  {/* LIST VIEW */}
                  {!selectedStar && mode === "list" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col gap-3"
                    >
                      {isLoading && (
                        <p className="t-serif text-center py-4" style={{ fontSize: "14px", color: "rgba(242,236,224,0.3)", fontStyle: "italic" }}>
                          Loading your stars…
                        </p>
                      )}

                      {!isLoading && stars.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-6">
                          <SparkleIcon size={20} color="rgba(184,148,74,0.3)" />
                          <p className="t-serif text-center" style={{ fontSize: "14px", color: "rgba(242,236,224,0.35)", fontStyle: "italic" }}>
                            No memories yet.
                            <br />Plant your first star.
                          </p>
                        </div>
                      )}

                      {stars.map((star) => (
                        <motion.button
                          key={star.id}
                          onClick={() => setSelected(star.id)}
                          className="w-full text-left rounded-2xl px-5 py-4"
                          style={{
                            background: "rgba(184,148,74,0.04)",
                            border: "1px solid rgba(184,148,74,0.1)",
                            cursor: "pointer",
                          }}
                          whileHover={{ background: "rgba(184,148,74,0.08)", borderColor: "rgba(184,148,74,0.18)" }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="t-serif" style={{ fontSize: "15px", color: "rgba(242,236,224,0.88)" }}>
                                {star.title}
                              </p>
                              <p style={{ fontSize: "12px", color: "rgba(242,236,224,0.35)", marginTop: "2px" }}>
                                {new Date(star.date).toLocaleDateString()}
                              </p>
                            </div>
                            <StarIcon size={12} color="rgba(184,148,74,0.5)" />
                          </div>
                        </motion.button>
                      ))}

                      <motion.button
                        onClick={() => { setSaveError(null); setSavedOk(false); setMode("create") }}
                        className="w-full rounded-full py-3 flex items-center justify-center gap-2 mt-1"
                        style={{
                          background: "rgba(184,148,74,0.07)",
                          border: "1px solid rgba(184,148,74,0.18)",
                          cursor: "pointer",
                        }}
                        whileHover={{ background: "rgba(184,148,74,0.12)" }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <PlusIcon size={12} color="rgba(184,148,74,0.7)" />
                        <span className="t-label" style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(184,148,74,0.7)" }}>
                          Plant a new memory star
                        </span>
                      </motion.button>
                    </motion.div>
                  )}

                  {/* CREATE VIEW */}
                  {!selectedStar && mode === "create" && (
                    <motion.div
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col gap-4"
                    >
                      {/* Title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="t-label" style={{ fontSize: "8.5px", letterSpacing: "0.22em" }}>
                          Memory title
                        </label>
                        <input
                          style={inputStyle}
                          placeholder="Our first evening together"
                          value={form.title}
                          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                          maxLength={80}
                        />
                      </div>

                      {/* Date */}
                      <div className="flex flex-col gap-1.5">
                        <label className="t-label" style={{ fontSize: "8.5px", letterSpacing: "0.22em" }}>
                          Date
                        </label>
                        <input
                          type="date"
                          style={inputStyle}
                          value={form.date}
                          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>

                      {/* Memory */}
                      <div className="flex flex-col gap-1.5">
                        <label className="t-label" style={{ fontSize: "8.5px", letterSpacing: "0.22em" }}>
                          The memory
                        </label>
                        <textarea
                          style={{ ...inputStyle, minHeight: "100px", resize: "none" }}
                          placeholder="Write what you remember most…"
                          value={form.memory}
                          onChange={(e) => setForm((f) => ({ ...f, memory: e.target.value }))}
                          maxLength={600}
                        />
                        <span style={{ fontSize: "11px", color: "rgba(242,236,224,0.22)", textAlign: "right" }}>
                          {form.memory.length}/600
                        </span>
                      </div>

                      {/* Error */}
                      <AnimatePresence>
                        {saveError && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="t-serif"
                            style={{ fontSize: "13px", color: "rgba(220,80,80,0.85)", fontStyle: "italic" }}
                          >
                            {saveError}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      {/* Submit */}
                      <motion.button
                        onClick={() => { setSaveError(null); mutation.mutate() }}
                        disabled={!canSubmit}
                        className="w-full rounded-full py-3.5 flex items-center justify-center gap-2 relative overflow-hidden"
                        style={{
                          background: savedOk
                            ? "rgba(60,120,60,0.5)"
                            : canSubmit
                            ? "linear-gradient(135deg, rgba(138,21,40,0.88), rgba(90,8,20,0.95))"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${savedOk ? "rgba(100,180,100,0.4)" : "rgba(184,148,74,0.24)"}`,
                          cursor: canSubmit ? "pointer" : "not-allowed",
                          transition: "all 0.4s ease",
                        }}
                        whileHover={canSubmit ? { scale: 1.012 } : {}}
                        whileTap={canSubmit ? { scale: 0.975 } : {}}
                      >
                        {/* Shimmer */}
                        {canSubmit && !savedOk && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)", x: "-100%" }}
                            animate={{ x: ["-100%","200%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                          />
                        )}
                        <span className="t-serif" style={{ fontSize: "15px", color: "rgba(242,236,224,0.88)", letterSpacing: "0.04em" }}>
                          {savedOk
                            ? "Star planted ✦"
                            : mutation.isPending
                            ? "Planting your star…"
                            : "Plant this star"}
                        </span>
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
