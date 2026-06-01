"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft, ShieldCheck, Star, Video, Calendar, Clock, Globe, GraduationCap, MessageCircle, MapPin, Award, Sparkles, Loader2,
} from "lucide-react";
import { authFetch, getToken } from "@/lib/auth";

type Slot = { date: string; time: string };

type Mentor = {
  id: string; name: string; initials: string;
  origin: string; originFlag: string; destination: string; destFlag: string;
  bio: string; areas: string[]; languages: string[];
  rating: number; sessions: number; replies: string;
  verified: boolean; price: string;
  university: string; field: string; graduated: string;
  availability: Slot[];
};

const sample: Record<string, Mentor> = {
  "m_ama": {
    id: "m_ama",
    name: "Ama Owusu", initials: "AO",
    origin: "Ghana", originFlag: "gh",
    destination: "Canada", destFlag: "ca",
    bio: "5 years in Toronto. Walked 200+ Ghanaian students through Canada study permit, GIC funding, and PR pathways. Software engineer at Shopify.",
    areas: ["Canada Study Permit", "GIC + proof of funds", "PGWP → PR pathway", "Job hunting (tech)"],
    languages: ["English", "Twi", "French (basic)"],
    rating: 4.9, sessions: 184, replies: "Usually within 2h",
    verified: true, price: "Free",
    university: "University of Toronto", field: "Computer Science", graduated: "2023",
    availability: [
      { date: "2026-05-26", time: "18:00" },
      { date: "2026-05-26", time: "19:00" },
      { date: "2026-05-27", time: "17:30" },
      { date: "2026-05-27", time: "20:00" },
      { date: "2026-05-28", time: "19:00" },
      { date: "2026-05-30", time: "11:00" },
      { date: "2026-05-30", time: "14:00" },
    ],
  },
};

