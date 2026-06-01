"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileCheck, Globe, Loader2, Bot, User, X, Download, Printer } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; sources?: { title: string; url: string }[] };

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hi. I'm your immigration assistant. Tell me your origin country, destination, and what you're trying to do — I'll guide you step by step.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply, sources: data.sources }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I hit an error reaching the AI service. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Canada study permit requirements for Ghanaian student",
    "How much money do I need for UK Tier 4 visa?",
    "What documents do I need for Germany student visa?",
    "Can I work part-time on a US F-1 visa?",
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-cream-200 px-6 py-4 flex items-center justify-between bg-cream-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-clay-500 text-white flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink-900">Immigration Assistant</h2>
            <p className="text-xs text-leaf-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf-500 animate-pulse" />
              Online · Powered by Claude
            </p>
          </div>
        </div>
        <button onClick={() => setChecklistOpen(true)} className="btn-ghost text-sm border border-cream-300">
          <FileCheck size={14} /> Generate checklist
        </button>
      </div>

      {checklistOpen && <ChecklistModal messages={messages} onClose={() => setChecklistOpen(false)} />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, i) => (
            <Message key={i} msg={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-ink-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Assistant is thinking...
            </div>
          )}

          {messages.length === 1 && (
            <div className="mt-12">
              <p className="text-sm font-medium text-ink-600 mb-3 flex items-center gap-2">
                <Sparkles size={14} /> Try asking
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left px-4 py-3 rounded-lg border border-cream-200 hover:border-clay-300 hover:bg-clay-500/5 transition text-sm text-ink-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSend} className="border-t border-cream-200 bg-cream-50 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about visas, permits, scholarships..."
              className="input pr-12 py-3"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md bg-clay-500 text-white flex items-center justify-center hover:bg-clay-600 disabled:opacity-30 transition"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-500 flex items-center gap-1.5">
            <Globe size={11} />
            AI responses are guidance only. Always verify against official government sources.
          </p>
        </div>
      </form>
    </div>
  );
}

