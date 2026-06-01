import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Globe, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="max-w-3xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <header className="mb-10">
          <span className="badge badge-clay mb-3 inline-flex"><Shield size={11} /> Legal</span>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-ink-900 tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-ink-500 mt-2">Last updated: April 12, 2026 · Effective: May 1, 2026</p>
        </header>

        <p className="text-base text-ink-700 leading-relaxed mb-10">
          GlobalBridge collects only what we need to help you study or work abroad safely.
          We never sell your data. This page explains exactly what we collect, why, and how to delete it.
        </p>

        <Section icon={<Eye size={16} />} title="What we collect">
          <p>When you create an account or use GlobalBridge, we collect:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Profile info</strong>: name, email, country of origin, target destination, field of study, language preference.</li>
            <li><strong>Verification documents</strong>: passport scan, study permit, or acceptance letter — only if you choose to submit them for verification. We keep them only as long as the review takes, then delete them.</li>
            <li><strong>Messages</strong>: 1:1 DMs are private — visible only to you and the person you're talking to. Forum posts are public by design.</li>
            <li><strong>Usage data</strong>: which pages you visit, which mentors you book, which scholarships you save. Used to improve matching.</li>
            <li><strong>Device + IP</strong>: standard server logs, kept 30 days for security + abuse detection.</li>
          </ul>
        </Section>

        <Section icon={<Lock size={16} />} title="What we don't collect">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Your location (we don&apos;t track GPS).</li>
            <li>Cross-site advertising trackers (no Facebook Pixel, no Google Ads).</li>
            <li>Biometric data (face scans, fingerprints) — even when verifying ID, scans are run locally on device or once on our server then deleted.</li>
            <li>Health information beyond what&apos;s in a country&apos;s healthcare-setup guide.</li>
          </ul>
        </Section>

        <Section icon={<Globe size={16} />} title="Who we share with">
          <p>We share your information only in these specific cases:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Mentors / employers / landlords</strong>: only the profile info you choose to share. Your contact info stays hidden until you message them first.</li>
            <li><strong>Stripe / Paystack</strong>: payment info for transactions only. They handle PCI compliance.</li>
            <li><strong>SendGrid / Twilio</strong>: email + SMS delivery. Content is templated, no marketing.</li>
            <li><strong>Anthropic Claude</strong>: AI chats are sent to Anthropic for processing. Anthropic does not train on your data per their API ToS.</li>
            <li><strong>Law enforcement</strong>: only with a valid subpoena, AND we publish an annual transparency report.</li>
          </ul>
          <p className="mt-3">
            <strong>We never sell your data.</strong> Ever. Not aggregated, not anonymized, not in any form.
          </p>
        </Section>

        <Section icon={<Trash2 size={16} />} title="Your rights">
          <p>You can at any time:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Export</strong> your data as JSON via Settings → Privacy → Export.</li>
            <li><strong>Delete</strong> your account (and all data) via Settings → Danger zone.</li>
            <li><strong>Correct</strong> any info via Profile editor.</li>
            <li><strong>Object</strong> to specific data uses by emailing <a href="mailto:privacy@globalbridge.app" className="text-clay-600 hover:underline">privacy@globalbridge.app</a>.</li>
          </ul>
          <p className="mt-3">
            GDPR (EU), CCPA (California), and POPIA (South Africa) requests are honored within 30 days.
          </p>
        </Section>

        <Section icon={<Lock size={16} />} title="Security">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>All traffic is served over HTTPS (TLS).</li>
            <li>Passwords are hashed with bcrypt (cost factor 12) — we never store them in plain text.</li>
            <li>Every database query is parameterized and every input is validated on the server, so submitted data can&apos;t alter our queries.</li>
            <li>Login and AI endpoints are rate-limited to slow down abuse and credential-stuffing.</li>
          </ul>
          <p className="mt-3">
            Still on our roadmap before public launch: two-factor authentication, an independent
            security audit, and encryption-at-rest for uploaded documents. We&apos;ll update this page as each ships.
          </p>
        </Section>

        <Section icon={<Mail size={16} />} title="Contact us">
          <p>Privacy questions, GDPR/CCPA requests, or to report a security issue:</p>
          <ul className="mt-3 space-y-1.5">
            <li><strong>Email</strong>: <a href="mailto:privacy@globalbridge.app" className="text-clay-600 hover:underline">privacy@globalbridge.app</a></li>
            <li><strong>Postal</strong>: GlobalBridge Privacy Office · KNUST IT Department · Kumasi, Ghana</li>
            <li><strong>EU representative</strong>: TBD (will be appointed before EU launch)</li>
          </ul>
        </Section>

        <p className="mt-12 text-xs text-ink-500">
          See also: <Link href="/terms" className="text-clay-600 hover:underline">Terms of Service</Link> · <Link href="/help" className="text-clay-600 hover:underline">Help Center</Link>
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
