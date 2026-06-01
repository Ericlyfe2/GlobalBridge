"use client";

import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft, Users, Calendar, MessageSquare, ShieldCheck, MapPin, Sparkles, Utensils, Music, BookOpen, ChevronRight,
} from "lucide-react";

type Hub = {
  country: string; flag: string; emoji: string;
  destCities: { city: string; flag: string; members: number; }[];
  tips: { icon: React.ReactNode; title: string; body: string }[];
  events: { id: string; title: string; date: string; city: string; rsvp: number }[];
  mentors: { id: string; name: string; initials: string; bio: string; dest: string; destFlag: string }[];
  threads: { id: string; title: string; replies: number; lastReply: string }[];
};

const hubs: Record<string, Hub> = {
  ghana: {
    country: "Ghana", flag: "gh", emoji: "🇬🇭",
    destCities: [
      { city: "Toronto",    flag: "ca", members: 412 },
      { city: "London",     flag: "gb", members: 387 },
      { city: "Berlin",     flag: "de", members: 156 },
      { city: "New York",   flag: "us", members: 203 },
      { city: "Manchester", flag: "gb", members: 178 },
    ],
    tips: [
      { icon: <Utensils size={14} className="text-clay-500" />, title: "Where to find shito + waakye", body: "Toronto: Mosama African Market (Lawrence Ave). London: Tesco Tottenham + Wholesale Foods. Berlin: African Market Charlottenburg." },
      { icon: <Music size={14} className="text-clay-500" />,    title: "Afrobeats nights",          body: "DTH Toronto runs monthly Ghanaian nights. London has weekly Naija/GH parties in Croydon + Peckham." },
      { icon: <BookOpen size={14} className="text-clay-500" />, title: "Tax-treaty tip",            body: "Ghana-Canada double tax treaty exempts the first CAD 14,000 of student earnings. Apply via Form T1213." },
    ],
    events: [
      { id: "e1", title: "Ghana Independence Day potluck",     date: "Mar 6, 2026 · 6pm", city: "Toronto",    rsvp: 47 },
      { id: "e2", title: "KNUST Alumni meetup",                date: "May 18, 2026 · 4pm", city: "London",     rsvp: 22 },
      { id: "e3", title: "Jollof cook-off + Afrobeats night",  date: "Jun 8, 2026 · 7pm", city: "Manchester", rsvp: 38 },
    ],
    mentors: [
      { id: "m_ama",  name: "Ama Owusu",    initials: "AO", bio: "Software engineer at Shopify. 5 yrs in Toronto.",  dest: "Toronto",    destFlag: "ca" },
      { id: "m_kwame", name: "Kwame Adjei", initials: "KA", bio: "MSc Finance, Alliance Manchester. Banking + housing tips.", dest: "Manchester", destFlag: "gb" },
      { id: "m_yaa",  name: "Yaa Boateng",  initials: "YB", bio: "PhD candidate at TU Berlin. DAAD scholar, German language coach.", dest: "Berlin", destFlag: "de" },
    ],
    threads: [
      { id: "t1", title: "Getting your passport back from Ghanaian embassy in Toronto",    replies: 18, lastReply: "2h ago" },
      { id: "t2", title: "Cheapest flights Accra → London (student rate)",                  replies: 41, lastReply: "Yesterday" },
      { id: "t3", title: "Sending money home — Wise vs Western Union vs CryptoP2P",         replies: 64, lastReply: "3d ago" },
    ],
  },
  nigeria: {
    country: "Nigeria", flag: "ng", emoji: "🇳🇬",
    destCities: [
      { city: "Toronto", flag: "ca", members: 612 },
      { city: "London",  flag: "gb", members: 1024 },
      { city: "Houston", flag: "us", members: 489 },
      { city: "Berlin",  flag: "de", members: 217 },
    ],
    tips: [
      { icon: <Utensils size={14} className="text-clay-500" />, title: "Egusi + jollof spots",        body: "London: 805 Restaurant (Old Kent Rd). Toronto: 9ja Style Kitchen (Eglinton). NYC: Buka in Brooklyn." },
      { icon: <BookOpen size={14} className="text-clay-500" />, title: "Form A — CBN tuition route",  body: "Apply 2+ months before tuition due. CBN limits USD 4,000/quarter for studies. See toolkit/fund-transfer." },
    ],
    events: [
      { id: "e1", title: "Naija Independence Day", date: "Oct 1, 2026 · all day", city: "London",  rsvp: 312 },
      { id: "e2", title: "Lagos → Toronto career mixer", date: "Apr 12, 2026 · 6pm", city: "Toronto", rsvp: 84 },
    ],
    mentors: [
      { id: "m_tunde", name: "Tunde Adebayo",  initials: "TA", bio: "Software engineer at Shopify, Lagos → Toronto.", dest: "Toronto", destFlag: "ca" },
      { id: "m_amara", name: "Amara Okafor",   initials: "AO", bio: "MSc Imperial College, Bain consulting in London.", dest: "London", destFlag: "gb" },
    ],
    threads: [
      { id: "t1", title: "BVN + opening Nigerian dom account before leaving",   replies: 92, lastReply: "1h ago" },
      { id: "t2", title: "Ghana vs Naira — which to bring as starter cash?",     replies: 27, lastReply: "Yesterday" },
    ],
  },
  india: {
    country: "India", flag: "in", emoji: "🇮🇳",
    destCities: [
      { city: "Toronto",    flag: "ca", members: 1842 },
      { city: "Berlin",     flag: "de", members: 612 },
      { city: "London",     flag: "gb", members: 1247 },
      { city: "New York",   flag: "us", members: 894 },
      { city: "Sydney",     flag: "au", members: 481 },
    ],
    tips: [
      { icon: <Utensils size={14} className="text-clay-500" />, title: "Where to find pav-bhaji + dosa", body: "Toronto: Gerrard Indian Bazaar. Berlin: Indian Bazaar Kantstraße. London: any Tooting / Wembley street." },
      { icon: <BookOpen size={14} className="text-clay-500" />, title: "Reduced flight fares",            body: "Air India student baggage allowance: 2× 23kg checked + 8kg cabin (vs 1× 23kg normal)." },
    ],
    events: [
      { id: "e1", title: "Diwali celebration",         date: "Nov 1, 2026 · 6pm", city: "Toronto", rsvp: 234 },
      { id: "e2", title: "Holi festival in Berlin",     date: "Mar 14, 2026 · 12pm", city: "Berlin", rsvp: 178 },
    ],
    mentors: [
      { id: "m_priya", name: "Priya Sharma", initials: "PS", bio: "MSc Data Science Imperial. Now data scientist at Revolut.", dest: "London", destFlag: "gb" },
    ],
    threads: [
      { id: "t1", title: "Cooking Indian food in tiny student kitchens — survival guide", replies: 56, lastReply: "3h ago" },
    ],
  },
};

