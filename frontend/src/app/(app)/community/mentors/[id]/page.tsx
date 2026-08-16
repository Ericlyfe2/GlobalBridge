"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ShieldCheck, Video, Calendar, Clock, Globe, MessageCircle, MapPin, Award, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Mentor = {
  id: string; full_name: string; avatar_url: string | null;
  country_of_origin: string | null; country_of_residence: string | null;
  bio: string | null; trust_score: number; verification_status: string;
  expertise_areas: string[] | null; years_abroad: number | null;
  languages_spoken: string[] | null; universities_attended: string[] | null;
  sessions: number;
};

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export default function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [m, setM] = useState<Mentor | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [duration, setDuration] = useState<30 | 60>(30);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [goal, setGoal] = useState("");
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);
  const [booking, setBooking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/users/mentors/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) { setNotFound(true); return; }
        setM(data.mentor as Mentor);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setNotFound(true);
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  async function book() {
    if (!date || !time) return;
    if (!getToken()) { setErr("Sign in to book a session."); return; }
    setBooking(true);
    setErr(null);
    try {
      const res = await authFetch("/api/content/bookings", {
        method: "POST",
        body: JSON.stringify({
          mentor_id: id, slot_date: date, slot_time: time, duration_min: duration, goal,
          student_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't book this session");
      setConfirmed({ date, time });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't book this session");
    } finally {
      setBooking(false);
    }
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-ink-600">This mentor couldn&apos;t be found.</p>
        <Link href="/community" className="text-sm text-clay-600 hover:underline mt-2 inline-block">Back to community</Link>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={22} className="animate-spin mx-auto mb-2" /> Loading mentor...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/community" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to community
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-2xl font-display font-semibold">
              {initialsOf(m.full_name)}
            </div>
            <h1 className="mt-4 text-xl font-display font-semibold text-ink-900 flex items-center justify-center gap-1.5">
              {m.full_name}
              {m.verification_status === "verified" && <ShieldCheck size={14} className="text-leaf-600" />}
            </h1>

            {(m.country_of_origin || m.country_of_residence) && (
              <p className="mt-1 text-xs text-ink-500">
                {m.country_of_origin} {m.country_of_origin && m.country_of_residence && "→"} {m.country_of_residence}
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <span className="text-ink-700">{m.sessions} session{m.sessions === 1 ? "" : "s"} booked</span>
              {m.years_abroad != null && (
                <>
                  <span className="text-ink-500">·</span>
                  <span className="text-ink-700">{m.years_abroad}y abroad</span>
                </>
              )}
            </div>
          </div>

          {m.bio && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">About</p>
              <p className="text-sm text-ink-700 leading-relaxed">{m.bio}</p>
            </div>
          )}

          {m.universities_attended && m.universities_attended.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Education</p>
              <p className="text-sm text-ink-700">{m.universities_attended.join(", ")}</p>
            </div>
          )}

          {m.expertise_areas && m.expertise_areas.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
                <Award size={11} /> Areas of expertise
              </p>
              <div className="flex flex-wrap gap-1.5">
                {m.expertise_areas.map((a) => <span key={a} className="badge badge-clay text-[10px]">{a}</span>)}
              </div>
            </div>
          )}

          {m.languages_spoken && m.languages_spoken.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
                <Globe size={11} /> Languages
              </p>
              <p className="text-sm text-ink-700">{m.languages_spoken.join(" · ")}</p>
            </div>
          )}

          <Link href={`/messages?to=${m.id}`} className="btn-ghost border border-cream-300 w-full text-sm">
            <MessageCircle size={13} /> Send a message instead
          </Link>
        </aside>

        {/* Booking */}
        <div className="lg:col-span-2">
          {confirmed ? (
            <ConfirmCard mentor={m} date={confirmed.date} time={confirmed.time} duration={duration} onReset={() => { setConfirmed(null); setDate(""); setTime(""); }} />
          ) : (
            <div className="card">
              <h2 className="font-display text-xl font-semibold text-ink-900">Book a 1:1 with {m.full_name.split(" ")[0]}</h2>
              <p className="text-sm text-ink-600 mt-1">Free for verified students. GlobalBridge mentors don&apos;t charge for sessions.</p>

              {/* Duration */}
              <div className="mt-5">
                <p className="text-xs font-medium text-ink-600 mb-2">Session length</p>
                <div className="flex gap-2">
                  {([30, 60] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                        duration === d ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + time — this is a booking request, not a live calendar:
                  the mentor gets notified and confirms via Messages. */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                    <Calendar size={12} /> Preferred date
                  </span>
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5 flex items-center gap-1">
                    <Clock size={12} /> Preferred time
                  </span>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
                </label>
              </div>

              {/* Goal */}
              <div className="mt-6">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5">What do you want to cover? (helps {m.full_name.split(" ")[0]} prep)</span>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. I'm applying for Canada study permit — need help with GIC + financial proof."
                    className="input min-h-[80px]"
                  />
                </label>
              </div>

              {err && <p className="text-sm text-red-600 mt-4">{err}</p>}

              {/* Confirm */}
              <div className="mt-6 pt-5 border-t border-cream-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-ink-600">
                  {date && time ? (
                    <>Requesting: <span className="font-medium text-ink-900">{formatDate(date)} · {time} ({duration} min)</span></>
                  ) : (
                    <span className="text-ink-500">Pick a date and time above</span>
                  )}
                </div>
                <button
                  onClick={book}
                  disabled={!date || !time || booking}
                  className="btn-accent text-sm disabled:opacity-50"
                >
                  {booking ? <><Loader2 size={13} className="animate-spin" /> Requesting...</> : <><Video size={13} /> Request session</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmCard({ mentor, date, time, duration, onReset }: { mentor: Mentor; date: string; time: string; duration: number; onReset: () => void }) {
  return (
    <div className="card border-leaf-300">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Session requested</h2>
          <p className="text-sm text-ink-600 mt-1">{mentor.full_name.split(" ")[0]} has been notified — coordinate the meeting link in Messages once they confirm.</p>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
        <DetailRow label="With"      value={mentor.full_name} icon={<MapPin size={12} className="text-clay-500" />} />
        <DetailRow label="Duration"  value={`${duration} min`} icon={<Clock size={12} className="text-clay-500" />} />
        <DetailRow label="Date"      value={formatDate(date)} icon={<Calendar size={12} className="text-clay-500" />} />
        <DetailRow label="Time"      value={time} icon={<Clock size={12} className="text-clay-500" />} />
      </div>
      <p className="mt-3 text-xs text-ink-500">Times are shown in your local timezone — {mentor.full_name.split(" ")[0]} will see this labeled with your timezone so there's no mix-up.</p>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <button onClick={onReset} className="btn-ghost border border-cream-300 text-sm">Request another time</button>
        <Link href={`/messages?to=${mentor.id}`} className="btn-accent text-sm"><MessageCircle size={13} /> Message {mentor.full_name.split(" ")[0]}</Link>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-md bg-cream-100">
      <p className="text-xs text-ink-500 flex items-center gap-1">{icon} {label}</p>
      <p className="text-ink-900 font-medium">{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
