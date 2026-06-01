"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ShieldCheck, Quote, Calendar, GraduationCap, Award, MapPin, MessageCircle, Share2, ThumbsUp, ChevronRight, Loader2,
} from "lucide-react";

type Story = {
  id: string; name: string; initials: string;
  origin: string; originFlag: string; destination: string; destFlag: string;
  program: string; year: string; outcome: string;
  hero: string; // gradient
  intro: string;
  chapters: { title: string; body: string }[];
  stats: { label: string; value: string }[];
  related: { id: string; name: string; initials: string; outcome: string }[];
};

type RawStory = {
  id: string; name: string; origin: string; origin_flag: string;
  destination: string; dest_flag: string; program: string | null;
  outcome: string; year: string | null; quote: string;
  before_text: string | null; after_text: string | null; body: string | null;
};

type Related = { id: string; name: string; outcome: string };

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function mapStory(r: RawStory, related: Related[]): Story {
  const chapters = [];
  if (r.before_text) chapters.push({ title: "Before GlobalBridge", body: r.before_text });
  if (r.body) chapters.push({ title: "The journey", body: r.body });
  if (r.after_text) chapters.push({ title: "The outcome", body: r.after_text });
  if (!chapters.length) chapters.push({ title: "The story", body: r.quote });

  return {
    id: r.id,
    name: r.name,
    initials: initialsOf(r.name),
    origin: r.origin,
    originFlag: r.origin_flag,
    destination: r.destination,
    destFlag: r.dest_flag,
    program: r.program ?? "",
    year: r.year ?? "",
    outcome: r.outcome,
    hero: "bg-gradient-to-br from-clay-500 to-clay-700",
    intro: r.quote,
    chapters,
    stats: [
      { label: "Origin", value: r.origin.split(",")[0] },
      { label: "Destination", value: r.destination.split(",")[0] },
      { label: "Outcome", value: r.outcome.split(" ")[0] },
      { label: "Year", value: r.year ?? "—" },
    ],
    related: related.map((rl) => ({ id: rl.id, name: rl.name, initials: initialsOf(rl.name), outcome: rl.outcome })),
  };
}

export default function StoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Story | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/content/stories/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setS(mapStory(data.story as RawStory, (data.related ?? []) as Related[]));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  if (err) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/stories" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to stories
        </Link>
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load this story: {err}
        </div>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" /> Loading story...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/stories" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to stories
      </Link>

      {/* Hero */}
      <article className={`rounded-xl overflow-hidden relative aspect-[16/7] ${s.hero} text-white p-8 flex items-end mb-8`}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        <div className="relative max-w-2xl">
          <span className="badge !bg-white/20 !text-white text-[10px] backdrop-blur">{s.year} · {s.outcome}</span>
          <h1 className="mt-3 text-3xl md:text-4xl font-display font-semibold leading-tight">{s.name}&apos;s story</h1>
          <p className="mt-2 text-sm text-white/85 flex items-center gap-2">
            <span className={`fi fi-${s.originFlag}`} /> {s.origin}
            <span>→</span>
            <span className={`fi fi-${s.destFlag}`} /> {s.destination}
          </p>
        </div>
      </article>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {s.stats.map((st) => (
          <div key={st.label} className="card text-center">
            <p className="text-2xl font-display font-semibold text-clay-600">{st.value}</p>
            <p className="text-xs text-ink-500 mt-1">{st.label}</p>
          </div>
        ))}
      </div>

      {/* Profile mini */}
      <div className="card mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-lg font-display font-semibold shrink-0">
          {s.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink-900 flex items-center gap-1.5">
            {s.name}
            <ShieldCheck size={13} className="text-leaf-600" />
          </p>
          <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
            <GraduationCap size={11} /> {s.program}
          </p>
        </div>
        <Link href={`/messages?to=${s.id}`} className="btn-ghost border border-cream-300 text-sm">
          <MessageCircle size={13} /> Message
        </Link>
      </div>

      {/* Intro pullquote */}
      <blockquote className="border-l-4 border-clay-500 pl-5 py-2 mb-10">
        <Quote size={20} className="text-clay-500 mb-2" />
        <p className="text-lg text-ink-800 italic leading-relaxed">{s.intro}</p>
      </blockquote>

      {/* Chapters */}
      <div className="space-y-8">
        {s.chapters.map((c, i) => (
          <section key={i}>
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-3 flex items-start gap-3">
              <span className="text-clay-500 font-mono text-base mt-2">0{i + 1}</span>
              {c.title}
            </h2>
            <p className="text-base text-ink-700 leading-relaxed">{c.body}</p>
          </section>
        ))}
      </div>

      {/* Actions */}
      <div className="card mt-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="btn-ghost border border-cream-300 text-sm"><ThumbsUp size={13} /> Helpful</button>
          <button className="btn-ghost border border-cream-300 text-sm"><Share2 size={13} /> Share</button>
        </div>
        <Link href="/stories" className="text-sm text-clay-600 font-medium hover:underline inline-flex items-center gap-1">
          Read more stories <ChevronRight size={13} />
        </Link>
      </div>

      {/* Related */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <Award size={16} className="text-clay-500" /> More success stories
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {s.related.map((r) => (
            <Link key={r.id} href={`/stories/${r.id}`} className="card flex items-center gap-3 hover:border-clay-300 transition">
              <div className="w-10 h-10 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {r.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{r.name}</p>
                <p className="text-xs text-ink-500 truncate flex items-center gap-1"><MapPin size={10} /> {r.outcome}</p>
              </div>
              <ChevronRight size={13} className="text-ink-400 ml-auto" />
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink-500 mt-10 text-center">
        <Calendar size={11} className="inline mr-1" /> Published {s.year} · Verified against {s.name.split(" ")[0]}&apos;s profile + uploaded documents.
      </p>
    </div>
  );
}
