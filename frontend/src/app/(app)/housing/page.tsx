"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Bed, Bath, ShieldCheck, Star, Search, SlidersHorizontal, Loader2, Plus } from "lucide-react";
import { SaveButton } from "@/components/SaveButton";

const fallbackImgs = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800",
  "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?w=800",
  "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
];

function pickFallback(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return fallbackImgs[Math.abs(hash) % fallbackImgs.length];
}

type Listing = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  country: string;
  rent_amount: string;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  near_university: string | null;
  photos: string[] | null;
  rating: string;
  landlord_name: string;
  landlord_status: "pending" | "verified" | "rejected";
};

export default function HousingPage() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (city)     params.set("city", city);
        if (maxRent)  params.set("max_rent", maxRent);
        if (currency) params.set("currency", currency);
        const res = await fetch(`/api/housing?${params}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setListings(data.listings);
        setErr(null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => ctrl.abort();
  }, [city, maxRent, currency]);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-clay-600">VERIFIED MARKETPLACE</p>
          <h1 className="mt-1 text-4xl font-display font-semibold text-ink-900 tracking-tight">
            Housing for international students
          </h1>
          <p className="mt-2 text-ink-600">
            Every landlord ID-verified. Every listing reviewed. Roommate matching included.
          </p>
        </div>
        <Link href="/housing/new" className="btn-accent shrink-0">
          <Plus size={15} /> List your place
        </Link>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City, university, or neighborhood..."
            className="input pl-10"
          />
        </div>
        <select value={maxRent} onChange={(e) => setMaxRent(e.target.value)} className="input w-auto">
          <option value="">Any budget</option>
          <option value="500">Under 500</option>
          <option value="1000">Under 1,000</option>
          <option value="1500">Under 1,500</option>
          <option value="2500">Under 2,500</option>
        </select>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-auto">
          <option value="">Any currency</option>
          <option value="CAD">CAD</option>
          <option value="GBP">GBP</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="AUD">AUD</option>
        </select>
        <button className="btn-ghost border border-cream-300">
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      {err && (
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load housing: {err}
        </div>
      )}

      {!listings && !err && (
        <div className="card text-center py-12 text-ink-500">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading listings...
        </div>
      )}

      {listings && listings.length === 0 && (
        <div className="card text-center py-12 text-ink-500">
          No housing matches these filters.
        </div>
      )}

      {listings && listings.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </div>
  );
}

function ListingCard({ l }: { l: Listing }) {
  const isVerified = l.landlord_status === "verified";
  const fallback = pickFallback(l.id);
  const img = (l.photos && l.photos[0]) || fallback;
  return (
    <Link href={`/housing/${l.id}`} className="card !p-0 overflow-hidden group cursor-pointer block">
      <div className="relative aspect-[4/3] bg-cream-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={l.title}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== fallback) target.src = fallback;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {isVerified && (
          <div className="absolute top-3 left-3 badge badge-verified !bg-white/90 backdrop-blur">
            <ShieldCheck size={11} /> Verified landlord
          </div>
        )}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur text-white text-xs font-medium flex items-center gap-1">
          <Star size={11} className="fill-amber-500 text-amber-500" />
          {Number(l.rating).toFixed(1)}
        </div>
        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center">
          <SaveButton type="housing" id={l.id} />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-ink-900 leading-tight">{l.title}</h3>
        <p className="mt-1.5 text-sm text-ink-600 flex items-center gap-1">
          <MapPin size={13} /> {l.city}, {l.country}
        </p>

        <div className="mt-3 flex items-center gap-4 text-sm text-ink-600">
          {l.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed size={13} /> {l.bedrooms === 0 ? "Studio" : `${l.bedrooms} bed`}</span>
          )}
          {l.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath size={13} /> {l.bathrooms} bath</span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-cream-200 flex items-end justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-ink-900">
              {l.currency} {Number(l.rent_amount).toLocaleString()}
            </p>
            <p className="text-xs text-ink-500">/ month</p>
          </div>
          <span className="text-sm font-medium text-clay-600 group-hover:text-clay-700">View →</span>
        </div>
      </div>
    </Link>
  );
}
