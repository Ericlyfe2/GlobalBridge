"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Headphones, Play, Video, Mic, ShieldCheck, Clock, Search, Filter, Sparkles, Loader2, Plus, X,
} from "lucide-react";
import { authFetch, getToken, getUser } from "@/lib/auth";

type Type = "all" | "podcast" | "video" | "vlog";
type Topic = "all" | "visa" | "arrival" | "academic" | "career" | "life";

const types: { key: Type; label: string; icon: React.ReactNode }[] = [
  { key: "all",     label: "All",      icon: <Sparkles size={13} /> },
  { key: "podcast", label: "Podcasts", icon: <Mic size={13} /> },
  { key: "video",   label: "Videos",   icon: <Video size={13} /> },
  { key: "vlog",    label: "Vlogs",    icon: <Play size={13} /> },
];

const topics: { key: Topic; label: string }[] = [
  { key: "all",      label: "All topics" },
  { key: "visa",     label: "Visa interviews" },
  { key: "arrival",  label: "First week / arrival" },
  { key: "academic", label: "Academic life" },
  { key: "career",   label: "Career & internships" },
  { key: "life",     label: "Daily life" },
];

const thumbTones = [
  "bg-gradient-to-br from-clay-500 to-clay-700",
  "bg-gradient-to-br from-leaf-500 to-leaf-700",
  "bg-gradient-to-br from-sky-500 to-sky-700",
  "bg-gradient-to-br from-amber-500 to-amber-600",
];

type Item = {
  id: string; title: string; creator: string; verified: boolean;
  type: Exclude<Type, "all">; topic: Exclude<Topic, "all">;
  durationMin: number; published: string; plays: number;
  origin: string; originFlag: string; destination: string; destFlag: string;
  mediaUrl: string; thumb: string;
};

type RawItem = {
  id: string; title: string; creator_name: string; creator_verified: boolean;
  type: string; topic: string; duration_min: number;
  origin: string; origin_flag: string; destination: string; dest_flag: string;
  media_url: string; plays_count: number; created_at: string;
};

function mapItem(r: RawItem, i: number): Item {
  return {
    id: r.id, title: r.title, creator: r.creator_name, verified: r.creator_verified,
    type: r.type as Exclude<Type, "all">, topic: r.topic as Exclude<Topic, "all">,
    durationMin: r.duration_min,
    published: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    plays: r.plays_count,
    origin: r.origin, originFlag: r.origin_flag, destination: r.destination, destFlag: r.dest_flag,
    mediaUrl: r.media_url, thumb: thumbTones[i % thumbTones.length],
  };
}

const typeIcon = {
  podcast: <Headphones size={14} />,
  video:   <Video size={14} />,
  vlog:    <Play size={14} />,
};

