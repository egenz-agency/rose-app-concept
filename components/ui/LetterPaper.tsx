"use client"
import type { ReactNode } from "react"

// A piece of ornamented cream stationery: subtle paper gradient, a fine gold
// inset frame, hand-drawn corner flourishes, and a small rosette crest. Shared
// by every "letter" surface (revealed messages, invitations, re-read letters)
// so they all feel like one set of stationery.

const ROSE = "rgba(120,30,45,0.55)"
const GOLD = "rgba(150,104,46,0.5)"

function CornerFlourish({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[corner]
  const pos: React.CSSProperties =
    corner === "tl" ? { top: 14, left: 14 }
    : corner === "tr" ? { top: 14, right: 14 }
    : corner === "br" ? { bottom: 14, right: 14 }
    : { bottom: 14, left: 14 }
  return (
    <svg
      width="34" height="34" viewBox="0 0 34 34" fill="none"
      style={{ position: "absolute", transform: `rotate(${rot}deg)`, opacity: 0.7, pointerEvents: "none", ...pos }}
    >
      <path d="M2 16 Q2 2 16 2" stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
      <path d="M6 13 Q6 6 13 6 Q18 6 17 11" stroke={GOLD} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="2" r="1.3" fill={ROSE} />
      <circle cx="17" cy="11" r="1" fill={ROSE} />
    </svg>
  )
}

// A small rose crest used at the head of a letter.
export function RoseCrest({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke={GOLD} strokeWidth="0.8" />
      <path d="M12 7 C14 7 15 9 14 11 C13 12.5 11 12.5 10 11 C9 9 10 7 12 7Z" fill={ROSE} />
      <path d="M12 9 C13.2 9 14 10 13.4 11.2 C12.9 12.2 11.1 12.2 10.6 11.2 C10 10 10.8 9 12 9Z" fill="rgba(150,104,46,0.6)" />
      <path d="M12 13 L12 17 M12 15 Q10 14.5 10 13 M12 15 Q14 14.5 14 13" stroke={ROSE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// An ornamental divider: a thin rule with a centered diamond.
export function LetterDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }} aria-hidden>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0 L10 5 L5 10 L0 5Z" fill={ROSE} /></svg>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  )
}

export function LetterPaper({ children, maxHeight }: { children: ReactNode; maxHeight?: string }) {
  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(168deg, #f7efdb 0%, #f0e4ca 60%, #ecdfc2 100%)",
        borderRadius: 16,
        padding: "34px 30px 28px",
        boxShadow: "0 30px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.65)",
        overflowY: "auto",
        maxHeight,
      }}
    >
      {/* fine gold inset frame */}
      <div style={{ position: "absolute", inset: 9, border: `1px solid ${GOLD}`, opacity: 0.45, borderRadius: 11, pointerEvents: "none" }} />
      <CornerFlourish corner="tl" />
      <CornerFlourish corner="tr" />
      <CornerFlourish corner="bl" />
      <CornerFlourish corner="br" />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  )
}
