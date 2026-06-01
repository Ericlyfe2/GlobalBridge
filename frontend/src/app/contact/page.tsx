"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Mail, Globe, MessageCircle, AlertOctagon, Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Topic = "general" | "support" | "safety" | "press" | "partner" | "institution";

const topics: { key: Topic; label: string; sla: string }[] = [
  { key: "general",     label: "General question",       sla: "Reply within 1 business day" },
  { key: "support",     label: "Technical support",      sla: "Reply within 4 hours" },
  { key: "safety",      label: "Report a scam or abuse", sla: "Action within 4 hours · 24/7" },
  { key: "press",       label: "Press / media",          sla: "Reply within 2 business days" },
  { key: "partner",     label: "Mentor or volunteer",    sla: "Reply within 2 days" },
  { key: "institution", label: "University / employer",  sla: "Reply within 1 business day" },
];

export default function ContactPage() {
  const [topic, setTopic] = useState<Topic>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  }

  const meta = topics.find((t) => t.key === topic)!;

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="max-w-6xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="badge badge-clay mb-3">Contact</span>
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-ink-900 tracking-tight">
            Talk to a real human.
          </h1>
          <p className="mt-3 text-lg text-ink-600">
            We answer support tickets within 4 hours during business days (8am–8pm GMT).
            Safety reports get action 24/7.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="card border-leaf-300 dark:border-leaf-900/40">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink-900">Message sent</h2>
                    <p className="text-sm text-ink-600 mt-1">
                      We&apos;ll reply to <span className="font-medium text-ink-900">{email}</span>. {meta.sla}.
                    </p>
                    <button onClick={() => { setSent(false); setMessage(""); }} className="btn-ghost border border-cream-300 text-sm mt-4">
                      Send another
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="card space-y-4">
                <Field label="What's this about?">
                  <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="input">
                    {topics.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <p className="text-xs text-leaf-600 mt-1.5">{meta.sla}</p>
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Your name">
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ada Lovelace" required />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
                  </Field>
                </div>

                <Field label="Message">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input min-h-[160px]"
                    placeholder={topic === "safety"
                      ? "Describe the scam or abuse. Include URLs, usernames, screenshots if possible."
                      : "Tell us what you need..."
                    }
                    required
                  />
                </Field>

                {topic === "safety" && (
                  <div className="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/25 flex items-start gap-3">
                    <AlertOctagon size={16} className="text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-ink-700">
                      For urgent safety issues — call your local emergency number first.
                      Use <Link href="/toolkit/sos" className="text-clay-600 font-medium hover:underline">Emergency SOS</Link> for instant crisis lines by country.
                    </div>
                  </div>
                )}

                <button type="submit" disabled={sending} className="btn-accent disabled:opacity-50">
                  {sending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send message</>}
                </button>

                <p className="text-xs text-ink-500 pt-2 border-t border-cream-200">
                  By submitting, you agree to our <Link href="/privacy" className="text-clay-600 hover:underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>

          {/* Channels sidebar */}
          <aside className="space-y-4">
            <div className="card">
              <h3 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <Mail size={14} className="text-clay-500" /> Direct email
              </h3>
              <ul className="space-y-2 text-sm">
                <li><span className="text-ink-500">General:</span> <a className="text-clay-600 hover:underline" href="mailto:hello@globalbridge.app">hello@globalbridge.app</a></li>
                <li><span className="text-ink-500">Support:</span> <a className="text-clay-600 hover:underline" href="mailto:support@globalbridge.app">support@globalbridge.app</a></li>
                <li><span className="text-ink-500">Safety:</span> <a className="text-clay-600 hover:underline" href="mailto:safety@globalbridge.app">safety@globalbridge.app</a></li>
                <li><span className="text-ink-500">Privacy:</span> <a className="text-clay-600 hover:underline" href="mailto:privacy@globalbridge.app">privacy@globalbridge.app</a></li>
              </ul>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <MessageCircle size={14} className="text-clay-500" /> Faster channels
              </h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/assistant" className="text-clay-600 hover:underline">AI Assistant</Link> — instant visa Q&amp;A</li>
                <li><Link href="/community" className="text-clay-600 hover:underline">Talk to a mentor</Link> — within 24h</li>
                <li><Link href="/forums" className="text-clay-600 hover:underline">Forums</Link> — public Q&amp;A</li>
              </ul>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <Globe size={14} className="text-clay-500" /> Office
              </h3>
              <p className="text-sm text-ink-700">
                GlobalBridge HQ<br />
                KNUST IT Department<br />
                Kumasi, Ghana
              </p>
              <p className="text-xs text-ink-500 mt-2">Business hours: Mon–Fri 8am–8pm GMT</p>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
