import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Private gift",
}

// Shown when someone reaches a gift without the secret link (or with a bad/expired
// one). Deliberately vague — it never confirms whether a given gift exists.
export default function GiftUnavailable() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0205",
        color: "#f2ece0",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 380 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🌹</div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 28,
            margin: "0 0 12px",
          }}
        >
          This gift is private
        </h1>
        <p
          style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(242,236,224,0.6)",
            margin: 0,
          }}
        >
          Please open it using the personal link you were sent. If the link isn&rsquo;t
          working, ask the person who gave you this gift to share it again.
        </p>
      </div>
    </div>
  )
}
