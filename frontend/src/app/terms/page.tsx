import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of GlobalBridge — the platform for international students and immigrants studying, working, and settling abroad.",
  alternates: { canonical: "/terms" },
};

const sections = [
  { id: "what-we-are", title: "What GlobalBridge is" },
  { id: "ai-limits", title: "AI guidance" },
  { id: "user-content", title: "User content & responsibility" },
  { id: "suspension", title: "Account suspension" },
  { id: "payments", title: "Payments & refunds" },
  { id: "third-party", title: "Third-party content" },
  { id: "liability", title: "Liability & disclaimers" },
  { id: "governing-law", title: "Governing law" },
  { id: "changes", title: "Changes" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-16">

          {/* ── Sidebar TOC ── */}
          <aside className="hidden lg:block">
            <nav className="legal-nav">
              <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-3">Sections</p>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>{s.title}</a>
              ))}
            </nav>
          </aside>

          {/* ── Main content ── */}
          <div>
            <header className="mb-14">
              <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-3">Updated April 12, 2026 &middot; Effective May 1, 2026</p>
              <h1 className="text-4xl md:text-5xl font-display font-medium text-ink-900 tracking-tight leading-[1.08]">
                Terms of Service
              </h1>
              <p className="mt-4 text-base text-ink-600 leading-relaxed max-w-2xl">
                Welcome to GlobalBridge. By creating an account, you agree to the terms below.
                They&rsquo;re written in plain English where possible.
              </p>
            </header>

            <Section id="what-we-are" num="1" title="What GlobalBridge is">
              <p>
                GlobalBridge is an information and community platform for international students and immigrants.
                We provide guidance, verified listings, AI assistance, and mentor matching.
              </p>
              <div className="callout">
                <strong>We are not a law firm, immigration consultancy, university, or government agency.</strong>
                We do not file visa applications on your behalf.
              </div>
            </Section>

            <hr className="legal-hr" />

            <Section id="ai-limits" num="2" title="AI guidance &mdash; limits">
              <p>
                Our AI Visa Assistant provides general information, not legal advice. AI responses may contain errors.
                Always verify any rule, fee, or deadline on the official government website (we cite the URL in every answer).
              </p>
              <p className="mt-3">
                Acting solely on AI guidance is at your own risk. For complex cases (refugee claims, criminal record waivers, appeals),
                consult a licensed immigration lawyer.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="user-content" num="3" title="User content &amp; responsibility">
              <p>You agree to:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-3">
                <li>Provide accurate info during signup and verification.</li>
                <li>Not impersonate others.</li>
                <li>Not post hate speech, spam, harassment, illegal content, or scam offers.</li>
                <li>Not scrape, reverse-engineer, or resell the platform.</li>
                <li>Respect mentors&rsquo; time &mdash; no-shows beyond 2 incur a 30-day booking cooldown.</li>
              </ul>
              <p className="mt-4">
                You retain ownership of content you post. By posting, you grant GlobalBridge a non-exclusive license to display and moderate it on the platform.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="suspension" num="4" title="Account suspension &amp; termination">
              <p>
                We may suspend or terminate accounts that violate these terms or our community policy.
                Severe violations (fraud, scams, harassment) lead to immediate termination and data forwarded to relevant authorities.
              </p>
              <p className="mt-3">
                You can appeal any decision via <a href="mailto:appeals@globalbridge.app" className="text-clay-600 hover:underline">appeals@globalbridge.app</a> within 30 days.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="payments" num="5" title="Payments &amp; refunds">
              <ul className="space-y-3">
                <li><strong>Verified subscription:</strong> 14-day no-questions refund. Cancel any time; takes effect end of cycle.</li>
                <li><strong>Mentor sessions:</strong> free for verified students. Cancellations &gt; 4 hours ahead are free; later cancellations still credit the mentor.</li>
                <li><strong>Housing deposits:</strong> held in Stripe Connect escrow, released to landlord on move-in confirmation. Disputes handled via <Link href="/help" className="text-clay-600 hover:underline">support</Link>.</li>
              </ul>
            </Section>

            <hr className="legal-hr" />

            <Section id="third-party" num="6" title="Third-party content &amp; listings">
              <p>
                Housing, scholarships, and job listings are submitted by verified users. We screen, but we&rsquo;re not a party to any transaction.
                We don&rsquo;t guarantee outcomes. Use the verified badge as a strong signal, not absolute proof.
              </p>
              <p className="mt-3">
                Report suspicious listings via the red Report button.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="liability" num="7" title="Liability &amp; disclaimers">
              <p>
                GlobalBridge is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we&rsquo;re not liable for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-3">
                <li>Visa or scholarship rejections.</li>
                <li>Losses from acting on AI or community guidance without verification.</li>
                <li>Third-party scams that bypass our moderation (but we work hard to prevent them).</li>
                <li>Loss of data from your end (we recommend exports and backups).</li>
              </ul>
              <div className="callout mt-4">
                Our total liability for any claim is capped at the amount you&rsquo;ve paid us in the past 12 months (or $50 USD, whichever is greater).
              </div>
            </Section>

            <hr className="legal-hr" />

            <Section id="governing-law" num="8" title="Governing law">
              <p>
                These terms are governed by the laws of Ghana, with any disputes resolved in the Kumasi High Court.
                EU residents: GDPR rights are preserved. UK residents: ICO oversight applies.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="changes" num="9" title="Changes">
              <p>
                We&rsquo;ll notify you 30 days before any material change to these terms.
                If you don&rsquo;t agree, you can cancel your account before the new terms take effect with a full prorated refund.
              </p>
            </Section>

            <hr className="legal-hr" />

            <p className="text-sm text-ink-500">
              See also: <Link href="/privacy" className="text-clay-600 hover:underline">Privacy Policy</Link> &middot; <Link href="/help" className="text-clay-600 hover:underline">Help Center</Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="section-number">{num}</div>
      <h2 className="font-display text-2xl md:text-3xl font-medium text-ink-900 tracking-tight mb-4">{title}</h2>
      <div className="text-sm md:text-base text-ink-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
