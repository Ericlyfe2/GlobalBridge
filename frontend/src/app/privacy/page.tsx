import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const sections = [
  { id: "what-we-collect", title: "What we collect" },
  { id: "what-we-dont", title: "What we don\u2019t collect" },
  { id: "who-we-share-with", title: "Who we share with" },
  { id: "your-rights", title: "Your rights" },
  { id: "security", title: "Security" },
  { id: "contact-us", title: "Contact us" },
];

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
              <p className="mt-4 text-base text-ink-600 leading-relaxed max-w-2xl">
                GlobalBridge collects only what we need to help you study or work abroad safely.
                We never sell your data. This page explains exactly what we collect, why, and how to delete it.
              </p>
            </header>

            <Section id="what-we-collect" num="1" title="What we collect">
              <p>When you create an account or use GlobalBridge, we collect:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-3">
                <li><strong>Profile info:</strong> name, email, country of origin, target destination, field of study, language preference.</li>
                <li><strong>Verification documents:</strong> passport scan, study permit, or acceptance letter &mdash; only if you choose to submit them for verification. We keep them only as long as the review takes, then delete them.</li>
                <li><strong>Messages:</strong> 1:1 DMs are private &mdash; visible only to you and the person you&rsquo;re talking to. Forum posts are public by design.</li>
                <li><strong>Usage data:</strong> which pages you visit, which mentors you book, which scholarships you save. Used to improve matching.</li>
                <li><strong>Device &amp; IP:</strong> standard server logs, kept 30 days for security and abuse detection.</li>
              </ul>
            </Section>

            <hr className="legal-hr" />

            <Section id="what-we-dont" num="2" title="What we don&rsquo;t collect">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Your location (we don&rsquo;t track GPS).</li>
                <li>Cross-site advertising trackers (no Facebook Pixel, no Google Ads).</li>
                <li>Biometric data (face scans, fingerprints) &mdash; even when verifying ID, scans are run locally on device or once on our server then deleted.</li>
                <li>Health information beyond what&rsquo;s in a country&rsquo;s healthcare-setup guide.</li>
              </ul>
            </Section>

            <hr className="legal-hr" />

            <Section id="who-we-share-with" num="3" title="Who we share with">
              <p>We share your information only in these specific cases:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-3">
                <li><strong>Mentors / employers / landlords:</strong> only the profile info you choose to share. Your contact info stays hidden until you message them first.</li>
                <li><strong>Stripe / Paystack:</strong> payment info for transactions only. They handle PCI compliance.</li>
                <li><strong>SendGrid / Twilio:</strong> email and SMS delivery. Content is templated, no marketing.</li>
                <li><strong>Anthropic Claude:</strong> AI chats are sent to Anthropic for processing. Anthropic does not train on your data per their API ToS.</li>
                <li><strong>Law enforcement:</strong> only with a valid subpoena, and we publish an annual transparency report.</li>
              </ul>
              <div className="callout">
                <strong>We never sell your data.</strong> Ever. Not aggregated, not anonymized, not in any form.
              </div>
            </Section>

            <hr className="legal-hr" />

            <Section id="your-rights" num="4" title="Your rights">
              <p>You can at any time:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-3">
                <li><strong>Export</strong> your data as JSON via Settings &rarr; Privacy &rarr; Export.</li>
                <li><strong>Delete</strong> your account (and all data) via Settings &rarr; Danger zone.</li>
                <li><strong>Correct</strong> any info via Profile editor.</li>
                <li><strong>Object</strong> to specific data uses by emailing <a href="mailto:privacy@globalbridge.app" className="text-clay-600 hover:underline">privacy@globalbridge.app</a>.</li>
              </ul>
              <div className="callout mt-4">
                GDPR (EU), CCPA (California), and POPIA (South Africa) requests are honoured within 30 days.
              </div>
            </Section>

            <hr className="legal-hr" />

            <Section id="security" num="5" title="Security">
              <ul className="space-y-2">
                <li>All traffic is served over HTTPS (TLS 1.3).</li>
                <li>Passwords are hashed with bcrypt (cost factor 12) &mdash; we never store them in plain text.</li>
                <li>Every database query is parameterised and every input is validated on the server, so submitted data can&rsquo;t alter our queries.</li>
                <li>Login and AI endpoints are rate-limited to slow down abuse and credential-stuffing.</li>
              </ul>
              <p className="mt-4 text-ink-500">
                Still on our roadmap before public launch: two-factor authentication, an independent
                security audit, and encryption-at-rest for uploaded documents. We&rsquo;ll update this page as each ships.
              </p>
            </Section>

            <hr className="legal-hr" />

            <Section id="contact-us" num="6" title="Contact us">
              <p>Privacy questions, GDPR/CCPA requests, or to report a security issue:</p>
              <ul className="mt-4 space-y-2">
                <li><strong>Email:</strong> <a href="mailto:privacy@globalbridge.app" className="text-clay-600 hover:underline">privacy@globalbridge.app</a></li>
                <li><strong>Postal:</strong> GlobalBridge Privacy Office &middot; KNUST IT Department &middot; Kumasi, Ghana</li>
                <li><strong>EU representative:</strong> TBD (will be appointed before EU launch)</li>
              </ul>
            </Section>

            <hr className="legal-hr" />

            <p className="text-sm text-ink-500">
              See also: <Link href="/terms" className="text-clay-600 hover:underline">Terms of Service</Link> &middot; <Link href="/help" className="text-clay-600 hover:underline">Help Center</Link>
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
