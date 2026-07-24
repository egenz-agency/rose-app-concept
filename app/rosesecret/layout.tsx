import type { Metadata } from "next"

// Give /rosesecret its OWN installable identity ("Rose Keeper"), separate from
// the rose experience at "/". Installing from this route — or Add to Home Screen
// on iOS — lands on the admin panel instead of her rose.
export const metadata: Metadata = {
  title: "Rose Keeper",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Rose Keeper",
    statusBarStyle: "black-translucent",
  },
}

export default function RoseSecretLayout({ children }: { children: React.ReactNode }) {
  return children
}
