"use client";

import { useEffect, useState } from "react";
import {
  Users, Eye, Lock, ArrowRight, Upload, MessageCircle, Clock, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Tab = "submit" | "queue" | "review";

type Rubric = { id: string; label: string; weight: number };
const rubric: Rubric[] = [
  { id: "hook",  label: "Opening hook",       weight: 15 },
  { id: "arc",   label: "Narrative arc",      weight: 20 },
  { id: "ev",    label: "Specific evidence",  weight: 20 },
  { id: "fit",   label: "Program / role fit", weight: 20 },
  { id: "voice", label: "Authentic voice",    weight: 15 },
  { id: "close", label: "Closing return",     weight: 10 },
];

type QueueItem = {
  id: string; alias: string; alias_color: string; doc_type: string; target: string;
  body: string; reviews_needed: number; reviews_count: number; created_at: string;
};

type MySubmission = {
  id: string; doc_type: string; target: string; reviews_needed: number;
  reviews_count: number; avg_score: string | null; created_at: string;
};

function hoursAgo(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
}

export default function PeerReviewPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-clay-500/15 text-clay-600 flex items-center justify-center shrink-0">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Peer Essay Review</h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Anonymous structured feedback from other students. Free — earn credits by reviewing.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border border-cream-200 rounded-md p-1 bg-cream-100 w-fit mb-6">
        {([
          { k: "queue",  l: "Review queue" },
          { k: "submit", l: "Submit yours" },
          { k: "review", l: "My submissions" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              tab === t.k ? "bg-clay-500 text-white" : "text-ink-700 hover:bg-cream-200"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "submit" && <SubmitView onSubmitted={() => { setTab("queue"); setRefreshKey((k) => k + 1); }} />}
      {tab === "queue"  && <QueueView refreshKey={refreshKey} onReviewed={() => setRefreshKey((k) => k + 1)} />}
      {tab === "review" && <MySubmissionsView refreshKey={refreshKey} />}

      <div className="card mt-8 border-clay-300">
        <h3 className="font-display text-base font-semibold text-clay-600 mb-2 flex items-center gap-1.5">
          <Lock size={14} /> How peer review works
        </h3>
        <ul className="text-xs text-ink-700 space-y-1.5">
          <li>• You submit anonymously — reviewers see your essay + a random alias only, never your name</li>
          <li>• Three reviewers fill the rubric; your aggregate score is the average of their scores</li>
          <li>• To submit one, review three of others first (Wikipedia model — keeps quality high)</li>
        </ul>
      </div>
    </div>
  );
}

function QueueView({ refreshKey, onReviewed }: { refreshKey: number; onReviewed: () => void }) {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<QueueItem | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/peer-review/queue", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Couldn't load queue");
        setQueue(data.queue as QueueItem[]);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setQueue([]);
      }
    })();
    return () => ctrl.abort();
  }, [refreshKey]);

  if (reviewing) {
    return (
      <ReviewForm
        submission={reviewing}
        onDone={() => { setReviewing(null); onReviewed(); }}
        onCancel={() => setReviewing(null)}
      />
    );
  }

  if (!getToken()) {
    return <div className="card text-center py-10 text-sm text-ink-500">Sign in to see the review queue.</div>;
  }

  return (
    <div className="space-y-3">
      {err && <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">{err}</div>}
      {queue === null && !err && (
        <div className="card text-center py-10 text-ink-500"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading queue...</div>
      )}
      {queue !== null && queue.length === 0 && (
        <div className="card text-center py-10 text-sm text-ink-500">Nothing to review right now — check back soon.</div>
      )}
      {queue?.map((s) => (
        <article key={s.id} className="card">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full ${s.alias_color} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>?</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <p className="text-sm font-mono text-ink-700">{s.alias}</p>
                <span className="badge badge-clay text-[10px]">{s.doc_type}</span>
                <span className="text-xs text-ink-500">→ {s.target}</span>
                <span className="text-xs text-ink-500 flex items-center gap-1"><Clock size={10} /> {hoursAgo(s.created_at)}h ago</span>
              </div>
              <p className="text-sm text-ink-700 mt-2 line-clamp-2 italic">&ldquo;{s.body}&rdquo;</p>
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span>{s.body.split(/\s+/).length} words</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    Reviews: <span className="font-medium text-ink-900">{s.reviews_count}/{s.reviews_needed}</span>
                  </span>
                </div>
                <button onClick={() => setReviewing(s)} className="btn-accent text-sm">
                  <Eye size={13} /> Review this <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReviewForm({ submission, onDone, onCancel }: { submission: QueueItem; onDone: () => void; onCancel: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(rubric.map((r) => [r.id, 70]))
  );
  const [comments, setComments] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setErr(null);
    try {
      const res = await authFetch(`/api/peer-review/submissions/${submission.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rubric_scores: scores, comments: comments || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Couldn't submit review");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't submit review");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-mono text-ink-700">{submission.alias}</span>
        <span className="badge badge-clay text-[10px]">{submission.doc_type}</span>
        <span className="text-xs text-ink-500">→ {submission.target}</span>
      </div>
      <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto p-3 bg-cream-50 rounded-md border border-cream-200 mb-4">
        {submission.body}
      </p>

      <div className="space-y-3 mb-4">
        {rubric.map((r) => (
          <label key={r.id} className="block">
            <span className="flex items-center justify-between text-xs font-medium text-ink-600 mb-1">
              <span>{r.label} ({r.weight}%)</span>
              <span>{scores[r.id]}/100</span>
            </span>
            <input
              type="range" min={0} max={100} value={scores[r.id]}
              onChange={(e) => setScores((s) => ({ ...s, [r.id]: Number(e.target.value) }))}
              className="w-full accent-clay-500"
            />
          </label>
        ))}
      </div>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Comments (optional)</span>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="input min-h-[80px]" placeholder="Specific, actionable feedback..." />
      </label>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost border border-cream-300 text-sm">Cancel</button>
        <button onClick={submit} disabled={sending} className="btn-accent text-sm disabled:opacity-50">
          {sending ? <><Loader2 size={13} className="animate-spin" /> Submitting...</> : "Submit review"}
        </button>
      </div>
    </div>
  );
}

function SubmitView({ onSubmitted }: { onSubmitted: () => void }) {
  const [docType, setDocType] = useState("Statement of Purpose");
  const [target, setTarget] = useState("");
  const [focus, setFocus] = useState("");
  const [body, setBody] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { setCredits(0); setHasSubmittedBefore(false); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/peer-review/me", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) {
          setCredits(data.credits as number);
          setHasSubmittedBefore((data.submissions as MySubmission[]).length > 0);
        }
      } catch { /* leave null */ }
    })();
    return () => ctrl.abort();
  }, []);

  // First submission is free (nothing would exist to earn credits by
  // reviewing otherwise) — the credit gate only applies from the second on.
  const canSubmit = hasSubmittedBefore === false || (credits ?? 0) >= 3;

  async function submit() {
    if (!getToken()) { setErr("Sign in to submit a draft."); return; }
    setSending(true);
    setErr(null);
    try {
      const res = await authFetch("/api/peer-review/submissions", {
        method: "POST",
        body: JSON.stringify({ doc_type: docType, target, focus_question: focus || undefined, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't submit");
      onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Document type</span>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input text-sm">
            <option>Statement of Purpose</option>
            <option>Personal Statement</option>
            <option>Scholarship Essay</option>
            <option>Motivation Letter (DE)</option>
            <option>Cover Letter</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Target</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} className="input text-sm" placeholder="e.g. MSc CS · University of Toronto" />
        </label>
      </div>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">What specifically do you want feedback on? (optional)</span>
        <input value={focus} onChange={(e) => setFocus(e.target.value)} className="input text-sm" placeholder="e.g. Is my fit paragraph specific enough?" />
      </label>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-ink-600 mb-1.5">Paste your draft</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className="input min-h-[180px] text-sm" placeholder="Paste the full text here (min 50 characters)..." />
      </label>

      <div className="rounded-md bg-clay-500/10 border border-clay-500/25 px-4 py-3 mb-4 flex items-start gap-3">
        <Lock size={16} className="text-clay-600 mt-0.5 shrink-0" />
        <div className="text-sm text-ink-700">
          {credits === null || hasSubmittedBefore === null ? (
            "Checking your review credits..."
          ) : hasSubmittedBefore === false ? (
            "Your first submission is free — after that, you'll need 3 review credits per submission."
          ) : canSubmit ? (
            <>You have <span className="font-medium text-clay-600">{credits} review credits</span> — enough to submit.</>
          ) : (
            <>You have <span className="font-medium text-clay-600">{Math.max(credits, 0)} review credits</span>. Review {3 - Math.max(credits, 0)} more draft{3 - Math.max(credits, 0) === 1 ? "" : "s"} in the queue first.</>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <button onClick={submit} disabled={!canSubmit || sending || body.trim().length < 50} className="btn-accent w-full disabled:opacity-50">
        {sending ? <><Loader2 size={13} className="animate-spin" /> Submitting...</> : <><Upload size={13} /> Submit for review</>} <ArrowRight size={13} />
      </button>
    </div>
  );
}

function MySubmissionsView({ refreshKey }: { refreshKey: number }) {
  const [submissions, setSubmissions] = useState<MySubmission[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { setSubmissions([]); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await authFetch("/api/peer-review/me", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Couldn't load submissions");
        setSubmissions(data.submissions as MySubmission[]);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setSubmissions([]);
      }
    })();
    return () => ctrl.abort();
  }, [refreshKey]);

  if (!getToken()) {
    return <div className="card text-center py-10 text-sm text-ink-500">Sign in to see your submissions.</div>;
  }

  return (
    <div className="space-y-3">
      {err && <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">{err}</div>}
      {submissions === null && !err && (
        <div className="card text-center py-10 text-ink-500"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading...</div>
      )}
      {submissions !== null && submissions.length === 0 && (
        <div className="card text-center py-10 text-sm text-ink-500">You haven&apos;t submitted anything yet.</div>
      )}
      {submissions?.map((s) => {
        const awaiting = s.reviews_count < s.reviews_needed;
        return (
          <article key={s.id} className="card flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-cream-200 text-ink-700 flex items-center justify-center shrink-0">
              <MessageCircle size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-900">{s.target} ({s.doc_type})</p>
              <p className="text-xs text-ink-500 mt-0.5">{s.reviews_count}/{s.reviews_needed} reviews in</p>
            </div>
            {awaiting ? (
              <span className="badge !bg-amber-500/15 !text-amber-500 text-[10px]">Awaiting reviews</span>
            ) : (
              <div className="text-right">
                <p className="text-sm font-semibold text-clay-600">{Math.round(Number(s.avg_score))}/100</p>
                <p className="text-[10px] text-ink-500">aggregate</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
