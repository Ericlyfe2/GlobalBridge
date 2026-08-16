"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowUp, ArrowDown, ShieldCheck, MessageSquare, Flag, Share2, Pin, Flame, Award, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Reply = {
  id: string; author: string; initials: string; verified: boolean; mentor?: boolean;
  posted: string; upvotes: number; body: string; trusted?: boolean;
  flagFrom?: string; flagTo?: string;
};

type Thread = {
  id: string; title: string; category: string;
  author: string; authorInitials: string; verified: boolean;
  posted: string; views: number; upvotes: number; pinned?: boolean; hot?: boolean;
  body: string;
  replies: Reply[];
};

type RawPost = {
  id: string; title: string; body: string; tags: string[] | null;
  upvotes: number; answer_count: number; created_at: string;
  author_name: string; author_role?: string;
};

type RawReply = {
  id: string; body: string; upvotes: number; created_at: string;
  is_accepted_answer: boolean; is_verified_mentor_reply: boolean;
  author_name: string; author_role: string; author_verified: string;
};

function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function mapThread(post: RawPost): Thread {
  return {
    id: post.id,
    title: post.title,
    category: (post.tags && post.tags[0]) ?? "Discussion",
    author: post.author_name,
    authorInitials: initialsOf(post.author_name),
    verified: post.author_role === "mentor" || post.author_role === "admin",
    posted: relativeTime(post.created_at),
    views: post.upvotes * 30,
    upvotes: post.upvotes,
    pinned: /megathread/i.test(post.title),
    hot: post.upvotes >= 80,
    body: post.body,
    replies: [],
  };
}

function mapReply(r: RawReply): Reply {
  return {
    id: r.id,
    author: r.author_name,
    initials: initialsOf(r.author_name),
    verified: r.author_role === "mentor" || r.author_role === "admin",
    mentor: r.is_verified_mentor_reply || r.author_role === "mentor",
    trusted: r.is_accepted_answer,
    posted: relativeTime(r.created_at),
    upvotes: r.upvotes,
    body: r.body,
  };
}

export default function ForumThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<Thread | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/forums/posts/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setT(mapThread(data.post as RawPost));
        setReplies((data.replies as RawReply[]).map(mapReply));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  async function onPost() {
    if (!reply.trim()) return;
    if (!getToken()) {
      setPostErr("Sign in to reply.");
      return;
    }
    setPosting(true);
    setPostErr(null);
    try {
      const res = await authFetch(`/api/forums/posts/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't post reply");
      setReplies((arr) => [...arr, {
        id: data.reply.id, author: "You", initials: "?", verified: false,
        posted: "now", upvotes: 0, body: reply,
      }]);
      setReply("");
    } catch (e) {
      setPostErr(e instanceof Error ? e.message : "Couldn't post reply");
    } finally {
      setPosting(false);
    }
  }

  async function report(targetType: "post" | "reply", targetId: string) {
    if (!getToken()) { setPostErr("Sign in to report."); return; }
    try {
      const res = await authFetch("/api/moderation/report", {
        method: "POST",
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason: "Reported from forum thread" }),
      });
      if (res.ok) setReportedIds((s) => new Set(s).add(targetId));
    } catch { /* best-effort */ }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: t?.title, url }); return; } catch { /* user cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
  }

  if (err) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/forums" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to forums
        </Link>
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load this thread: {err}
        </div>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" /> Loading thread...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/forums" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to forums
      </Link>

      {/* Thread header */}
      <article className="card">
        <div className="flex items-start gap-4">
          <VoteColumn upvotes={t.upvotes} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              {t.pinned && <Pin size={12} className="text-clay-600" />}
              {t.hot && <Flame size={12} className="text-amber-500" />}
              <span className="badge badge-clay text-[10px]">{t.category}</span>
            </div>
            <h1 className="text-2xl font-display font-semibold text-ink-900">{t.title}</h1>

            <div className="mt-3 flex items-center gap-3 text-sm text-ink-600">
              <Avatar initials={t.authorInitials} />
              <div>
                <p className="font-medium text-ink-900 flex items-center gap-1.5">
                  {t.author}
                  {t.verified && <ShieldCheck size={12} className="text-leaf-600" />}
                </p>
                <p className="text-xs text-ink-500">Posted {t.posted} · {t.views.toLocaleString()} views</p>
              </div>
            </div>

            <div className="mt-5 text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">{t.body}</div>

            <div className="mt-5 flex items-center gap-3 text-xs text-ink-500">
              <button onClick={share} className="hover:text-clay-600 inline-flex items-center gap-1"><Share2 size={12} /> Share</button>
              {reportedIds.has(t.id) ? (
                <span className="text-ink-400">Reported</span>
              ) : (
                <button onClick={() => report("post", t.id)} className="hover:text-red-600 inline-flex items-center gap-1"><Flag size={12} /> Report</button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Replies */}
      <h2 className="text-lg font-display font-semibold text-ink-900 mt-8 mb-3 flex items-center gap-2">
        <MessageSquare size={16} className="text-clay-500" /> {replies.length} replies
      </h2>

      <ul className="space-y-3">
        {replies.map((r) => (
          <li key={r.id}>
            <article className={`card ${r.trusted ? "border-leaf-300 dark:border-leaf-900/40" : ""}`}>
              <div className="flex items-start gap-3">
                <VoteColumn upvotes={r.upvotes} compact />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar initials={r.initials} />
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900 flex items-center gap-1.5">
                        {r.author}
                        {r.verified && <ShieldCheck size={11} className="text-leaf-600" />}
                        {r.mentor && <span className="badge badge-verified !text-[10px]"><Award size={9} /> Verified Mentor</span>}
                        {r.flagFrom && r.flagTo && (
                          <span className="text-xs text-ink-500 flex items-center gap-1">
                            · <span className={`fi fi-${r.flagFrom}`} /> → <span className={`fi fi-${r.flagTo}`} />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-500">{r.posted}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">{r.body}</div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                    {reportedIds.has(r.id) ? (
                      <span className="text-ink-400">Reported</span>
                    ) : (
                      <button onClick={() => report("reply", r.id)} className="hover:text-red-600 inline-flex items-center gap-1"><Flag size={11} /> Report</button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {/* Reply box */}
      <div className="card mt-6">
        <h3 className="font-medium text-ink-900 mb-2">Add a reply</h3>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Share your experience or ask a follow-up..."
          className="input min-h-[100px] text-sm"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-ink-500">Verified mentors&apos; replies get a badge automatically.</p>
          <button onClick={onPost} disabled={!reply.trim() || posting} className="btn-accent text-sm disabled:opacity-50">
            {posting ? <><Loader2 size={13} className="animate-spin" /> Posting...</> : "Post reply"}
          </button>
        </div>
        {postErr && <p className="text-xs text-red-600 mt-2">{postErr}</p>}
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

function VoteColumn({ upvotes, compact = false }: { upvotes: number; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-xs text-ink-500 shrink-0 ${compact ? "w-8" : "w-10"}`}>
      <button aria-label="Upvote" className="p-0.5 rounded hover:bg-cream-200 hover:text-clay-600"><ArrowUp size={compact ? 12 : 14} /></button>
      <span className="font-semibold text-ink-900">{upvotes}</span>
      <button aria-label="Downvote" className="p-0.5 rounded hover:bg-cream-200 hover:text-red-600"><ArrowDown size={compact ? 12 : 14} /></button>
    </div>
  );
}
