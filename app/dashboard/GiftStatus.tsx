"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createCheckoutSessionAction } from "./checkout"
import { giftLifecycle, daysUntilExpiry, shouldPromptRenewal } from "@/lib/payments/entitlement"

// The gift link, and the paywall in front of it.
//
// A gift is built for free and costs one payment to send; that buys a year. The
// owner keeps full access to the dashboard the whole time — only the recipient's
// link is gated, so nothing they wrote is ever held hostage.

export function GiftStatus({ tenant }: { tenant: Record<string, unknown> }) {
  const entitlement = {
    status: String(tenant.status ?? "draft"),
    paid: Boolean(tenant.paid),
    expires_at: (tenant.expires_at as string | null) ?? null,
  }
  const phase = giftLifecycle(entitlement)
  const giftPath = `/g/${tenant.access_token}`

  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stripe bounces the buyer back here the instant they pay, but the gift only
  // turns live when the webhook lands a moment later. Without this they'd see
  // "Unlock the gift link" again and could pay twice — so while we're waiting we
  // show a settling state and poll instead of offering the button.
  const router = useRouter()
  const justPaid = useSearchParams().get("paid") === "1"
  const settling = justPaid && phase !== "live"
  useEffect(() => {
    if (!settling) return
    const t = setInterval(() => router.refresh(), 2000)
    const stop = setTimeout(() => clearInterval(t), 60000)
    return () => { clearInterval(t); clearTimeout(stop) }
  }, [settling, router])

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}${giftPath}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  async function checkout() {
    setBusy(true); setError(null)
    try {
      const { url } = await createCheckoutSessionAction()
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.")
      setBusy(false)
    }
  }

  if (phase === "suspended") {
    return (
      <div style={{ ...card, borderColor: "rgba(200,60,60,0.28)" }}>
        <div style={sectionLabel}>Gift paused</div>
        <p style={body}>
          This gift is currently paused. Reply to your receipt email and we&apos;ll sort it out.
        </p>
      </div>
    )
  }

  if (settling) {
    return (
      <div style={{ ...card, borderColor: "rgba(232,200,130,0.35)" }}>
        <div style={sectionLabel}>Payment received</div>
        <p style={body}>
          Bringing your gift to life — this takes a few seconds. You don&apos;t need to pay again;
          this page will update on its own.
        </p>
      </div>
    )
  }

  // Never paid, or the year ran out: the link is dead until it's bought.
  if (phase === "draft" || phase === "expired") {
    const isRenewal = phase === "expired"
    return (
      <div style={{ ...card, borderColor: "rgba(232,200,130,0.35)" }}>
        <div style={sectionLabel}>{isRenewal ? "This gift has ended" : "Not sent yet"}</div>
        <p style={body}>
          {isRenewal
            ? "Her link stopped working when the year ended. Everything you wrote is still here — buy another year and the same link comes back to life."
            : "Keep adding messages and moments for as long as you like. When you're ready to send it to her, unlock the private link — that's a single payment covering a full year."}
        </p>
        <button onClick={checkout} disabled={busy} style={payBtn(busy)}>
          {busy ? "Opening checkout…" : isRenewal ? "Buy another year" : "Unlock the gift link"}
        </button>
        {error && <p style={{ color: "#e07a8a", fontSize: 12, marginTop: 10 }}>{error}</p>}
      </div>
    )
  }

  // Live.
  const days = daysUntilExpiry(entitlement.expires_at)
  const renewSoon = shouldPromptRenewal(entitlement)
  return (
    <div style={card}>
      <div style={sectionLabel}>The gift link to send her</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <code style={{ fontSize: 14, color: "#e8c882", wordBreak: "break-all" }}>{giftPath}</code>
        <button onClick={copyLink} style={smallBtn}>{copied ? "Copied!" : "Copy"}</button>
        <a href={giftPath} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: "none" }}>Open</a>
      </div>
      <p style={{ ...body, margin: "10px 0 0" }}>
        This is a private link — only the person you send it to can open the gift. Keep it just between
        you two. On her phone she can add it to her home screen to install it like an app.
      </p>
      <p style={{ ...body, margin: "10px 0 0", color: renewSoon ? "#e8c882" : "rgba(242,236,224,0.35)" }}>
        {renewSoon
          ? `Her gift stays open for ${days} more ${days === 1 ? "day" : "days"} — renew to keep it alive.`
          : `Open until ${formatDate(entitlement.expires_at)}.`}
      </p>
      {renewSoon && (
        <>
          <button onClick={checkout} disabled={busy} style={payBtn(busy)}>
            {busy ? "Opening checkout…" : "Buy another year"}
          </button>
          {error && <p style={{ color: "#e07a8a", fontSize: 12, marginTop: 10 }}>{error}</p>}
        </>
      )}
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

const card: React.CSSProperties = {
  border: "1px solid rgba(184,148,74,0.18)", borderRadius: 14, padding: 16,
  marginTop: 10, background: "rgba(255,255,255,0.02)",
}
const sectionLabel: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
  color: "rgba(232,200,130,0.7)", marginBottom: 8,
}
const body: React.CSSProperties = {
  fontSize: 12, lineHeight: 1.5, color: "rgba(242,236,224,0.45)", fontFamily: "'EB Garamond', serif",
}
const smallBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)",
  background: "rgba(255,255,255,0.05)", color: "#f2ece0", fontSize: 12,
  cursor: "pointer", fontFamily: "'EB Garamond', serif",
}
const payBtn = (busy: boolean): React.CSSProperties => ({
  marginTop: 14, padding: "10px 18px", borderRadius: 999,
  border: "1px solid rgba(232,200,130,0.5)", background: "rgba(232,200,130,0.14)",
  color: "#f6eeda", fontSize: 14, fontFamily: "'EB Garamond', serif",
  cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
})
