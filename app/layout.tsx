import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PWARegister } from "@/components/ui/PWARegister"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://the-enchanted-rose.vercel.app"),
  title: "The Enchanted Rose",
  description: "A magical living rose — care for it every day and watch it grow.",
  applicationName: "Stella's Rose",
  appleWebApp: {
    capable: true,
    title: "Stella's Rose",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "The Enchanted Rose",
    description: "A magical living rose — care for it every day and watch it grow.",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Enchanted Rose",
    description: "A magical living rose — care for it every day and watch it grow.",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0205",
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" style={{ background: "#0a0205" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
