"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileCheck, Globe, Loader2, Bot, User, X, Download, Printer, History, CheckCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/i18n/hooks/useTranslation";
import { getToken, getUser } from "@/lib/auth";

type Source = { title: string; url: string; confidence?: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

export default function AssistantPage() {
  const { t, lang } = useTranslation();
  const user = getUser();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: t("assistant.welcomeMessage"),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load conversation history for signed-in users
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    fetch("/api/ai/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, [user?.id]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const token = getToken();
    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          lang,
          conversation_id: conversationId,
          token,
        }),
      });
      const data = await res.json();
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply, sources: data.sources }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: t("assistant.errorMessage") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function loadConversation(convId: string) {
    const token = getToken();
    if (!token) return;
    fetch(`/api/ai/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages.map((m: { role: string; content: string; sources?: Source[] }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            sources: m.sources,
          })));
          setConversationId(convId);
          setShowHistory(false);
        }
      })
      .catch(() => {});
  }

  const suggestions = [
    t("assistant.suggestion1"),
    t("assistant.suggestion2"),
    t("assistant.suggestion3"),
    t("assistant.suggestion4"),
  ];

  function roleSuggestions(role: string): string[] {
    switch (role) {
      case "student":
        return ["What scholarships can I apply for?", "How do I find housing in Canada?", "What documents do I need for a UK student visa?"];
      case "mentor":
        return ["How do I become a verified mentor?", "How can I post opportunities?", "How do I book sessions with students?"];
      case "employer":
        return ["How do I post a job with visa sponsorship?", "How can I find international candidates?", "What are the visa sponsorship requirements?"];
      case "admin":
        return ["How do I moderate user reports?", "How do I manage AI configuration?", "How do I view system health?"];
      default:
        return [];
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-cream-200 px-6 py-4 flex items-center justify-between bg-cream-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-clay-500 text-white flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink-900">{t("assistant.title")}</h2>
            <p className="text-xs text-leaf-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf-500 animate-pulse" />
              {t("assistant.subtitle")}
              {user && <span className="ml-2 text-ink-500">· {user.role}</span>}
              {conversationId && <span className="ml-2 text-ink-400">· conversation active</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && conversations.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="btn-ghost text-sm border border-cream-300">
              <History size={14} /> History
            </button>
          )}
          <button onClick={() => setChecklistOpen(true)} className="btn-ghost text-sm border border-cream-300">
            <FileCheck size={14} /> {t("assistant.generateChecklist")}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="border-b border-cream-200 px-6 py-3 bg-cream-50/50 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-ink-500 mb-2">Recent conversations</p>
          <div className="flex flex-wrap gap-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  c.id === conversationId
                    ? "bg-clay-500 text-white border-clay-500"
                    : "bg-white text-ink-700 border-cream-300 hover:border-clay-300"
                }`}
              >
                {c.title?.slice(0, 40) || "Conversation"}
              </button>
            ))}
          </div>
        </div>
      )}

      {checklistOpen && <ChecklistModal messages={messages} onClose={() => setChecklistOpen(false)} />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, i) => (
            <Message key={i} msg={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-ink-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> {t("assistant.thinking")}
            </div>
          )}

          {messages.length === 1 && (
            <div className="mt-12">
              <p className="text-sm font-medium text-ink-600 mb-3 flex items-center gap-2">
                <Sparkles size={14} /> {t("assistant.suggestions")}
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
              {user && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-ink-500 mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-clay-500" />
                    Role-based suggestions
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {roleSuggestions(user.role).map((s) => (
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
          )}
        </div>
      </div>

      <form onSubmit={onSend} className="border-t border-cream-200 bg-cream-50 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
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
            {t("assistant.welcomeMessage")?.substring(0, 60)}...
          </p>
        </div>
      </form>
    </div>
  );
}

function confidenceIcon(confidence?: string) {
  switch (confidence) {
    case "verified": return <ShieldCheck size={10} className="text-leaf-600" />;
    case "knowledge_base": return <CheckCircle size={10} className="text-clay-600" />;
    default: return <Globe size={10} className="text-ink-500" />;
  }
}

function confidenceLabel(confidence?: string) {
  switch (confidence) {
    case "verified": return "Verified source";
    case "knowledge_base": return "Platform knowledge";
    default: return "Web source";
  }
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={confidenceLabel(s.confidence)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-cream-100 text-ink-700 hover:bg-cream-200 border border-cream-200"
              >
                {confidenceIcon(s.confidence)}
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

        <div className="px-6 py-3 border-b border-cream-200">
          <div className="flex items-center justify-between text-xs text-ink-700 mb-1.5">
            <span>{done.size} of {totalItems} done</span>
            <span className="text-clay-600 font-semibold">{Math.round((done.size / totalItems) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
            <div className="h-full bg-clay-500 transition-all" style={{ width: `${(done.size / totalItems) * 100}%` }} />
          </div>
        </div>

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
