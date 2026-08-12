"use client";

import { useEffect, useState } from "react";
import {
  Lock, Heart, Shield, MessageCircle, Plus, Eye, EyeOff, AlertTriangle, ChevronUp, Scale, Globe, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Topic = "all" | "mental-health" | "discrimination" | "legal" | "burnout" | "relationships";

const topics: { key: Topic; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: "all",            label: "All",                icon: <Globe size={13} />,       tone: "text-ink-600" },
  { key: "mental-health",  label: "Mental health",      icon: <Heart size={13} />,       tone: "text-clay-600" },
  { key: "discrimination", label: "Discrimination",     icon: <Shield size={13} />,      tone: "text-amber-500" },
  { key: "legal",          label: "Legal issues",       icon: <Scale size={13} />,       tone: "text-sky-600" },
  { key: "burnout",        label: "Academic burnout",   icon: <AlertTriangle size={13} />, tone: "text-red-600" },
  { key: "relationships",  label: "Relationships",      icon: <MessageCircle size={13} />, tone: "text-leaf-600" },
];

type Post = {
  id: string; topic: Exclude<Topic, "all">;
  alias: string; aliasColor: string;
  title: string; body: string;
  replies: number; upvotes: number; supportCount: number;
  posted: string;
  flagged?: boolean;
};

type RawPost = {
  id: string; topic: string; alias: string; alias_color: string;
  title: string; body: string; upvotes: number; support_count: number;
  flagged: boolean; created_at: string;
};

type Reply = { id: string; alias: string; aliasColor: string; body: string; posted: string };
type RawReply = { id: string; alias: string; alias_color: string; body: string; created_at: string };

function relTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 2) return "Yesterday";
  return `${Math.floor(d / 86400)}d ago`;
}

function mapPost(r: RawPost): Post {
  return {
    id: r.id, topic: r.topic as Exclude<Topic, "all">,
    alias: r.alias, aliasColor: r.alias_color,
    title: r.title, body: r.body,
    replies: 0, upvotes: r.upvotes, supportCount: r.support_count,
    posted: relTime(r.created_at), flagged: r.flagged,
  };
}

const helplines: Record<Exclude<Topic, "all">, { label: string; phone: string }[]> = {
  "mental-health":  [{ label: "Samaritans (UK)", phone: "116 123" }, { label: "988 (US)", phone: "988" }, { label: "Talk Suicide (CA)", phone: "1-833-456-4566" }],
  "discrimination": [{ label: "EEOC (US)", phone: "1-800-669-4000" }, { label: "EHRC (UK)", phone: "0808 800 0082" }],
  "legal":          [{ label: "Free legal aid (UK)", phone: "0345 345 4 345" }, { label: "Legal Aid (CA)", phone: "1-800-668-8258" }],
  "burnout":        [{ label: "Samaritans", phone: "116 123" }, { label: "Crisis Text Line", phone: "Text HOME to 741741" }],
  "relationships":  [{ label: "BetterHelp", phone: "betterhelp.com" }],
};

