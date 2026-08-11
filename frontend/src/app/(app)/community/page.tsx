"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Users, Globe, Calendar, ArrowRight, ShieldCheck, Loader2, MessageCircle,
  Lightbulb, X,
} from "lucide-react";
import { AtlasPortrait } from "@/components/mascot/AtlasPortrait";

type RawMentor = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  country_of_origin: string | null;
  country_of_residence: string | null;
  bio: string | null;
  expertise_areas: string[] | null;
  years_abroad: number | null;
  trust_score: number;
};

type Mentor = {
  id: string; name: string; avatarUrl: string | null; from: string; destination: string | null;
  years: number; expertise: string[]; bio: string | null; verified: boolean;
};

function mapMentor(r: RawMentor): Mentor {
  const from = r.country_of_origin && r.country_of_residence
    ? `${r.country_of_origin} → ${r.country_of_residence}`
    : r.country_of_residence ?? "International";
  return {
    id: r.id,
    name: r.full_name,
    avatarUrl: r.avatar_url,
    from,
    destination: r.country_of_residence,
    years: r.years_abroad ?? 0,
    expertise: r.expertise_areas ?? [],
    bio: r.bio,
    verified: true, // the /mentors endpoint already filters to verification_status = 'verified'
  };
}

// Cultural hubs and events aren't backed by a real endpoint yet — no
// group-membership or events table exists in the schema. Kept as illustrative
// placeholders (as the page already had before this pass) rather than wired
// to fake interactivity; the "Join" / event list are visual only.
const CULTURAL_HUBS = [
  "Ghanaians in Canada · 1,240 members",
  "Nigerians in UK · 2,100 members",
  "Indians in Germany · 890 members",
  "Latinos in USA · 3,400 members",
];

const events = [
  { title: "Ghanaian students in Toronto — monthly meetup", date: "Mar 12 · 6pm", city: "Toronto" },
  { title: "UK visa Q&A with verified mentor", date: "Mar 18 · 7pm GMT", city: "Virtual" },
  { title: "Berlin newcomer welcome dinner", date: "Mar 22 · 7pm", city: "Berlin" },
];