export default function CommunityCountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = use(params);
  const h = hubs[country.toLowerCase()] ?? hubs["ghana"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/community" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to all communities
      </Link>

      {/* Header */}
      <header className="card mb-6 flex items-center gap-5">
        <div className={`w-16 h-16 rounded-xl bg-clay-500/15 text-clay-600 flex items-center justify-center text-4xl shrink-0`}>
          {h.emoji}
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900 flex items-center gap-2">
            {h.country} community
            <span className={`fi fi-${h.flag}`} aria-hidden="true" />
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            {h.destCities.reduce((a, b) => a + b.members, 0).toLocaleString()} members across {h.destCities.length} destination cities.
          </p>
        </div>
      </header>

      {/* Destination cities */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-clay-500" /> Where we are
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {h.destCities.map((c) => (
            <div key={c.city} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`fi fi-${c.flag}`} aria-hidden="true" />
                <span className="font-medium text-ink-900">{c.city}</span>
              </div>
              <span className="text-sm text-clay-600 font-semibold">{c.members.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tips */}
        <section className="card lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-clay-500" /> Local tips
          </h2>
          <ul className="space-y-3">
            {h.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-md bg-cream-100">
                <span className="mt-0.5">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium text-ink-900">{t.title}</p>
                  <p className="text-xs text-ink-600 mt-0.5">{t.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Events */}
        <section className="card">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-clay-500" /> Upcoming events
          </h2>
          <ul className="space-y-3">
            {h.events.map((e) => (
              <li key={e.id} className="border-l-2 border-clay-500 pl-3">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-500">{e.date} · {e.city}</p>
                <p className="text-xs text-leaf-600 mt-1">{e.rsvp} going</p>
              </li>
            ))}
          </ul>
          <button className="btn-ghost border border-cream-300 w-full text-xs mt-4">+ Host an event</button>
        </section>

        {/* Mentors */}
        <section className="card lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Users size={16} className="text-clay-500" /> Verified mentors from {h.country}
          </h2>
          <ul className="space-y-3">
            {h.mentors.map((m) => (
              <li key={m.id}>
                <Link href={`/community/mentors/${m.id}`} className="flex items-start gap-3 p-3 rounded-md hover:bg-cream-100 transition">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                      {m.name}
                      <ShieldCheck size={11} className="text-leaf-600" />
                      <span className={`fi fi-${m.destFlag}`} aria-hidden="true" />
                      <span className="text-xs text-ink-500">{m.dest}</span>
                    </p>
                    <p className="text-xs text-ink-600 mt-0.5">{m.bio}</p>
                  </div>
                  <ChevronRight size={14} className="text-ink-400 mt-2" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Threads */}
        <section className="card">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-clay-500" /> Active threads
          </h2>
          <ul className="space-y-3">
            {h.threads.map((t) => (
              <li key={t.id}>
                <Link href={`/forums/${t.id}`} className="block group">
                  <p className="text-sm text-ink-900 group-hover:text-clay-600 transition">{t.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{t.replies} replies · last {t.lastReply}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/forums" className="text-xs text-clay-600 font-medium hover:underline inline-flex items-center gap-1 mt-4">
            See all forums <ChevronRight size={11} />
          </Link>
        </section>
      </div>
    </div>
  );
}
