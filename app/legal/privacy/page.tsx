import type { Metadata } from "next"
import { LegalLayout, LEGAL, H2, P, UL, LI } from "@/components/legal/LegalLayout"

export const metadata: Metadata = { title: "Privacy Policy", robots: { index: true, follow: true } }

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <P>This Privacy Policy explains how {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), operator of {LEGAL.serviceName} (the &ldquo;Service&rdquo;), collects and processes personal data. We are the data controller. Contact: {LEGAL.privacyEmail}.</P>

      <H2>Who this affects</H2>
      <P>Two kinds of people are involved: the <strong>buyer</strong> (who creates an account and a gift) and the <strong>recipient</strong> (the person the gift is for). The buyer provides some of the recipient&rsquo;s personal data (such as their name, photos, and messages). If you are a buyer, you confirm you have the right to provide that information and, where required, the recipient&rsquo;s consent. If you are a recipient and want your data removed, contact {LEGAL.privacyEmail}.</P>

      <H2>Data we collect</H2>
      <UL>
        <LI><strong>Account data:</strong> email address and authentication data (managed by our auth provider).</LI>
        <LI><strong>Gift content you provide:</strong> names, scheduled messages, letters, date invitations, and any photos, video, or audio you upload.</LI>
        <LI><strong>Usage &amp; technical data:</strong> visit records for the gift (dates, tending activity), and IP address / request metadata used for security and rate-limiting.</LI>
        <LI><strong>Payment data (when purchasing):</strong> processed by our payment provider (e.g. Stripe). We do not store full card details.</LI>
      </UL>

      <H2>Why we process it (lawful bases)</H2>
      <UL>
        <LI><strong>Performance of a contract</strong> — to create, host, and deliver your gift and account.</LI>
        <LI><strong>Legitimate interests</strong> — to keep the Service secure, prevent abuse, and operate our business.</LI>
        <LI><strong>Consent</strong> — where you provide optional content or where consent is otherwise required.</LI>
        <LI><strong>Legal obligation</strong> — to comply with tax, accounting, and legal requirements.</LI>
      </UL>

      <H2>Who we share it with (processors)</H2>
      <P>We share data only with service providers that help us run the Service, under data-processing terms:</P>
      <UL>
        <LI>Hosting &amp; application: Vercel.</LI>
        <LI>Database, authentication &amp; file storage: Supabase (hosted in the EU).</LI>
        <LI>Media delivery / storage (where used): Cloudflare.</LI>
        <LI>Payments: Stripe.</LI>
        <LI>Transactional email: our email provider.</LI>
      </UL>
      <P>We do not sell your personal data.</P>

      <H2>International transfers</H2>
      <P>Some providers may process data outside your country. Where data leaves the EEA/UK, we rely on appropriate safeguards such as Standard Contractual Clauses.</P>

      <H2>Retention</H2>
      <P>We keep gift and account data for as long as your account/gift is active. You can delete your account and all associated data at any time from your dashboard, or by emailing us. Backups and legally required records may persist for a limited period after deletion.</P>

      <H2>Your rights</H2>
      <P>Subject to applicable law (including the GDPR/UK GDPR), you have the right to access, rectify, erase, restrict, and port your data, and to object to certain processing. You can:</P>
      <UL>
        <LI>Edit or delete gift content from your dashboard.</LI>
        <LI>Delete your account and all data via <strong>Dashboard → Account → Delete account</strong>.</LI>
        <LI>Contact {LEGAL.privacyEmail} to exercise any right.</LI>
      </UL>
      <P>You may also lodge a complaint with your local data protection authority.</P>

      <H2>Security</H2>
      <P>We use encryption in transit, row-level data isolation between accounts, access controls, input validation, and rate limiting. No method is perfectly secure, but we take reasonable measures to protect your data.</P>

      <H2>Children</H2>
      <P>The Service is not directed at children. You must be at least 16 (or the age of digital consent in your country) to use it, and 18+ to make a purchase.</P>

      <H2>Changes</H2>
      <P>We may update this policy; we will revise the &ldquo;last updated&rdquo; date and, for material changes, take reasonable steps to notify you.</P>

      <H2>Contact</H2>
      <P>{LEGAL.operator}, {LEGAL.address}. Email: {LEGAL.privacyEmail}.</P>
    </LegalLayout>
  )
}
