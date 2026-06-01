"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Quote, ShieldCheck, GraduationCap, Home, Briefcase, Filter, Loader2 } from "lucide-react";

type Outcome = "admission" | "housing" | "job" | "scholarship";

const outcomeLabels: Record<Outcome, string> = {
  admission: "University admission",
  housing: "Verified housing",
  job: "Job / visa sponsorship",
  scholarship: "Scholarship win",
};

type Story = {
  id: string; name: string; origin: string; dest: string; program: string;
  outcome: Outcome; year: string; quote: string; before: string; after: string;
  initials: string; flagFrom: string; flagTo: string;
};

type RawStory = {
  id: string; name: string; origin: string; origin_flag: string;
  destination: string; dest_flag: string; program: string | null;
  outcome: string; year: string | null; quote: string;
  before_text: string | null; after_text: string | null;
};

function classifyOutcome(o: string): Outcome {
  const s = o.toLowerCase();
  if (s.includes("housing")) return "housing";
  if (s.includes("scholar")) return "scholarship";
  if (s.includes("job") || s.includes("visa-sponsor") || s.includes("work")) return "job";
  return "admission";
}

function mapStory(r: RawStory): Story {
  return {
    id: r.id,
    name: r.name,
    origin: r.origin,
    dest: r.destination,
    program: r.program ?? "",
    outcome: classifyOutcome(r.outcome),
    year: r.year ?? "",
    quote: r.quote,
    before: r.before_text ?? "",
    after: r.after_text ?? "",
    initials: r.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
    flagFrom: r.origin_flag,
    flagTo: r.dest_flag,
  };
}

const filters: { key: Outcome | "all"; label: string; icon: typeof GraduationCap }[] = [
  { key: "all",         label: "All stories",       icon: Quote },
  { key: "admission",   label: "Admission",         icon: GraduationCap },
  { key: "housing",     label: "Housing",           icon: Home },
  { key: "job",         label: "Job / visa",        icon: Briefcase },
  { key: "scholarship", label: "Scholarships",      icon: ShieldCheck },
];

export default function StoriesPage() {
  const [filter, setFilter] = useState<Outcome | "all">("all");
  const [stories, setStories] = useState<Story[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/content/stories", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok) setStories((data.stories as RawStory[]).map(mapStory));
        else setStories([]);
      } catch { setStories([]); }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = (stories ?? []).filter((s) => filter === "all" || s.outcome === filter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-8 text-center max-w-2xl mx-auto">
        <span className="badge badge-clay mb-3">Hall of Fame</span>
        <h1 className="text-3xl md:text-4xl font-display font-semibold text-ink-900">
          Real students. Real outcomes.
        </h1>
        <p className="text-sm text-ink-600 mt-2">
          Verified success stories. Every one fact-checked against the user&apos;s profile and uploaded documents.
        </p>
      </header>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition ${
              filter === f.key ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <f.icon size={13} /> {f.label}
          </button>
        ))}
      </div>

      {stories === null && (
        <div className="card text-center py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading stories...
        </div>
      )}

      {/* Stories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => (
          <Link key={s.id} href={`/stories/${s.id}`} className="card flex flex-col hover:border-clay-300 transition">
            <Quote size={20} className="text-clay-500 mb-3" />
            <p className="text-base text-ink-800 leading-relaxed italic">&ldquo;{s.quote}&rdquo;</p>

            {/* Before / After */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md bg-red-500/5 border border-red-500/15 px-3 py-2">
                <p className="font-semibold text-red-600 mb-1">Before</p>
                <p className="text-ink-700">{s.before}</p>
              </div>
              <div className="rounded-md bg-leaf-500/5 border border-leaf-500/15 px-3 py-2">
                <p className="font-semibold text-leaf-600 mb-1">After</p>
                <p className="text-ink-700">{s.after}</p>
              </div>
            </div>

            <footer className="mt-5 pt-4 border-t border-cream-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {s.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                  {s.name}
                  <ShieldCheck size={12} className="text-leaf-600" />
                </p>
                <p className="text-xs text-ink-500 truncate flex items-center gap-1.5">
                  <span className={`fi fi-${s.flagFrom}`} aria-hidden="true" />
                  → <span className={`fi fi-${s.flagTo}`} aria-hidden="true" />
                  · {s.program}
                </p>
              </div>
              <span className="badge badge-clay !text-[10px] capitalize shrink-0">{outcomeLabels[s.outcome]}</span>
            </footer>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full card text-center text-sm text-ink-500 py-10">
            <Filter size={20} className="mx-auto mb-2 opacity-50" /> No stories match.
          </div>
        )}
      </div>

      <p className="text-xs text-ink-500 mt-8 text-center">
        Want to share yours? <a href="/dashboard/profile" className="text-clay-600 font-medium hover:underline">Submit a story</a> — admin reviews before publishing.
      </p>
    </div>
  );
}
