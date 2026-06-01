"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, Globe, Calendar, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

type RawMentor = {
  id: string;
  full_name: string;
  country_of_origin: string | null;
  country_of_residence: string | null;
  expertise_areas: string[] | null;
  years_abroad: number | null;
  trust_score: number;
};

type Mentor = {
  id: string; name: string; from: string; years: number; field: string; verified: boolean;
};

function mapMentor(r: RawMentor): Mentor {
  const from = r.country_of_origin && r.country_of_residence
    ? `${r.country_of_origin} → ${r.country_of_residence}`
    : r.country_of_residence ?? "International";
  return {
    id: r.id,
    name: r.full_name,
    from,
    years: r.years_abroad ?? 0,
    field: (r.expertise_areas && r.expertise_areas[0]) ?? "Mentorship",
    verified: true,
  };
}

const events = [
  { title: "Ghanaian students in Toronto — monthly meetup", date: "Mar 12 · 6pm", city: "Toronto" },
  { title: "UK visa Q&A with verified mentor", date: "Mar 18 · 7pm GMT", city: "Virtual" },
  { title: "Berlin newcomer welcome dinner", date: "Mar 22 · 7pm", city: "Berlin" },
];

export default function CommunityPage() {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
      <div>
        <p className="text-sm font-medium text-clay-600">MENTORSHIP NETWORK</p>
        <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
          Find your people abroad.
        </h1>
        <p className="mt-2 text-ink-600 max-w-2xl">
          Connect with people from your origin country who&apos;ve lived your destination for years.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-ink-900">Verified mentors</h2>
          <button className="text-sm font-medium text-clay-600 hover:underline">View all</button>
        </div>
        {err && (
          <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600 mb-4">
            Couldn&apos;t load mentors: {err}
          </div>
        )}
        {mentors === null && !err && (
          <div className="card text-center py-10 text-ink-500">
            <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading mentors...
          </div>
        )}
        {mentors && mentors.length === 0 && (
          <div className="card text-center py-10 text-ink-500">No verified mentors yet.</div>
        )}
        {mentors && mentors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mentors.map((m) => (
              <div key={m.id} className="card flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center font-medium shrink-0">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-ink-900 truncate">{m.name}</h3>
                    {m.verified && <ShieldCheck size={12} className="text-leaf-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-ink-500">{m.from}</p>
                  <p className="text-sm text-ink-700 mt-2">{m.field}</p>
                  <p className="text-xs text-ink-500 mt-1">{m.years} years abroad</p>
                  <Link
                    href={`/community/mentors/${m.id}`}
                    className="mt-3 text-sm font-medium text-clay-600 hover:underline flex items-center gap-1"
                  >
                    View profile <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-clay-500" />
            <h3 className="font-display text-lg font-semibold text-ink-900">Cultural hubs</h3>
          </div>
          <ul className="space-y-2">
            {["Ghanaians in Canada · 1,240 members", "Nigerians in UK · 2,100 members", "Indians in Germany · 890 members", "Latinos in USA · 3,400 members"].map((c) => (
              <li key={c} className="flex items-center justify-between py-2 border-b border-cream-200 last:border-0">
                <span className="text-sm text-ink-800 flex items-center gap-2">
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
            <h3 className="font-display text-lg font-semibold text-ink-900">Upcoming events</h3>
          </div>
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.title} className="p-3 rounded-lg border border-cream-200 hover:border-cream-300">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-500 mt-1">{e.date} · {e.city}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