export default function LibraryPage() {
  const [type, setType]   = useState<Type>("all");
  const [topic, setTopic] = useState<Topic>("all");
  const [q, setQ]         = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  // Starts false to match the server (no localStorage there); resolved after
  // mount so this doesn't cause a hydration mismatch for signed-in mentors.
  const [canContribute, setCanContribute] = useState(false);
  useEffect(() => { setCanContribute(getUser()?.role === "mentor"); }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/library/items", { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setItems((data.items as RawItem[]).map(mapItem));
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
        setItems([]);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    return (items ?? []).filter((i) => {
      if (type !== "all" && i.type !== type) return false;
      if (topic !== "all" && i.topic !== topic) return false;
      if (q && !`${i.title} ${i.creator}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, type, topic, q]);

  const featured = (items ?? [])[0];

  async function play(item: Item) {
    window.open(item.mediaUrl, "_blank", "noopener,noreferrer");
    try {
      const res = await fetch(`/api/library/items/${item.id}/play`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setItems((arr) => (arr ?? []).map((i) => (i.id === item.id ? { ...i, plays: data.plays_count } : i)));
    } catch { /* play count is best-effort */ }
  }

  function handleContributed(item: Item) {
    setItems((arr) => [item, ...(arr ?? [])]);
    setContributeOpen(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-ink-900">Podcast &amp; Video Library</h1>
            <p className="text-sm text-ink-600 mt-0.5">
              Authentic student stories. Visa interview prep videos. Arrival vlogs. Contributed by verified mentors.
            </p>
          </div>
        </div>
        {canContribute && (
          <button onClick={() => setContributeOpen(true)} className="btn-accent text-sm shrink-0">
            <Plus size={13} /> Contribute
          </button>
        )}
      </header>

      {contributeOpen && (
        <ContributeModal onClose={() => setContributeOpen(false)} onContributed={handleContributed} />
      )}

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600 mb-6">
          Couldn&apos;t load the library: {err}
        </div>
      )}

      {items === null && !err && (
        <div className="card text-center py-12 text-ink-500 mb-6">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading library...
        </div>
      )}

      {/* Featured */}
      {featured && (
        <article className={`rounded-xl overflow-hidden mb-8 relative aspect-[16/6] ${featured.thumb} flex items-end p-8 text-white`}>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="relative max-w-2xl">
            <span className="badge !bg-white/20 !text-white text-[10px] backdrop-blur"><Sparkles size={10} /> Most recent</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-display font-semibold">{featured.title}</h2>
            <p className="mt-2 text-sm text-white/85">
              {featured.creator} {featured.verified && "· verified"} · {featured.durationMin} min
            </p>
            <button onClick={() => play(featured)} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-slate-900 font-medium text-sm hover:bg-slate-100 transition">
              <Play size={14} /> Watch now
            </button>
          </div>
        </article>
      )}

      {items !== null && items.length === 0 && !err && (
        <div className="card text-center py-12 text-ink-500 mb-6">
          Nothing here yet. {canContribute ? "Be the first to contribute." : "Check back soon."}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search title or creator" />
        </div>
        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="input text-sm max-w-[180px]">
          {topics.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border border-cream-200 rounded-md p-1 bg-cream-100 w-fit">
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${
              type === t.key ? "bg-clay-500 text-white" : "text-ink-700 hover:bg-cream-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((i) => (
          <article key={i.id} className="card !p-0 overflow-hidden group cursor-pointer hover:border-clay-300 transition" onClick={() => play(i)}>
            <div className={`relative aspect-video ${i.thumb} flex items-center justify-center text-white`}>
              <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/40 transition" />
              <button className="relative w-14 h-14 rounded-full bg-white/90 text-clay-600 flex items-center justify-center group-hover:scale-105 transition">
                {typeIcon[i.type]}
              </button>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/70 text-white text-xs flex items-center gap-1 backdrop-blur">
                <Clock size={10} /> {i.durationMin}m
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-ink-900 leading-snug line-clamp-2">{i.title}</h3>
              <p className="text-xs text-ink-500 mt-1 flex items-center gap-1.5">
                {i.creator}
                {i.verified && <ShieldCheck size={11} className="text-leaf-600" />}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-500">
                <span className="flex items-center gap-1.5">
                  <span className={`fi fi-${i.originFlag}`} aria-hidden="true" />
                  → <span className={`fi fi-${i.destFlag}`} aria-hidden="true" />
                </span>
                <span>{i.plays.toLocaleString()} plays</span>
              </div>
            </div>
          </article>
        ))}

        {items !== null && items.length > 0 && filtered.length === 0 && (
          <div className="col-span-full card text-center text-sm text-ink-500 py-10">
            <Filter size={20} className="mx-auto mb-2 opacity-50" /> Nothing matches these filters.
          </div>
        )}
      </div>

      {!canContribute && (
        <p className="text-xs text-ink-500 mt-8 text-center">
          Want to contribute? Verified mentors can add podcasts and videos directly from this page.
        </p>
      )}
    </div>
  );
}

function ContributeModal({ onClose, onContributed }: { onClose: () => void; onContributed: (item: Item) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Exclude<Type, "all">>("video");
  const [topic, setTopic] = useState<Exclude<Topic, "all">>("visa");
  const [durationMin, setDurationMin] = useState(10);
  const [origin, setOrigin] = useState("");
  const [originFlag, setOriginFlag] = useState("");
  const [destination, setDestination] = useState("");
  const [destFlag, setDestFlag] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) { setErr("Sign in as a verified mentor to contribute."); return; }
    setSending(true);
    setErr(null);
    try {
      const res = await authFetch("/api/library/items", {
        method: "POST",
        body: JSON.stringify({
          title, type, topic, duration_min: durationMin,
          origin, origin_flag: originFlag.toLowerCase(), destination, dest_flag: destFlag.toLowerCase(),
          media_url: mediaUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't publish");
      onContributed(mapItem(data.item as RawItem, 0));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't publish");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="card w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Contribute to the library</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-cream-200"><X size={16} /></button>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" minLength={5} maxLength={200} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as Exclude<Type, "all">)} className="input">
              <option value="video">Video</option>
              <option value="podcast">Podcast</option>
              <option value="vlog">Vlog</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value as Exclude<Topic, "all">)} className="input">
              {topics.slice(1).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Origin</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="input" placeholder="Lagos" required />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Origin flag (ISO-2)</span>
            <input value={originFlag} onChange={(e) => setOriginFlag(e.target.value)} className="input" placeholder="ng" maxLength={2} required />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Destination</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="input" placeholder="Toronto" required />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">Destination flag (ISO-2)</span>
            <input value={destFlag} onChange={(e) => setDestFlag(e.target.value)} className="input" placeholder="ca" maxLength={2} required />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Duration (minutes)</span>
          <input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="input" min={1} max={600} required />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1.5">Media URL (YouTube, Spotify, etc.)</span>
          <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="input" placeholder="https://..." required />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost border border-cream-300 text-sm">Cancel</button>
          <button type="submit" disabled={sending} className="btn-accent text-sm disabled:opacity-50">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Publishing...</> : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