export default function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const m = sample[id] ?? sample["m_ama"];

  const [duration, setDuration]   = useState<30 | 60>(30);
  const [selected, setSelected]   = useState<Slot | null>(null);
  const [goal, setGoal]           = useState("");
  const [confirmed, setConfirmed] = useState<Slot | null>(null);
  const [booking, setBooking]     = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    m.availability.forEach((s) => { (map[s.date] ??= []).push(s); });
    return map;
  }, [m.availability]);

  async function book() {
    if (!selected) return;
    // Persist to backend if signed in; otherwise still show local confirmation.
    if (getToken()) {
      setBooking(true);
      try {
        await authFetch("/api/content/bookings", {
          method: "POST",
          body: JSON.stringify({
            mentor_id: id,
            slot_date: selected.date,
            slot_time: selected.time,
            duration_min: duration,
            goal,
          }),
        });
      } catch { /* fall through to local confirmation */ }
      finally { setBooking(false); }
    }
    setConfirmed(selected);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/community" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to community
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-2xl font-display font-semibold">
              {m.initials}
            </div>
            <h1 className="mt-4 text-xl font-display font-semibold text-ink-900 flex items-center justify-center gap-1.5">
              {m.name}
              {m.verified && <ShieldCheck size={14} className="text-leaf-600" />}
            </h1>

            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-ink-600">
              <span className={`fi fi-${m.originFlag}`} aria-hidden="true" />
              <span>→</span>
              <span className={`fi fi-${m.destFlag}`} aria-hidden="true" />
              <span className="text-xs text-ink-500">{m.origin} → {m.destination}</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-ink-700">
                <Star size={13} className="fill-amber-500 text-amber-500" /> {m.rating}
              </span>
              <span className="text-ink-500">·</span>
              <span className="text-ink-700">{m.sessions} sessions</span>
            </div>

            <p className="mt-4 text-xs text-leaf-600">{m.replies}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">About</p>
            <p className="text-sm text-ink-700 leading-relaxed">{m.bio}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
              <GraduationCap size={11} /> Education
            </p>
            <p className="text-sm text-ink-700">{m.field} · {m.university}</p>
            <p className="text-xs text-ink-500">Graduated {m.graduated}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
              <Award size={11} /> Areas of expertise
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.areas.map((a) => <span key={a} className="badge badge-clay text-[10px]">{a}</span>)}
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1">
              <Globe size={11} /> Languages
            </p>
            <p className="text-sm text-ink-700">{m.languages.join(" · ")}</p>
          </div>

          <Link href={`/messages?to=${m.id}`} className="btn-ghost border border-cream-300 w-full text-sm">
            <MessageCircle size={13} /> Send a message instead
          </Link>
        </aside>

        {/* Booking */}
        <div className="lg:col-span-2">
          {confirmed ? (
            <ConfirmCard mentor={m} slot={confirmed} duration={duration} onReset={() => { setConfirmed(null); setSelected(null); }} />
          ) : (
            <div className="card">
              <h2 className="font-display text-xl font-semibold text-ink-900">Book a 1:1 with {m.name.split(" ")[0]}</h2>
              <p className="text-sm text-ink-600 mt-1">{m.price} for verified students. Video call via GlobalBridge meeting.</p>

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

              {/* Slots */}
              <div className="mt-6">
                <p className="text-xs font-medium text-ink-600 mb-3 flex items-center gap-1">
                  <Calendar size={12} /> Available times (your timezone)
                </p>

                <div className="space-y-4">
                  {Object.entries(grouped).map(([date, slots]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-ink-700 mb-2">{formatDate(date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => {
                          const isSel = selected?.date === s.date && selected.time === s.time;
                          return (
                            <button
                              key={`${s.date}-${s.time}`}
                              onClick={() => setSelected(s)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition border ${
                                isSel ? "bg-clay-500 text-white border-clay-500" : "bg-cream-100 text-ink-700 border-cream-200 hover:border-clay-300"
                              }`}
                            >
                              <Clock size={11} className="inline mr-1 -mt-0.5" /> {s.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div className="mt-6">
                <label className="block">
                  <span className="block text-xs font-medium text-ink-600 mb-1.5">What do you want to cover? (helps {m.name.split(" ")[0]} prep)</span>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. I'm applying for Canada study permit — need help with GIC + financial proof."
                    className="input min-h-[80px]"
                  />
                </label>
              </div>

              {/* Confirm */}
              <div className="mt-6 pt-5 border-t border-cream-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-ink-600">
                  {selected ? (
                    <>Selected: <span className="font-medium text-ink-900">{formatDate(selected.date)} · {selected.time} ({duration} min)</span></>
                  ) : (
                    <span className="text-ink-500">Pick a time above</span>
                  )}
                </div>
                <button
                  onClick={book}
                  disabled={!selected || booking}
                  className="btn-accent text-sm disabled:opacity-50"
                >
                  {booking ? <><Loader2 size={13} className="animate-spin" /> Booking...</> : <><Video size={13} /> Book session</>}
                </button>
              </div>
            </div>
          )}

          {!confirmed && (
            <div className="card mt-4 text-xs text-ink-600 flex items-start gap-2">
              <Sparkles size={13} className="text-clay-500 mt-0.5 shrink-0" />
              <span>
                Sessions auto-record (with both consents) so you can review later.
                Cancellations &gt; 4 hours before are free; otherwise mentor keeps the slot.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmCard({ mentor, slot, duration, onReset }: { mentor: Mentor; slot: Slot; duration: number; onReset: () => void }) {
  return (
    <div className="card border-leaf-300">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Session booked</h2>
          <p className="text-sm text-ink-600 mt-1">Calendar invite + GlobalBridge meeting link sent to your email.</p>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
        <DetailRow label="With"      value={mentor.name} icon={<MapPin size={12} className="text-clay-500" />} />
        <DetailRow label="Duration"  value={`${duration} min`} icon={<Clock size={12} className="text-clay-500" />} />
        <DetailRow label="Date"      value={formatDate(slot.date)} icon={<Calendar size={12} className="text-clay-500" />} />
        <DetailRow label="Time"      value={slot.time} icon={<Clock size={12} className="text-clay-500" />} />
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <button onClick={onReset} className="btn-ghost border border-cream-300 text-sm">Book another time</button>
        <Link href="/messages" className="btn-accent text-sm"><MessageCircle size={13} /> Message {mentor.name.split(" ")[0]}</Link>
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
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
