import type { Metadata } from "next"
import { LegalLayout, LEGAL, H2, P, UL, LI } from "@/components/legal/LegalLayout"

export const metadata: Metadata = { title: "Terms of Service", robots: { index: true, follow: true } }

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <P>These Terms govern your use of {LEGAL.serviceName} (the &ldquo;Service&rdquo;), operated by {LEGAL.operator}. By using the Service you agree to these Terms.</P>

      <H2>Eligibility</H2>
      <P>You must be at least 18 years old to purchase, and at least 16 (or the age of digital consent where you live) to use the Service. By using it, you represent that you meet these requirements.</P>

      <H2>The Service</H2>
      <P>The Service lets you create a personalised digital &ldquo;rose&rdquo; gift with messages, letters, invitations, media, and a daily interaction, accessible via a private link you share with a recipient.</P>

      <H2>Your account</H2>
      <P>You are responsible for your account and for keeping your credentials secure. Notify us of any unauthorised use.</P>

      <H2>Your content and acceptable use</H2>
      <P>You retain ownership of the content you create or upload. You grant us a limited licence to host, process, and display it solely to operate the Service. You agree not to upload or create content that:</P>
      <UL>
        <LI>is illegal, harassing, threatening, hateful, or sexually exploitative;</LI>
        <LI>infringes anyone&rsquo;s intellectual-property, privacy, or publicity rights;</LI>
        <LI>contains malware or attempts to breach security, scrape, or overload the Service.</LI>
      </UL>
      <P><strong>Recipient data:</strong> when you include another person&rsquo;s name, photos, likeness, or other information, you confirm you have the right to do so and, where required, their consent. You are responsible for that content.</P>
      <P>We may remove content or suspend accounts that violate these Terms. To report abuse or an infringement, contact {LEGAL.contactEmail}.</P>

      <H2>Payments and how long a gift lasts</H2>
      <UL>
        <LI>A gift is a <strong>single payment</strong> that keeps it live for <strong>one year</strong> from the date of purchase. The price is shown at checkout and includes any tax we are required to collect.</LI>
        <LI><strong>There is no automatic renewal.</strong> We will never charge you again without you choosing to buy. Nothing to cancel.</LI>
        <LI>When the year ends, the private gift link stops working. Everything you created stays in your account, and buying another year brings the same link back to life.</LI>
        <LI>You can build and edit a gift for free. Payment is what makes the private link work.</LI>
        <LI>Reasonable fair-use and media-storage limits apply. Payments are processed by our payment provider, Stripe.</LI>
      </UL>

      <H2>Refunds &amp; right of withdrawal</H2>
      <P>If you are an EU/UK consumer, you normally have a <strong>14-day right of withdrawal</strong> for digital services bought at a distance.</P>
      <P>Because a gift becomes usable the moment you pay, we ask you at checkout to expressly request that we begin immediately and to acknowledge that <strong>you lose the 14-day right of withdrawal once the gift link goes live</strong>. You give that consent by ticking the box at checkout; if you would rather keep the full 14 days, do not complete the purchase.</P>
      <P>After that point, we refund where <strong>something is wrong on our side</strong> — the gift or the Service does not work as described and we cannot put it right for you in reasonable time. Contact {LEGAL.contactEmail} and tell us what went wrong; we would always rather fix it than lose you.</P>
      <P>If we refund a purchase, the year it paid for ends immediately: the private gift link is permanently deleted, any uploaded video or music stops being reachable, and notifications to the recipient stop. Your account and everything you wrote are kept. If you buy again afterwards we issue a <strong>new</strong> link — the refunded one never works again.</P>
      <P>None of this limits rights you have by law that cannot be limited, including for services that are faulty, not as described, or not supplied.</P>

      <H2>Availability &amp; disclaimer</H2>
      <P>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We do not warrant uninterrupted or error-free operation. To the maximum extent permitted by law, we disclaim implied warranties.</P>

      <H2>Limitation of liability</H2>
      <P>To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages, and our total liability is limited to the amount you paid in the 12 months before the claim. Nothing limits liability that cannot be limited by law.</P>

      <H2>Termination</H2>
      <P>You may stop using the Service and delete your account at any time. We may suspend or terminate access for violations of these Terms or misuse.</P>

      <H2>Changes</H2>
      <P>We may update these Terms; continued use after changes means you accept them.</P>

      <H2>Governing law</H2>
      <P>These Terms are governed by the laws of {LEGAL.country}, without regard to conflict-of-law rules, subject to any mandatory consumer protections in your country of residence.</P>

      <H2>Contact</H2>
      <P>{LEGAL.operator}, {LEGAL.address}. Email: {LEGAL.contactEmail}.</P>
    </LegalLayout>
  )
}
