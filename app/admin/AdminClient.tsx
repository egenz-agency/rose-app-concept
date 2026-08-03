"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createFreeGiftAction, grantFreeYearAction, type AdminStats, type AdminGift } from "./actions"
import { giftLifecycle } from "@/lib/payments/entitlement"
import { planLabel } from "@/lib/payments/plans"
import { SupportLinks } from "@/components/ui/SupportLinks"

export function AdminClient({
  email, stats, gifts
}: { email: string; stats: AdminStats; gifts: AdminGift[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const totalPurchases = stats.packages.reduce((n, p) => n + p.purchases, 0)
  const totalComped = stats.packages.reduce((n, p) => n + p.comped, 0)

  const money = (cents: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (stats.currency || "eur").toUpperCase()
    }).format(cents / 100)

  return (
    <div className="ui-surface" style={page}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <h1 style={h1}>Operator</h1>
          <span style={{ ...dim, fontSize: 12 }}>{email}</span>
        </div>
        <p style={{ ...dim, marginBottom: 26 }}>Every gift in the system, and free roses for testing or gifting.</p>

        {/* Money */}
        <div style={grid}>
          <Stat label="Revenue" value={money(stats.totalRevenueCents)} accent />
          <Stat label="Paid purchases" value={String(totalPurchases)} />
          <Stat label="Comped (free)" value={String(totalComped)} />
          <Stat label="Refunded" value={String(stats.refunds)} />
        </div>
        <p style={{ ...dim, fontSize: 11, marginTop: 10 }}>
          Revenue counts settled Stripe payments only — comped grants (€0) and refunded purchases are excluded.
        </p>

        {/* Packages */}
        <h2 style={h2}>Packages</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                {["Package", "Gifts", "Live", "Draft", "Expired", "Bought", "Comped", "Revenue"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.packages.map((p) => (
                <tr key={p.plan}>
                  <td style={{ ...td, color: "#e8c882" }}>
                    {p.label}
                    <span style={{ ...dim, fontSize: 11, marginLeft: 6 }}>{p.plan}</span>
                  </td>
                  <td style={td}>{p.gifts}</td>
                  <td style={td}>{p.live}</td>
                  <td style={td}>{p.draft}</td>
                  <td style={td}>{p.expired}</td>
                  <td style={td}>{p.purchases}</td>
                  <td style={td}>{p.comped}</td>
                  <td style={{ ...td, color: "#e8c882" }}>{money(p.revenueCents)}</td>
                </tr>
              ))}
              {stats.packages.length === 0 && (
                <tr><td style={td} colSpan={8}><span style={dim}>No gifts yet.</span></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signup funnel */}
        <h2 style={h2}>Accounts</h2>
        <div style={grid}>
          <Stat label="Registered" value={String(stats.funnel.accounts)} />
          <Stat label="No gift yet" value={String(stats.funnel.accountsNoGift)} />
          <Stat label="Built, never paid" value={String(stats.funnel.accountsGiftNeverPaid)} />
          <Stat label="Paying" value={String(stats.funnel.accountsPaying)} accent />
        </div>
        <p style={{ ...dim, fontSize: 11, marginTop: 10 }}>
          &ldquo;Built, never paid&rdquo; is the real drop-off — they made a gift and stopped at the paywall.
          {stats.funnel.accounts > 0 && (
            <> Conversion: <strong style={{ color: "#f2ece0" }}>
              {Math.round((stats.funnel.accountsPaying / stats.funnel.accounts) * 100)}%
            </strong> of registered accounts.</>
          )}
        </p>

        <CreateFreeRose onDone={refresh} />

        <h2 style={h2}>All gifts</h2>
        {gifts.length === 0 && <p style={dim}>No gifts yet.</p>}
        {gifts.map((g) => (
          <GiftRow key={g.id} gift={g} onDone={refresh} />
        ))}

        <SupportLinks context="operator console" style={{ marginTop: 34 }} />
      </div>
    </div>
  )
}

function GiftRow({ gift, onDone }: { gift: AdminGift; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const phase = giftLifecycle({ status: gift.status, paid: gift.paid, expires_at: gift.expires_at })

  const tone: Record<string, string> = {
    live: "#7fd18b", draft: "#e8c882", expired: "#e07a8a", suspended: "#e07a8a"
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <strong style={{ fontSize: 15 }}>{gift.slug}</strong>
          <span style={{ ...dim, marginLeft: 10, fontSize: 12 }}>
            {gift.recipient_name ?? "—"} · {planLabel(gift.plan)} · {gift.owner_email ?? "no owner"}
          </span>
        </div>
        <span style={{ color: tone[phase] ?? "#f2ece0", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {phase}
          {gift.expires_at && phase !== "draft" && (
            <span style={{ ...dim, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>
              until {new Date(gift.expires_at).toLocaleDateString()}
            </span>
          )}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {phase === "live" && (
          <a href={`/g/${gift.access_token}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}>
            Open gift
          </a>
        )}
        <button
          style={btn}
          disabled={busy}
          onClick={async () => {
            setBusy(true); setErr(null)
            try { await grantFreeYearAction(gift.slug, "operator — comped year"); onDone() }
            catch (e) { setErr(e instanceof Error ? e.message : "Failed") }
            finally { setBusy(false) }
          }}
        >
          {busy ? "Granting…" : "+1 free year"}
        </button>
      </div>
      {err && <p style={{ color: "#e07a8a", fontSize: 12, marginTop: 8 }}>{err}</p>}
    </div>
  )
}

function CreateFreeRose({ onDone }: { onDone: () => void }) {
  const [slug, setSlug] = useState("")
  const [recipient, setRecipient] = useState("")
  const [giver, setGiver] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [made, setMade] = useState<{ slug: string; token: string } | null>(null)

  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")

  return (
    <div style={{ ...card, borderColor: "rgba(232,200,130,0.35)", marginTop: 24 }}>
      <h2 style={{ ...h2, marginTop: 0 }}>Create a free rose</h2>
      <p style={{ ...dim, marginBottom: 14 }}>
        Owned by you, live for a year, no payment. For testing a new feature, or gifting one to a friend.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr(null); setMade(null)
          try {
            setMade(await createFreeGiftAction({ slug, recipient, giver }))
            setSlug(""); setRecipient(""); setGiver("")
            onDone()
          } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Failed")
          } finally { setBusy(false) }
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="link name" style={input} />
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="her name" style={input} />
        <input value={giver} onChange={(e) => setGiver(e.target.value)} placeholder="your name" style={input} />
        <button type="submit" disabled={busy || !clean} style={{ ...btn, opacity: busy || !clean ? 0.5 : 1 }}>
          {busy ? "Creating…" : "Create free rose"}
        </button>
      </form>
      {clean && !made && <p style={{ ...dim, fontSize: 12, marginTop: 8 }}>→ /r/{clean}</p>}
      {err && <p style={{ color: "#e07a8a", fontSize: 12, marginTop: 8 }}>{err}</p>}
      {made && (
        <p style={{ fontSize: 13, marginTop: 10, color: "#7fd18b" }}>
          Created <strong>{made.slug}</strong> —{" "}
          <a href={`/g/${made.token}`} target="_blank" rel="noreferrer" style={{ color: "#e8c882" }}>
            open it
          </a>
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ ...card, marginTop: 0 }}>
      <div style={{ ...dim, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: accent ? 26 : 22, marginTop: 6, color: accent ? "#e8c882" : "#f2ece0" }}>{value}</div>
    </div>
  )
}

const page: React.CSSProperties = {
  height: "100dvh", overflowY: "auto", background: "#0a0205",
  padding: "32px 20px 80px", color: "#f2ece0"
}
const h1: React.CSSProperties = {
  fontSize: 30, margin: 0
}
const h2: React.CSSProperties = {
  fontSize: 21, margin: "30px 0 8px"
}
const dim: React.CSSProperties = {
  color: "rgba(242,236,224,0.45)", fontSize: 13 }
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10
}
const card: React.CSSProperties = {
  border: "1px solid rgba(184,148,74,0.18)", borderRadius: 14, padding: 16,
  marginTop: 10, background: "rgba(255,255,255,0.02)"
}
const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 10px", fontSize: 10, letterSpacing: "0.16em",
  textTransform: "uppercase", color: "rgba(232,200,130,0.7)",
  borderBottom: "1px solid rgba(184,148,74,0.2)", fontWeight: 400
}
const td: React.CSSProperties = {
  padding: "10px", fontSize: 14, borderBottom: "1px solid rgba(184,148,74,0.08)"
  }
const btn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)",
  background: "rgba(255,255,255,0.05)", color: "#f2ece0", fontSize: 12,
  cursor: "pointer" }
const input: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(184,148,74,0.25)",
  background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 13,
  flex: 1, minWidth: 120
}