export default function CommunityPage() {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [expertiseFilter, setExpertiseFilter] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/users/mentors", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setMentors((data.mentors as RawMentor[]).map(mapMentor));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, []);

  // Real, client-side filtering over what actually came back from the API —
  // there's no backend query-param support for this yet, so this is the
  // honest version rather than a filter panel that silently does nothing.
  const countries = useMemo(
    () => Array.from(new Set((mentors ?? []).map((m) => m.destination).filter((c): c is string => !!c))).sort(),
    [mentors],
  );
  const expertiseTags = useMemo(
    () => Array.from(new Set((mentors ?? []).flatMap((m) => m.expertise))).sort(),
    [mentors],
  );
  const filteredMentors = useMemo(() => {
    if (!mentors) return null;
    return mentors.filter((m) => {
      if (countryFilter && m.destination !== countryFilter) return false;
      if (expertiseFilter && !m.expertise.includes(expertiseFilter)) return false;
      return true;
    });
  }, [mentors, countryFilter, expertiseFilter]);

  const hasActiveFilters = !!(countryFilter || expertiseFilter);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
      <div>
        <p className="text-sm font-medium text-clay-600">MENTORSHIP NETWORK</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900 dark:text-white tracking-tight">
          Find your people abroad.
        </h1>
        <p className="mt-2 text-ink-600 dark:text-gray-400 max-w-2xl">
          Connect with people from your origin country who&apos;ve lived your destination for years.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Mentors grid */}
        <section className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">
              Verified mentors {filteredMentors && `(${filteredMentors.length})`}
            </h2>
            {hasActiveFilters && (
              <button
                onClick={() => { setCountryFilter(null); setExpertiseFilter(null); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-clay-600 hover:text-clay-700"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {err && (
            <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
              Couldn&apos;t load mentors: {err}
            </div>
          )}
          {mentors === null && !err && (
            <div className="card text-center py-10 text-ink-500">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading mentors...
            </div>
          )}
          {filteredMentors && filteredMentors.length === 0 && (
            <div className="card text-center py-10 text-ink-500">
              {mentors && mentors.length > 0 ? "No mentors match these filters." : "No verified mentors yet."}
            </div>
          )}
          {filteredMentors && filteredMentors.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredMentors.map((m) => (
                <div key={m.id} className="card flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    {m.avatarUrl ? (
                      <Image
                        src={m.avatarUrl} alt={m.name} width={48} height={48}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center font-medium shrink-0">
                        {m.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-ink-900 dark:text-white truncate">{m.name}</h3>
                        {m.verified && <ShieldCheck size={12} className="text-leaf-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-ink-500 dark:text-gray-400">{m.from}</p>
                      <p className="text-xs text-ink-500 dark:text-gray-400 mt-0.5">{m.years} years abroad</p>
                    </div>
                  </div>

                  {m.bio && (
                    <p className="text-sm text-ink-700 dark:text-gray-300 line-clamp-2">{m.bio}</p>
                  )}

                  {m.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.expertise.slice(0, 3).map((e) => (
                        <span key={e} className="px-2 py-0.5 rounded-full bg-cream-100 dark:bg-gray-800 text-ink-600 dark:text-gray-300 text-[11px] font-medium border border-cream-200 dark:border-gray-700">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto pt-1">
                    <Link
                      href={`/community/mentors/${m.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-clay-600 px-3 py-2 text-xs font-semibold text-white hover:bg-clay-700"
                    >
                      View profile <ArrowRight size={12} />
                    </Link>
                    <Link
                      href={`/messages?to=${m.id}`}
                      aria-label={`Message ${m.name}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-cream-200 dark:border-gray-700 text-ink-600 dark:text-gray-300 hover:border-clay-300"
                    >
                      <MessageCircle size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Atlas tip + filters */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-clay-500/20 bg-gradient-to-br from-clay-500/5 via-white to-cream-100 p-5 dark:from-clay-500/10 dark:via-gray-900 dark:to-gray-900">
            <AtlasPortrait size={64} className="pointer-events-none absolute -right-2 -top-2 opacity-90" />
            <div className="pr-14">
              <h4 className="flex items-center gap-1.5 font-semibold text-clay-700 dark:text-clay-300 mb-2">
                <Lightbulb size={16} /> Atlas says:
              </h4>
              <p className="text-sm text-ink-600 dark:text-gray-400 leading-relaxed">
                Reach out early. Mentors who&apos;ve already made your move know which questions to ask before you even think to ask them.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Find a mentor</h3>
              {hasActiveFilters && (
                <button onClick={() => { setCountryFilter(null); setExpertiseFilter(null); }} className="text-xs font-medium text-clay-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-2">Destination country</label>
                <select
                  value={countryFilter ?? ""}
                  onChange={(e) => setCountryFilter(e.target.value || null)}
                  className="input"
                  disabled={countries.length === 0}
                >
                  <option value="">All countries</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-2">Expertise</label>
                {expertiseTags.length === 0 ? (
                  <p className="text-xs text-ink-400">No expertise tags yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {expertiseTags.map((tag) => {
                      const active = expertiseFilter === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setExpertiseFilter(active ? null : tag)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            active
                              ? "bg-clay-500/10 text-clay-700 border-clay-500/30"
                              : "bg-cream-100 dark:bg-gray-800 text-ink-600 dark:text-gray-300 border-cream-200 dark:border-gray-700 hover:border-clay-300"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-clay-500" />
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Cultural hubs</h3>
          </div>
          <ul className="space-y-2">
            {CULTURAL_HUBS.map((c) => (
              <li key={c} className="flex items-center justify-between py-2 border-b border-cream-200 dark:border-gray-800 last:border-0">
                <span className="text-sm text-ink-800 dark:text-gray-200 flex items-center gap-2">
                  <Users size={13} className="text-ink-500" /> {c}
                </span>
                <button className="text-xs font-medium text-clay-600 hover:underline">Join</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-clay-500" />
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">Upcoming events</h3>
          </div>
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.title} className="p-3 rounded-lg border border-cream-200 dark:border-gray-800 hover:border-cream-300">
                <p className="text-sm font-medium text-ink-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-ink-500 dark:text-gray-400 mt-1">{e.date} · {e.city}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
