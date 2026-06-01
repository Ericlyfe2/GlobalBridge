import Link from "next/link";
import { Scale, AlertTriangle, FileText, Ban, Gavel } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="max-w-3xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <header className="mb-10">
          <span className="badge badge-clay mb-3 inline-flex"><Scale size={11} /> Legal</span>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-ink-900 tracking-tight">Terms of Service</h1>
          <p className="text-sm text-ink-500 mt-2">Last updated: April 12, 2026 · Effective: May 1, 2026</p>
        </header>

        <p className="text-base text-ink-700 leading-relaxed mb-10">
          Welcome to GlobalBridge. By creating an account, you agree to the terms below. They&apos;re written in plain English where possible.
        </p>

        <Section icon={<FileText size={16} />} title="1. What GlobalBridge is">

          <p>
            GlobalBridge is an information + community platform for international students and immigrants.
            We provide guidance, verified listings, AI assistance, and mentor matching.
            <strong> We are not a law firm, immigration consultancy, university, or government agency.</strong>
            We do not file visa applications on your behalf.
          </p>
        </Section>

        <Section icon={<AlertTriangle size={16} />} title="2. AI guidance — limits">
          <p>
            Our AI Visa Assistant provides general information, not legal advice. AI responses may contain errors.
            Always verify any rule, fee, or deadline on the official government website (we cite the URL in every answer).
            Acting solely on AI guidance is at your own risk. For complex cases (refugee claims, criminal record waivers, appeals),
            consult a licensed immigration lawyer.
          </p>
        </Section>

        <Section icon={<FileText size={16} />} title="3. User content & responsibility">
          <p>You agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Provide accurate info during signup + verification.</li>
            <li>Not impersonate others.</li>
            <li>Not post hate speech, spam, harassment, illegal content, or scam offers.</li>
            <li>Not scrape, reverse-engineer, or resell the platform.</li>
            <li>Respect mentors&apos; time — no-shows beyond 2 incur a 30-day booking cooldown.</li>
          </ul>
          <p className="mt-3">
            You retain ownership of content you post. By posting, you grant GlobalBridge a non-exclusive license to display + moderate it on the platform.
          </p>
        </Section>

        <Section icon={<Ban size={16} />} title="4. Account suspension + termination">
          <p>
            We may suspend or terminate accounts that violate these terms or our community policy.
            Severe violations (fraud, scams, harassment) → immediate termination + data forwarded to relevant authorities.
            You can appeal any decision via <a href="mailto:appeals@globalbridge.app" className="text-clay-600 hover:underline">appeals@globalbridge.app</a> within 30 days.
          </p>
        </Section>

        <Section icon={<Scale size={16} />} title="5. Payments + refunds">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Verified subscription</strong>: 14-day no-questions refund. Cancel any time; takes effect end of cycle.</li>
            <li><strong>Mentor sessions</strong>: free for verified students. Cancellations &gt; 4 hours ahead are free; later cancellations still credit the mentor.</li>
            <li><strong>Housing deposits</strong>: held in Stripe Connect escrow, released to landlord on move-in confirmation. Disputes handled via <Link href="/help" className="text-clay-600 hover:underline">support</Link>.</li>
          </ul>
        </Section>

        <Section icon={<AlertTriangle size={16} />} title="6. Third-party content + listings">
          <p>
            Housing, scholarships, and job listings are submitted by verified users. We screen, but we&apos;re not a party to any transaction.
            We don&apos;t guarantee outcomes. Use the verified badge as a strong signal, not absolute proof.
            Report suspicious listings via the red Report button.
          </p>
        </Section>

        <Section icon={<Gavel size={16} />} title="7. Liability + disclaimers">
          <p>
            GlobalBridge is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we&apos;re not liable for:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Visa or scholarship rejections.</li>
            <li>Losses from acting on AI or community guidance without verification.</li>
            <li>Third-party scams that bypass our moderation (but we work hard to prevent them).</li>
            <li>Loss of data from your end (we recommend exports + backups).</li>
          </ul>
          <p className="mt-3">
            Our total liability for any claim is capped at the amount you&apos;ve paid us in the past 12 months (or $50 USD, whichever is greater).
          </p>
        </Section>

        <Section icon={<Gavel size={16} />} title="8. Governing law">
          <p>
            These terms are governed by the laws of Ghana, with any disputes resolved in the Kumasi High Court.
            EU residents: GDPR rights are preserved. UK residents: ICO oversight applies.
          </p>
        </Section>

        <Section icon={<FileText size={16} />} title="9. Changes">
          <p>
            We&apos;ll notify you 30 days before any material change to these terms.
            If you don&apos;t agree, you can cancel your account before the new terms take effect with a full prorated refund.
          </p>
        </Section>

        <p className="mt-12 text-xs text-ink-500">
          See also: <Link href="/privacy" className="text-clay-600 hover:underline">Privacy Policy</Link> · <Link href="/help" className="text-clay-600 hover:underline">Help Center</Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink-900 mb-4">
        <span className="text-clay-500">{icon}</span> {title}
      </h2>
      <div className="text-sm text-ink-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