function Message({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900" : "bg-clay-500 text-white"
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-clay-500 text-white rounded-tr-sm"
              : "bg-[var(--color-surface)] border border-cream-200 text-ink-900 rounded-tl-sm"
          }`}
        >
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-md bg-cream-100 text-ink-700 hover:bg-cream-200">
                📎 {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Checklist modal ----------------------------------------------------------------

type Detected = { origin: string | null; destination: string | null; visaType: string };

const ORIGIN_COUNTRIES = [
  { match: ["ghana", "gh"], label: "Ghana" },
  { match: ["nigeria", "ng"], label: "Nigeria" },
  { match: ["kenya", "ke"], label: "Kenya" },
  { match: ["india", "in"], label: "India" },
  { match: ["pakistan", "pk"], label: "Pakistan" },
  { match: ["bangladesh", "bd"], label: "Bangladesh" },
  { match: ["china", "cn"], label: "China" },
  { match: ["egypt", "eg"], label: "Egypt" },
  { match: ["ethiopia", "et"], label: "Ethiopia" },
  { match: ["south africa", "za"], label: "South Africa" },
  { match: ["brazil", "br"], label: "Brazil" },
  { match: ["mexico", "mx"], label: "Mexico" },
  { match: ["philippines", "ph"], label: "Philippines" },
  { match: ["vietnam", "vn"], label: "Vietnam" },
  { match: ["indonesia", "id"], label: "Indonesia" },
  { match: ["tanzania", "tz"], label: "Tanzania" },
  { match: ["uganda", "ug"], label: "Uganda" },
  { match: ["rwanda", "rw"], label: "Rwanda" },
  { match: ["senegal", "sn"], label: "Senegal" },
  { match: ["cote d'ivoire", "ivory coast", "ci"], label: "Côte d'Ivoire" },
];

const DEST_COUNTRIES = [
  { match: ["canada", "ca"], label: "Canada" },
  { match: ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland", "gb"], label: "United Kingdom" },
  { match: ["germany", "de"], label: "Germany" },
  { match: ["united states", "us", "usa", "america"], label: "United States" },
  { match: ["australia", "au"], label: "Australia" },
  { match: ["ireland", "ie"], label: "Ireland" },
  { match: ["netherlands", "holland", "nl"], label: "Netherlands" },
  { match: ["france", "fr"], label: "France" },
  { match: ["sweden", "se"], label: "Sweden" },
  { match: ["denmark", "dk"], label: "Denmark" },
  { match: ["norway", "no"], label: "Norway" },
  { match: ["finland", "fi"], label: "Finland" },
  { match: ["switzerland", "ch"], label: "Switzerland" },
  { match: ["italy", "it"], label: "Italy" },
  { match: ["spain", "es"], label: "Spain" },
  { match: ["japan", "jp"], label: "Japan" },
  { match: ["south korea", "korea", "kr"], label: "South Korea" },
  { match: ["new zealand", "nz"], label: "New Zealand" },
  { match: ["singapore", "sg"], label: "Singapore" },
  { match: ["malaysia", "my"], label: "Malaysia" },
  { match: ["united arab emirates", "uae", "dubai"], label: "UAE" },
];

const VISA_KEYWORDS = [
  { keywords: ["work permit", "work visa", "tier 2", "skilled worker"], label: "Work Permit" },
  { keywords: ["permanent residence", "pr", "green card", "immigration"], label: "Permanent Residence" },
  { keywords: ["exchange", "exchange program", "j-1"], label: "Exchange Visa" },
  { keywords: ["tourist", "visitor", "b-2", "visit visa"], label: "Tourist Visa" },
  { keywords: ["student visa", "study permit", "f-1", "tier 4", "student"], label: "Study Permit" },
];

function detect(messages: Msg[]): Detected {
  const text = messages.map((m) => m.content).join(" ").toLowerCase();

  function findMatch(list: typeof ORIGIN_COUNTRIES): string | null {
    for (const entry of list) {
      for (const keyword of entry.match) {
        const idx = text.indexOf(keyword);
        if (idx !== -1) {
          const before = text[idx - 1] || " ";
          const after = text[idx + keyword.length] || " ";
          if (!/\w/.test(before) && !/\w/.test(after)) {
            return entry.label;
          }
        }
      }
    }
    return null;
  }

  const origin = findMatch(ORIGIN_COUNTRIES);
  const destination = findMatch(DEST_COUNTRIES);

  let visaType = "Study Permit";
  for (const entry of VISA_KEYWORDS) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      visaType = entry.label;
      break;
    }
  }

  return { origin, destination, visaType };
}

function buildChecklist(d: Detected) {
  const dest = (d.destination ?? "Canada").toLowerCase();
  const base = [
    { section: "Identity",      items: ["Valid passport (6+ months validity)", "Passport-size biometric photos (2)", "National ID copy"] },
    { section: "Academic",      items: ["Official Letter of Acceptance from a recognized institution", "Sealed academic transcripts", "Degree certificate(s)", "English proficiency (IELTS / TOEFL) — if applicable"] },
    { section: "Financial",     items: ["Bank statements (last 6 months)", "Proof of funds covering tuition + 1 year living", "Scholarship letter (if any)", "Sponsor affidavit (if not self-funded)"] },
    { section: "Application",   items: ["Completed online visa application", "Visa fee payment receipt", "Biometrics receipt", "Statement of Purpose / cover letter"] },
    { section: "Health & Travel", items: ["Medical examination report (panel physician)", "Police clearance certificate", "Travel insurance (until local health enrols)"] },
  ];

  // Country-specific additions
  if (dest.includes("canada")) base[2].items.push("GIC (CAD 10,000+) from a Canadian bank");
  if (dest.includes("uk"))     { base[2].items.push("Immigration Health Surcharge paid (£776/yr)"); base[3].items.push("Confirmation of Acceptance for Studies (CAS) number"); }
  if (dest.includes("germany")) { base[2].items.push("Blocked account (Sperrkonto) with €11,904+"); base[3].items.push("APS certificate (for China/India/Vietnam applicants)"); }
  if (dest.includes("united states") || dest === "us" || dest === "usa") { base[3].items.push("Form I-20 (from SEVP-certified school)", "SEVIS fee payment receipt (I-901)", "DS-160 confirmation page"); }
  if (dest.includes("australia")) base[2].items.push("Genuine Temporary Entrant (GTE) statement");

  return base;
}

function ChecklistModal({ messages, onClose }: { messages: Msg[]; onClose: () => void }) {
  const d = detect(messages);
  const sections = buildChecklist(d);
  const totalItems = sections.reduce((a, s) => a + s.items.length, 0);
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setDone((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  function downloadTxt() {
    const lines: string[] = [];
    lines.push(`GlobalBridge — ${d.visaType} document checklist`);
    lines.push(d.origin && d.destination ? `${d.origin} → ${d.destination}` : "Personalize by chatting first.");
    lines.push("");
    for (const sec of sections) {
      lines.push(`== ${sec.section} ==`);
      for (const item of sec.items) {
        lines.push(`[ ] ${item}`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `globalbridge-checklist-${d.visaType.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[5vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-cream-200 bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-cream-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-clay-500" />
              <h2 className="font-display text-lg font-semibold text-ink-900">Personalized checklist</h2>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              {d.origin && d.destination ? (
                <>{d.origin} → {d.destination} · {d.visaType}</>
              ) : (
                <>Generic {d.visaType}. Chat more so we can tailor it.</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-cream-200 text-ink-500" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-cream-200">
          <div className="flex items-center justify-between text-xs text-ink-700 mb-1.5">
            <span>{done.size} of {totalItems} done</span>
            <span className="text-clay-600 font-semibold">{Math.round((done.size / totalItems) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
            <div className="h-full bg-clay-500 transition-all" style={{ width: `${(done.size / totalItems) * 100}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {sections.map((sec) => (
            <section key={sec.section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-clay-600 mb-2">{sec.section}</h3>
              <ul className="space-y-1.5">
                {sec.items.map((item) => {
                  const key = `${sec.section}::${item}`;
                  const isDone = done.has(key);
                  return (
                    <li key={key}>
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggle(key)}
                          className="w-4 h-4 mt-0.5 accent-clay-500 cursor-pointer shrink-0"
                        />
                        <span className={`text-sm ${isDone ? "text-ink-500 line-through" : "text-ink-700"}`}>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-cream-200 flex items-center justify-end gap-2">
          <button onClick={() => window.print()} className="btn-ghost border border-cream-300 text-sm">
            <Printer size={13} /> Print
          </button>
          <button onClick={downloadTxt} className="btn-accent text-sm">
            <Download size={13} /> Download .txt
          </button>
        </footer>
      </div>
    </div>
  );
}
