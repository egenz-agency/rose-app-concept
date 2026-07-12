import type { Metadata } from "next"
import { LegalLayout, LEGAL, H2, P, UL, LI } from "@/components/legal/LegalLayout"

export const metadata: Metadata = { title: "Cookie Policy", robots: { index: true, follow: true } }

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <P>This policy explains how {LEGAL.serviceName} uses cookies and similar local-storage technologies.</P>

      <H2>What we use</H2>
      <UL>
        <LI><strong>Strictly necessary cookies</strong> — set by our authentication provider to keep you signed in to your dashboard. The Service cannot function without these, so they do not require consent.</LI>
        <LI><strong>Functional local storage</strong> — small values stored in your browser (not sent to advertisers) to remember experience preferences, such as whether the intro has been shown. This stays on your device.</LI>
      </UL>

      <H2>What we do NOT use</H2>
      <P>We do not currently use advertising cookies, cross-site trackers, or third-party analytics that profile you. Because we only use strictly necessary and functional storage, we do not show a consent wall. If we introduce analytics or marketing cookies in future, we will ask for your consent first and update this policy.</P>

      <H2>Payments</H2>
      <P>When you pay, our payment provider (e.g. Stripe) may set its own cookies necessary to process the transaction and prevent fraud. See their cookie/privacy notices for details.</P>

      <H2>Managing cookies &amp; storage</H2>
      <P>You can clear or block cookies and local storage in your browser settings. Blocking strictly necessary cookies will prevent you from signing in to the dashboard.</P>

      <H2>Contact</H2>
      <P>Questions? Email {LEGAL.privacyEmail}.</P>
    </LegalLayout>
  )
}
