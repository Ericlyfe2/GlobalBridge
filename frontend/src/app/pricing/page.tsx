import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for GlobalBridge — AI visa guidance, verified housing, mentorship, and career tools for international students and immigrants.",
  alternates: { canonical: "/pricing" },
};

type Tier = {
  name: string; price: string; cadence: string; tagline: string;
  cta: string; ctaHref: string; featured?: boolean;
  icon: React.ReactNode; tone: string;
  features: { label: string; included: boolean | string }[];
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0", cadence: "forever",
    tagline: "Everything you need to land in your new country safely.",
    cta: "Get started", ctaHref: "/register",
    icon: <Sparkles size={18} />, tone: "bg-cream-200 text-ink-700",
    features: [
      { label: "Browse all verified opportunities + housing", included: true },
      { label: "AI Visa Assistant (100 messages/month)", included: true },
      { label: "Forums + scam alerts", included: true },
      { label: "Toolkit (cost calc, banking, healthcare, SOS)", included: true },
      { label: "Apply to housing + jobs", included: true },
      { label: "Profile verification badge", included: true },
      { label: "Mentor 1:1 video sessions", included: "2 / month" },
      { label: "AI Document Validity Checker", included: "3 / month" },
      { label: "Scholarship Matcher", included: true },
      { label: "Priority mentor matching", included: false },
      { label: "Resume Builder PDF export (watermarked)", included: true },
      { label: "Early access to new opportunities", included: false },
    ],
  },
  {
    name: "Verified",
    price: "$9", cadence: "/month",
    tagline: "For students who need ongoing support.",
    cta: "Upgrade", ctaHref: "/register?plan=verified", featured: true,
    icon: <ShieldCheck size={18} />, tone: "bg-clay-500 text-white",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Unlimited AI Visa Assistant", included: true },
      { label: "Unlimited Document Checker", included: true },
      { label: "Unlimited mentor 1:1 sessions", included: true },
      { label: "Priority mentor matching (within 24h)", included: true },
      { label: "Resume Builder — no watermark", included: true },
      { label: "AI Application Coach (essay scoring)", included: true },
      { label: "Peer Review System (full access)", included: true },
      { label: "Early access to verified scholarships", included: true },
      { label: "WhatsApp deadline reminders", included: true },
      { label: "Translation: 50+ languages", included: true },
      { label: "Verified badge + higher trust score", included: true },
    ],
  },
  {
    name: "Institution",
    price: "Custom", cadence: "/year",
    tagline: "For universities, recruiters, and partner organizations.",
    cta: "Talk to sales", ctaHref: "/contact?topic=institution",
    icon: <Zap size={18} />, tone: "bg-slate-900 text-white",
    features: [
      { label: "Everything in Verified", included: true },
      { label: "Bulk student onboarding (CSV import)", included: true },
      { label: "Dedicated admin dashboard + analytics", included: true },
      { label: "Co-branded landing page", included: true },
      { label: "API access (listings, applicants)", included: true },
      { label: "Custom AI knowledge base (your visa rules)", included: true },
      { label: "Single sign-on (SSO/SAML)", included: true },
      { label: "Dedicated success manager", included: true },
      { label: "Custom verification workflows", included: true },
      { label: "99.9% uptime SLA", included: true },
      { label: "Priority Slack channel", included: true },
      { label: "Pilot deployment support", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="badge badge-clay mb-3">Pricing</span>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-ink-900 tracking-tight">
            Free for students. Paid by employers + institutions.
          </h1>
          <p className="mt-4 text-lg text-ink-600">
            We never charge applicants for visa or scholarship info. Premium unlocks unlimited AI + priority mentor matching.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <article key={t.name} className={`card flex flex-col ${t.featured ? "border-clay-500 ring-1 ring-clay-500" : ""}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.tone}`}>{t.icon}</div>
                <h2 className="font-display text-xl font-semibold text-ink-900">{t.name}</h2>
                {t.featured && <span className="badge badge-verified ml-auto">Most popular</span>}
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-display font-semibold text-ink-900">{t.price}</span>
                <span className="text-sm text-ink-500">{t.cadence}</span>
              </div>
              <p className="text-sm text-ink-600 mb-6">{t.tagline}</p>

              <Link href={t.ctaHref} className={`${t.featured ? "btn-accent" : "btn-ghost border border-cream-300"} w-full text-sm justify-center`}>
                {t.cta}
              </Link>

              <ul className="mt-6 space-y-2 text-sm text-ink-700">
                {t.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included === false ? (
                      <X size={14} className="text-ink-400 mt-0.5 shrink-0" />
                    ) : (
                      <Check size={14} className="text-leaf-600 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included === false ? "text-ink-500" : ""}>
                      {f.label}
                      {typeof f.included === "string" && (
                        <span className="text-xs text-clay-600 font-medium ml-1.5">({f.included})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* FAQ */}
        <section className="mt-20 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Pricing FAQ</h2>
          <div className="space-y-4">
            {[
              { q: "Is GlobalBridge really free for students?", a: "Yes. We commit to keeping core visa guidance, opportunity listings, scam alerts, and basic AI free forever. Verified tier is optional and exists to support the platform." },
              { q: "Can I downgrade later?", a: "Yes, any time. Downgrades take effect at the end of the current billing cycle. No questions asked." },
              { q: "Do you offer scholarships / free Verified?", a: "Yes. Students from low-income countries can apply for sponsored Verified access via the application form on /contact." },
              { q: "What payment methods do you accept?", a: "Cards via Stripe (most countries). Paystack for Nigeria, Ghana, Kenya. M-Pesa support coming Q3 2026." },
              { q: "Is my data sold to advertisers?", a: "No. Read our /privacy policy — your profile, documents, and chats are never sold or shared with third parties." },
            ].map((f) => (
              <details key={f.q} className="card group">
                <summary className="cursor-pointer font-medium text-ink-900 list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-clay-500 group-open:rotate-180 transition">▾</span>
                </summary>
                <p className="text-sm text-ink-600 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </section>

      <Footer />
    </div>
  );
}
