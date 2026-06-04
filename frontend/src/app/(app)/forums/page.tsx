"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare, ShieldCheck, Pin, TrendingUp, Search, Plus, ArrowUp, Flame, Globe, Loader2,
} from "lucide-react";
import { useDebounce } from "@/lib/useDebounce";

type Category = "all" | "visas" | "housing" | "scholarships" | "life-abroad" | "jobs" | "country";

const categories: { key: Category; label: string; count: number }[] = [
  { key: "all",          label: "All",                  count: 1287 },
  { key: "visas",        label: "Visas & Permits",      count: 384 },
  { key: "housing",      label: "Housing & Arrival",    count: 211 },
  { key: "scholarships", label: "Scholarships & Funding", count: 167 },
  { key: "life-abroad",  label: "Life Abroad",          count: 298 },
  { key: "jobs",         label: "Jobs & Internships",   count: 152 },
  { key: "country",      label: "Country Groups",       count: 75 },
];

type Thread = {
  id: string; title: string; cat: Category; pinned?: boolean; hot?: boolean;
  author: string; verified: boolean; replies: number; views: number; upvotes: number;
  last: string; preview: string;
};

type RawPost = {
  id: string;
  title: string;
  body: string;
  tags: string[] | null;
  upvotes: number;
  answer_count: number;
  created_at: string;
  category_slug: string;
  author_name: string;
  author_role: "student" | "mentor" | "employer" | "admin";
};

const SLUG_TO_CAT: Record<string, Category> = {
  "visa-immigration": "visas",
  "housing":          "housing",
  "scholarships":     "scholarships",
  "culture":          "life-abroad",
  "careers":          "jobs",
  "finance":          "life-abroad",
};

function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function mapPost(p: RawPost): Thread {
  return {
    id: p.id,
    title: p.title,
    cat: SLUG_TO_CAT[p.category_slug] ?? "all",
    pinned: /megathread/i.test(p.title),
    hot: p.upvotes >= 80,
    author: p.author_name,
    verified: p.author_role === "mentor" || p.author_role === "admin",
    replies: p.answer_count,
    views: p.upvotes * 30,   // rough estimate until view tracking lands
    upvotes: p.upvotes,
    last: relativeTime(p.created_at),
    preview: p.body.length > 220 ? p.body.slice(0, 220) + "..." : p.body,
  };
}

export default function ForumsPage() {
  const [cat, setCat] = useState<Category>("all");
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedQ) params.set("search", debouncedQ);
        const res = await fetch(`/api/forums/posts?${params}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setThreads((data.posts as RawPost[]).map(mapPost));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [debouncedQ]);

  const filtered = useMemo(() => {
    const list = threads ?? [];
    return list
      .filter((t) => cat === "all" || t.cat === cat)
      .filter((t) => !debouncedQ || t.title?.toLowerCase().includes(debouncedQ.toLowerCase()))
      .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));
  }, [threads, cat, debouncedQ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="badge badge-clay mb-3">Community</span>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Forums</h1>
          <p className="text-sm text-ink-600 mt-1">Ask. Answer. Verified mentors weigh in.</p>
        </div>
        <button className="btn-accent text-sm"><Plus size={14} /> New thread</button>
      </header>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search threads" />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              cat === c.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            {c.label}
            <span className={`text-[10px] ${cat === c.key ? "text-white/80" : "text-ink-500"}`}>{c.count}</span>
          </button>
        ))}
      </div>

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600 mb-4">
          Couldn&apos;t load threads: {err}
        </div>
      )}

      {threads === null && !err && (
        <div className="card text-center py-10 text-ink-500">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading threads...
        </div>
      )}

      {/* Thread list */}
      <ul className="space-y-3">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link href={`/forums/${t.id}`} className="card flex items-start gap-4 hover:border-clay-300 transition">
              {/* Vote column */}
              <div className="flex flex-col items-center text-xs text-ink-500 shrink-0 w-10 pt-1">
                <ArrowUp size={14} className="text-clay-500" />
                <span className="font-semibold text-ink-900">{t.upvotes}</span>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  {t.pinned && <Pin size={12} className="text-clay-600" />}
                  {t.hot && <Flame size={12} className="text-amber-500" />}
                  <h3 className="font-medium text-ink-900 leading-snug">{t.title}</h3>
                </div>
                <p className="text-sm text-ink-600 mt-1 line-clamp-2">{t.preview}</p>
                <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span className="flex items-center gap-1">
                    {t.author}
                    {t.verified && <ShieldCheck size={11} className="text-leaf-600" />}
                  </span>
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> {t.replies}</span>
                  <span className="flex items-center gap-1"><TrendingUp size={11} /> {t.views} views</span>
                  <span>Last reply {t.last}</span>
                </div>
              </div>

              {/* Category */}
              <span className="badge badge-clay capitalize text-[10px] shrink-0">
                {categories.find((c) => c.key === t.cat)?.label ?? t.cat}
              </span>
            </Link>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">
            <Globe size={20} className="mx-auto mb-2 opacity-50" /> No threads match.
          </li>
        )}
      </ul>
    </div>
  );
}