export default function SafeSpacePage() {
  const [topic, setTopic] = useState<Topic>("all");
  const [showFlagged, setShowFlagged] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [composeTopic, setComposeTopic] = useState<Exclude<Topic, "all"> | "">("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [openReplies, setOpenReplies] = useState<Record<string, Reply[] | undefined>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busyUpvote, setBusyUpvote] = useState<Record<string, boolean>>({});
  const [busySupport, setBusySupport] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!getToken()) { setPosts([]); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/safe-space/posts", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setPosts((data.posts as RawPost[]).map(mapPost));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setPosts([]);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = (posts ?? [])
    .filter((p) => topic === "all" || p.topic === topic)
    .filter((p) => showFlagged || !p.flagged);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!composeTopic) return;
    setPosting(true);
    try {
      const res = await authFetch("/api/safe-space/posts", {
        method: "POST",
        body: JSON.stringify({ topic: composeTopic, title: composeTitle, body: composeBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't post");
      setPosts((arr) => [mapPost(data.post as RawPost), ...(arr ?? [])]);
      setComposeOpen(false);
      setComposeTopic(""); setComposeTitle(""); setComposeBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't post");
    } finally {
      setPosting(false);
    }
  }

  async function upvote(id: string) {
    if (busyUpvote[id]) return;
    setBusyUpvote((b) => ({ ...b, [id]: true }));
    try {
      const res = await authFetch(`/api/safe-space/posts/${id}/upvote`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setPosts((arr) => (arr ?? []).map((p) => (p.id === id ? { ...p, upvotes: data.upvotes } : p)));
    } finally {
      setBusyUpvote((b) => ({ ...b, [id]: false }));
    }
  }

  async function support(id: string) {
    if (busySupport[id]) return;
    setBusySupport((b) => ({ ...b, [id]: true }));
    try {
      const res = await authFetch(`/api/safe-space/posts/${id}/support`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setPosts((arr) => (arr ?? []).map((p) => (p.id === id ? { ...p, supportCount: data.support_count } : p)));
    } finally {
      setBusySupport((b) => ({ ...b, [id]: false }));
    }
  }

  async function toggleReplies(id: string) {
    if (openReplies[id] !== undefined) {
      setOpenReplies((r) => { const n = { ...r }; delete n[id]; return n; });
      return;
    }
    const res = await authFetch(`/api/safe-space/posts/${id}/replies`);
    const data = await res.json();
    const replies: Reply[] = res.ok
      ? (data.replies as RawReply[]).map((r) => ({ id: r.id, alias: r.alias, aliasColor: r.alias_color, body: r.body, posted: relTime(r.created_at) }))
      : [];
    setOpenReplies((r) => ({ ...r, [id]: replies }));
  }

  async function submitReply(id: string) {
    const body = (replyDraft[id] ?? "").trim();
    if (!body) return;
    const res = await authFetch(`/api/safe-space/posts/${id}/replies`, { method: "POST", body: JSON.stringify({ body }) });
    const data = await res.json();
    if (!res.ok) return;
    const r = data.reply as RawReply;
    setOpenReplies((cur) => ({ ...cur, [id]: [...(cur[id] ?? []), { id: r.id, alias: r.alias, aliasColor: r.alias_color, body: r.body, posted: relTime(r.created_at) }] }));
    setReplyDraft((d) => ({ ...d, [id]: "" }));
    setPosts((arr) => (arr ?? []).map((p) => (p.id === id ? { ...p, replies: p.replies + 1 } : p)));
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="badge !bg-clay-500/15 !text-clay-600 mb-3 inline-flex items-center gap-1">
              <Lock size={11} /> Anonymous · End-to-end moderated
            </span>
            <h1 className="text-3xl font-display font-semibold text-ink-900">Safe Space</h1>
            <p className="text-sm text-ink-600 mt-1">
              For sensitive topics. Your identity stays hidden — even from admins reviewing flags.
            </p>
          </div>
          <button onClick={() => setComposeOpen((v) => !v)} className="btn-accent text-sm">
            <Plus size={13} /> Post anonymously
          </button>
        </div>
      </header>

      {/* Compose */}
      {composeOpen && (
        <form onSubmit={submitPost} className="card mb-6 border-clay-300">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-clay-500" />
            <p className="text-sm font-medium text-ink-900">You&apos;ll post as a random color-animal alias. Nobody can link this to your account.</p>
          </div>
          <select value={composeTopic} onChange={(e) => setComposeTopic(e.target.value as Exclude<Topic, "all">)} className="input mb-3 max-w-xs text-sm" required>
            <option value="">— Pick a topic —</option>
            {topics.slice(1).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} className="input mb-3" placeholder="Title (keep it specific)" minLength={5} maxLength={200} required />
          <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} className="input min-h-[120px]" placeholder="Share what's going on. Vague is fine. Mods can't see your identity." minLength={10} maxLength={5000} required />
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs text-ink-500">
            <span>⚠ If you're in immediate danger, contact local emergency services — this isn't a monitored crisis line.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setComposeOpen(false)} className="btn-ghost border border-cream-300 !py-1.5">Cancel</button>
              <button type="submit" disabled={posting} className="btn-accent !py-1.5 disabled:opacity-50">
                {posting ? <><Loader2 size={13} className="animate-spin" /> Posting...</> : "Post"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {topics.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopic(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              topic === t.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={topic === t.key ? "text-white" : t.tone}>{t.icon}</span>
            {t.label}
          </button>
        ))}

        <div className="ml-auto">
          <button
            onClick={() => setShowFlagged((v) => !v)}
            className="text-xs text-ink-500 hover:text-ink-700 inline-flex items-center gap-1"
          >
            {showFlagged ? <Eye size={12} /> : <EyeOff size={12} />}
            {showFlagged ? "Hide flagged posts" : "Show flagged posts"}
          </button>
        </div>
      </div>

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600 mb-4">{err}</div>
      )}

      {posts === null && (
        <div className="card text-center py-10 text-ink-500">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading posts...
        </div>
      )}

      {/* Posts */}
      <ul className="space-y-3">
        {filtered.map((p) => {
          const topicMeta = topics.find((t) => t.key === p.topic)!;
          const hl = helplines[p.topic];
          const replies = openReplies[p.id];
          return (
            <li key={p.id} className={`card ${p.flagged ? "border-amber-300 dark:border-amber-900/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full ${p.aliasColor} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500">
                    <span className="font-mono">{p.alias}</span>
                    <span>·</span>
                    <span className={`badge !text-[10px] capitalize ${topicMeta.tone.replace("text-", "!text-").replace("-600", "-600 !bg-")}500/15`}>
                      {topicMeta.icon} {topicMeta.label}
                    </span>
                    <span>·</span>
                    <span>{p.posted}</span>
                    {p.flagged && <span className="badge !bg-amber-500/15 !text-amber-500 !text-[10px]"><AlertTriangle size={9} /> Under review</span>}
                  </div>
                  <h3 className="font-medium text-ink-900 mt-2">{p.title}</h3>
                  <p className="text-sm text-ink-700 mt-1 leading-relaxed">{p.body}</p>

                  {hl && hl.length > 0 && (
                    <div className="mt-3 px-3 py-2 rounded-md bg-clay-500/5 border border-clay-500/15 flex items-center gap-2 flex-wrap text-xs">
                      <Heart size={12} className="text-clay-600 shrink-0" />
                      <span className="text-ink-700">Crisis support:</span>
                      {hl.map((h) => (
                        <span key={h.label} className="font-mono font-medium text-clay-600">{h.label} · {h.phone}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
                    <button onClick={() => upvote(p.id)} disabled={busyUpvote[p.id]} className="flex items-center gap-1 hover:text-clay-600 transition disabled:opacity-50">
                      <ChevronUp size={12} /> {p.upvotes}
                    </button>
                    <button onClick={() => toggleReplies(p.id)} className="flex items-center gap-1 hover:text-clay-600 transition">
                      <MessageCircle size={12} /> {replies ? replies.length : p.replies} replies
                    </button>
                    <button onClick={() => support(p.id)} disabled={busySupport[p.id]} className="flex items-center gap-1 text-leaf-600 hover:text-leaf-700 transition disabled:opacity-50">
                      <Heart size={12} /> {p.supportCount} sent support
                    </button>
                  </div>

                  {replies !== undefined && (
                    <div className="mt-3 pt-3 border-t border-cream-200 space-y-2">
                      {replies.map((r) => (
                        <div key={r.id} className="flex items-start gap-2 text-xs">
                          <div className={`w-5 h-5 rounded-full ${r.aliasColor} text-white flex items-center justify-center shrink-0 font-semibold`}>?</div>
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-ink-500">{r.alias}</span> <span className="text-ink-400">· {r.posted}</span>
                            <p className="text-ink-700 mt-0.5">{r.body}</p>
                          </div>
                        </div>
                      ))}
                      {replies.length === 0 && <p className="text-xs text-ink-500">No replies yet — be the first to respond.</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={replyDraft[p.id] ?? ""}
                          onChange={(e) => setReplyDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") submitReply(p.id); }}
                          className="input !py-1.5 text-xs flex-1"
                          placeholder="Reply anonymously..."
                        />
                        <button onClick={() => submitReply(p.id)} className="btn-ghost border border-cream-300 !py-1.5 text-xs shrink-0">Send</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {posts !== null && filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">No posts here yet.</li>
        )}
      </ul>

      {/* Footer disclaimer */}
      <div className="card mt-6 border-clay-300">
        <p className="text-xs font-semibold uppercase tracking-wider text-clay-600 mb-2 flex items-center gap-1">
          <Lock size={11} /> How anonymity works
        </p>
        <ul className="text-xs text-ink-700 space-y-1">
          <li>• A fresh random alias is generated for every post and reply — even your own past posts can&apos;t be linked together</li>
          <li>• Admin moderation sees alias + content only, never your account</li>
          <li>• Threats of imminent harm to self or others may trigger legal disclosure — read full policy in <a href="/privacy" className="text-clay-600 underline">Privacy</a></li>
        </ul>
      </div>
    </div>
  );
}
