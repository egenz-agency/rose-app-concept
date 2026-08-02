import type { ReactNode } from "react"
import Link from "next/link"

// Shared shell for the legal pages. Inline styles (the project's Tailwind
// padding utilities are globally zeroed — see reference note).

// Trader identity. EU consumer law requires a trader to be identifiable, and
// GDPR requires the data controller to be named — so these are published on the
// legal pages and must stay accurate.
export const LEGAL = {
  serviceName: "Stella's Rose",
  operator: "Iliyan Tachev",
  address: "zhk. Levski V, bl. 26, Sofia, Bulgaria",
  country: "Bulgaria",
  contactEmail: "killiyan22@gmail.com",
  privacyEmail: "killiyan22@gmail.com",
  website: "rose-app-multitenant.vercel.app",
  lastUpdated: "1 August 2026",
}

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={{ height: "100dvh", overflowY: "auto", background: "#0a0205", color: "rgba(242,236,224,0.82)", fontFamily: "'EB Garamond', Georgia, serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 22px 90px" }}>
        <Link href="/" style={{ color: "rgba(232,200,130,0.75)", fontSize: 13, textDecoration: "none" }}>← Back</Link>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 34, color: "#f2ece0", margin: "18px 0 6px" }}>{title}</h1>
        <p style={{ fontSize: 13, color: "rgba(242,236,224,0.4)", marginBottom: 8 }}>Last updated: {LEGAL.lastUpdated}</p>

        <div style={{ fontSize: 12, color: "rgba(232,200,130,0.7)", background: "rgba(184,148,74,0.08)", border: "1px solid rgba(184,148,74,0.2)", borderRadius: 10, padding: "10px 14px", margin: "10px 0 26px" }}>
          Template — replace the bracketed details and have it reviewed by a qualified lawyer before you sell.
        </div>

        <div style={{ fontSize: 15.5, lineHeight: 1.75 }}>{children}</div>

        <nav style={{ marginTop: 40, paddingTop: 18, borderTop: "1px solid rgba(184,148,74,0.14)", display: "flex", gap: 18, fontSize: 13 }}>
          <Link href="/legal/privacy" style={link}>Privacy</Link>
          <Link href="/legal/terms" style={link}>Terms</Link>
          <Link href="/legal/cookies" style={link}>Cookies</Link>
        </nav>
      </div>
    </main>
  )
}

const link = { color: "rgba(242,236,224,0.55)", textDecoration: "none" }

export function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f2ece0", margin: "28px 0 8px" }}>{children}</h2>
}
export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 12px" }}>{children}</p>
}
export function UL({ children }: { children: ReactNode }) {
  return <ul style={{ margin: "0 0 12px", paddingLeft: 22, listStyle: "disc" }}>{children}</ul>
}
export function LI({ children }: { children: ReactNode }) {
  return <li style={{ margin: "0 0 6px" }}>{children}</li>
}
