"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LifeBuoy, Search, MessageCircle, Mail, AlertOctagon, Bot, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Topic = "all" | "account" | "visa" | "housing" | "jobs" | "payments" | "safety";

const faqs: { topic: Exclude<Topic, "all">; q: string; a: string }[] = [
  { topic: "account",  q: "How do I sign up?",                          a: "Click 'Get started' on the home page. Pick your role (Student / Mentor / Employer), fill 4 fields, done. Email verification arrives in 30 seconds." },
  { topic: "account",  q: "How do I delete my account?",                a: "Settings → Danger zone → Delete account. Removes your profile, messages, applications. Cannot be undone." },
  { topic: "account",  q: "What's the verification badge?",             a: "A trust signal we issue after confirming your identity (ID + status documents). Mentors with a badge appear higher in search. See /dashboard/verification." },

  { topic: "visa",     q: "Does GlobalBridge process my visa for me?",  a: "No. We provide guidance, document checklists, and verified mentor support. The official visa application is always done via the destination country's government portal." },
  { topic: "visa",     q: "Why does the AI assistant say 'verify with official source'?",  a: "Immigration rules change frequently. Even when our AI is confident, the law is what's on the gov website. We cite the source URL so you can double-check." },
  { topic: "visa",     q: "Can I escalate to a human?",                  a: "Yes. In any AI chat, type 'connect me to a mentor' and we'll match you with a verified mentor within 24h based on your origin → destination pair." },

  { topic: "housing",  q: "How do you verify landlords?",                a: "Multi-step: government ID, proof of ownership, video walk-through, and one positive review from a verified previous tenant. Landlords without the badge can't post." },
  { topic: "housing",  q: "What if a verified landlord scams me?",       a: "Report immediately via the listing. Our admin team reviews within 4 hours. Verified deposits are held in escrow via Stripe — we can reverse if fraud is confirmed." },

  { topic: "jobs",     q: "Are all listed jobs visa-sponsoring?",        a: "We mark each listing with whether the employer has a sponsorship history. The 'Sponsorship Tracker' page shows actual sponsored counts from the past 12 months." },
  { topic: "jobs",     q: "Can I apply if I don't have my permit yet?",  a: "Yes — most listings accept conditional applications. Be upfront about your visa timeline; sponsoring employers will work with you." },

  { topic: "payments", q: "What payment methods are accepted?",          a: "Cards via Stripe (most countries). Paystack for Nigeria, Ghana, Kenya. M-Pesa support coming Q3 2026." },
  { topic: "payments", q: "Do you charge transaction fees?",             a: "We don't take a cut of mentor sessions for Free tier. For housing deposits via Stripe Connect, there's a 0.5% fee to cover escrow." },
  { topic: "payments", q: "Can I get a refund on Verified subscription?",a: "Yes, within 14 days of purchase, no questions asked. Email billing@globalbridge.app." },

  { topic: "safety",   q: "How do I report a scam?",                      a: "Three ways: red 'Report' button on any listing/DM, the /scam-alerts page, or email safety@globalbridge.app. We action verified scams within 4 hours." },
  { topic: "safety",   q: "Is my data secure?",                           a: "Encryption at rest + in transit. SOC 2 Type II audit in progress (Q3 2026). Read full security details in /privacy." },
  { topic: "safety",   q: "Can mentors see my real identity?",            a: "Only your display name + verified country. Mentors don't see your address, ID number, or payment details. Anonymous (safe-space) forum hides even your account." },
];

const topics: { key: Topic; label: string; count: number }[] = [
  { key: "all",       label: "All",               count: faqs.length },
  { key: "account",   label: "Account",           count: faqs.filter((f) => f.topic === "account").length },
  { key: "visa",      label: "Visa & AI",         count: faqs.filter((f) => f.topic === "visa").length },
  { key: "housing",   label: "Housing",           count: faqs.filter((f) => f.topic === "housing").length },
  { key: "jobs",      label: "Jobs",              count: faqs.filter((f) => f.topic === "jobs").length },
  { key: "payments",  label: "Payments",          count: faqs.filter((f) => f.topic === "payments").length },
  { key: "safety",    label: "Safety & privacy",  count: faqs.filter((f) => f.topic === "safety").length },
];

export default function HelpPage() {
  const [topic, setTopic] = useState<Topic>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (topic !== "all" && f.topic !== topic) return false;
      if (q && !`${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [topic, q]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="max-w-5xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="badge badge-clay mb-3 inline-flex"><LifeBuoy size={11} /> Help center</span>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-ink-900 tracking-tight">
            How can we help?
          </h1>
          <p className="mt-3 text-lg text-ink-600">Search common questions or ping us directly.</p>
        </div>

        {/* Search */}
        <div className="relative mt-8 max-w-2xl mx-auto">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-11 py-3.5 text-base"
            placeholder="Search by keyword — e.g. visa, refund, sponsor"
          />
        </div>

        {/* Quick channels */}
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          <Channel
            icon={<Bot size={18} />} title="Ask AI" body="Instant answers from our visa assistant" href="/assistant" tone="clay"
          />
          <Channel
            icon={<MessageCircle size={18} />} title="Message a mentor" body="Real human within 24h" href="/community" tone="leaf"
          />
          <Channel
            icon={<AlertOctagon size={18} />} title="Report a scam" body="Action within 4 hours" href="/scam-alerts" tone="red"
          />
        </div>

        {/* Topics */}
        <div className="mt-12 flex flex-wrap items-center gap-2">
          {topics.map((t) => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                topic === t.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
              }`}
            >
              {t.label}
              <span className={`text-[10px] ${topic === t.key ? "text-white/80" : "text-ink-500"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* FAQ list */}
        <div className="mt-6 space-y-3">
          {filtered.map((f, i) => (
            <details key={i} className="card group">
              <summary className="cursor-pointer font-medium text-ink-900 list-none flex items-center justify-between gap-3">
                <span>{f.q}</span>
                <span className="text-clay-500 group-open:rotate-180 transition shrink-0">▾</span>
              </summary>
              <p className="text-sm text-ink-600 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
          {filtered.length === 0 && (
            <div className="card text-center py-10 text-sm text-ink-500">
              <Sparkles size={16} className="mx-auto mb-2 opacity-50" />
              No match. <Link href="/contact" className="text-clay-600 font-medium hover:underline">Ask us directly</Link>.
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="card mt-12 flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-ink-900">Still stuck?</h3>
            <p className="text-sm text-ink-600 mt-1">
              We answer support tickets within 4 hours during business days (8am–8pm GMT).
            </p>
            <Link href="/contact" className="btn-accent text-sm mt-3 inline-flex">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Channel({ icon, title, body, href, tone }: { icon: React.ReactNode; title: string; body: string; href: string; tone: "clay" | "leaf" | "red" }) {
  const t = tone === "clay" ? "bg-clay-500/15 text-clay-600"
          : tone === "leaf" ? "bg-leaf-500/15 text-leaf-600"
          :                    "bg-red-500/15 text-red-600";
  return (
    <Link href={href} className="card flex items-start gap-3 hover:border-clay-300 transition">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t}`}>
        {icon}
      </div>
      <div>
        <p className="font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-600">{body}</p>
      </div>
    </Link>
  );
}
