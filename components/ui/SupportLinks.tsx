"use client"
import { useSyncExternalStore } from "react"
import { BugIcon, LetterIcon } from "./Icons"

// ────────────────────────────────────────────────────────────────────────────
// "Report a bug" / "Contact us".
//
// Both open the user's own mail client with a prefilled subject and body —
// no form, no inbox to build, no data stored by us. For a one-person operation
// that's the right trade: a support form needs a database table, an admin view,
// notification plumbing and spam handling, and buys nothing a mailto doesn't.
//
// The bug report is pre-filled with the context that otherwise costs two
// round-trips to obtain: what page they were on, their browser, screen size,
// whether they're in the installed app. Users almost never volunteer this, and
// without it "it didn't work" is unactionable.
//
// Nothing personal is collected — no email address, no account id. Everything
// in the body is visible to the user before they hit send, which is exactly the
// property a prefilled mailto should have.
// ────────────────────────────────────────────────────────────────────────────

const SUPPORT_EMAIL = "killiyan22@gmail.com"

// NOTE: deliberately no timestamp. This feeds a useSyncExternalStore snapshot,
// which must return an identical string on every call — a moving clock would
// make React re-render forever. The email carries its own send time anyway.
function diagnostics(context: string): string {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return [
    `Page: ${context}`,
    `URL: ${window.location.pathname}`,
    `Installed app: ${standalone ? "yes" : "no (browser tab)"}`,
    `Screen: ${window.innerWidth}×${window.innerHeight}`,
    `Browser: ${window.navigator.userAgent}`,
  ].join("\n")
}

function buildBugHref(context: string): string {
  const body = [
    "Tell us what happened, and what you expected instead:",
    "",
    "",
    "",
    "— — — — — — — — — — — — — — — —",
    "Technical details (helps us find it faster — feel free to delete):",
    diagnostics(context),
  ].join("\n")
  return (
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent("Bug report — The Enchanted Rose")}` +
    `&body=${encodeURIComponent(body)}`
  )
}

// Diagnostics need `window`, so they can't exist during SSR. useSyncExternalStore
// gives a plain server fallback and swaps in the real link after hydration,
// without a setState-in-effect cascade.
const noopSubscribe = () => () => {}
const plainMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Bug report — The Enchanted Rose")}`

export function SupportLinks({
  context = "the app",
  style
}: {
  /** Where the user is, so a report says so without them having to explain. */
  context?: string
  style?: React.CSSProperties
}) {
  const bugHref = useSyncExternalStore(
    noopSubscribe,
    () => buildBugHref(context),
    () => plainMailto
  )

  const contactHref =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent("Question — The Enchanted Rose")}` +
    `&body=${encodeURIComponent("Hello,\n\n")}`

  return (
    <div style={style}>
      {/* Hairline rule instead of a card: these are a footer utility, not a
          feature, and boxing them would give them more weight than they earn. */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 16 }} />

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <a className="ctl" href={bugHref} style={pill}>
          <BugIcon size={15} />
          Report a bug
        </a>
        <a className="ctl" href={contactHref} style={pill}>
          <LetterIcon size={15} />
          Contact us
        </a>
      </div>

      <p style={caption}>
        Opens your email app — nothing is sent until you press send.
      </p>
    </div>
  )
}

// Real pressable targets rather than inline text. These are the last resort
// when something has gone wrong, so they need to look reliably tappable on a
// phone (44px-ish) rather than being a 12px link someone has to aim at.
const pill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "10px 18px", borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--bg-surface)",
  color: "rgba(242,236,224,0.72)",
  fontSize: 13, textDecoration: "none",
  cursor: "pointer"
}

const caption: React.CSSProperties = {
  margin: "10px 0 0", textAlign: "center",
  fontSize: 11, lineHeight: 1.6,
  color: "var(--ivory-ghost)"
  }
