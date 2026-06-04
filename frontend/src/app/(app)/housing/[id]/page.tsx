"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, ShieldCheck, MapPin, Star, Wifi, Snowflake, Sparkles, Train, GraduationCap, Check, Calendar, Heart, Share2, Loader2,
} from "lucide-react";

async function shareListing(title: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, url }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(url);
  }
}

type Listing = {
  id: string; title: string; city: string; country: string;
  price: number; currency: string; rating: number; reviews: number;
  bedrooms: number; bathrooms: number; sqft: number;
  verified: boolean; available: string;
  landlord: { name: string; initials: string; verified: boolean; replies: string; joined: string };
  photos: string[];
  amenities: string[]; nearby: { label: string; mins: number; icon: string }[];
  description: string;
};

type RawListing = {
  id: string; title: string; description: string | null; city: string; country: string;
  rent_amount: string; currency: string; bedrooms: number | null; bathrooms: number | null;
  furnished: boolean; near_university: string | null; photos: string[] | null; rating: string;
  landlord_name: string; landlord_status: "pending" | "verified" | "rejected";
};

const detailFallbacks = [
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

function detailPick(id: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return detailFallbacks[(Math.abs(hash) + index) % detailFallbacks.length];
}

function mapListing(r: RawListing): Listing {
  const name = r.landlord_name;
  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const amenities = ["Wi-Fi included", "Heating + AC", ...(r.furnished ? ["Furnished"] : []), "Laundry in building", "24/7 security"];
  return {
    id: r.id,
    title: r.title,
    city: r.city,
    country: r.country,
    price: Number(r.rent_amount),
    currency: r.currency,
    rating: Number(r.rating),
    reviews: 12,
    bedrooms: r.bedrooms ?? 0,
    bathrooms: r.bathrooms ?? 1,
    sqft: 0,
    verified: r.landlord_status === "verified",
    available: "Flexible",
    landlord: { name, initials, verified: r.landlord_status === "verified", replies: "Within a day", joined: "2025" },
    photos: Array.from({ length: 4 }, (_, i) => detailPick(r.id, i)),
    amenities,
    nearby: r.near_university
      ? [{ label: r.near_university, mins: 8, icon: "uni" }]
      : [],
    description: r.description ?? "No description provided.",
  };
}

export default function HousingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [l, setL] = useState<Listing | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/housing/${id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setL(mapListing(data.listing as RawListing));
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/housing" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to housing
        </Link>
        <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600">
          Couldn&apos;t load this listing: {err}
        </div>
      </div>
    );
  }

  if (!l) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center text-ink-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" /> Loading...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/housing" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to housing
      </Link>

      {/* Title row */}
      <header className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-ink-900">{l.title}</h1>
            {l.verified && <span className="badge badge-verified"><ShieldCheck size={11} /> Verified landlord</span>}
          </div>
          <div className="mt-2 text-sm text-ink-600 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Star size={12} className="fill-amber-500 text-amber-500" /> {l.rating} · {l.reviews} reviews</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> {l.city}, {l.country}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost border border-cream-300 text-sm"><Heart size={14} /> Save</button>
          <button onClick={() => shareListing(l.title, window.location.href)} className="btn-ghost border border-cream-300 text-sm"><Share2 size={14} /> Share</button>
        </div>
      </header>

      {/* Photos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 rounded-xl overflow-hidden h-[280px] sm:h-[360px]">
        <div className="col-span-2 row-span-2 relative bg-cream-100">
          <Image src={l.photos[0]} alt="" fill sizes="50vw" className="object-cover" />
        </div>
        {l.photos.slice(1, 4).map((url, i) => (
          <div key={i} className="relative bg-cream-100">
            <Image src={url} alt="" fill sizes="25vw" className="object-cover" />
          </div>
        ))}
        <div className="bg-cream-200 flex items-center justify-center text-ink-600 text-sm font-medium hover:bg-cream-300 cursor-pointer transition">+ 8 photos</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center gap-6 text-sm text-ink-700">
              <Stat label="Bedrooms" value={l.bedrooms === 0 ? "Studio" : l.bedrooms} />
              <Stat label="Bathrooms" value={l.bathrooms} />
              <Stat label="Size" value={`${l.sqft} sq ft`} />
              <Stat label="Available" value={l.available} />
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">About this place</h2>
            <p className="text-sm text-ink-700 leading-relaxed">{l.description}</p>
          </div>

          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">What this place offers</h2>
            <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-ink-700">
              {l.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <AmenityIcon name={a} />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">What&apos;s nearby</h2>
            <ul className="space-y-2">
              {l.nearby.map((n) => (
                <li key={n.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-700">
                    {n.icon === "uni" ? <GraduationCap size={14} className="text-clay-500" /> :
                     n.icon === "train" ? <Train size={14} className="text-clay-500" /> :
                     <MapPin size={14} className="text-clay-500" />}
                    {n.label}
                  </span>
                  <span className="text-ink-500">{n.mins} min walk</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Booking sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="card">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-display font-semibold text-ink-900">{l.currency} {l.price.toLocaleString()}</p>
              <span className="text-sm text-ink-500">/ month</span>
            </div>
            <p className="text-xs text-ink-500 mt-1">Utilities included. No agency fee.</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">Move-in date</span>
                <input type="date" defaultValue={l.available} className="input" />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-ink-600 mb-1.5">Lease length</span>
                <select className="input">
                  <option>8 months (academic year)</option>
                  <option>12 months</option>
                  <option>24 months</option>
                </select>
              </label>
            </div>

            <button className="btn-accent w-full mt-4">
              <Calendar size={14} /> Request booking
            </button>
            <p className="text-xs text-ink-500 mt-2 text-center">You won&apos;t be charged yet.</p>

            <div className="mt-4 pt-4 border-t border-cream-200 text-sm text-ink-700 space-y-1">
              <div className="flex justify-between"><span>1 month rent</span><span>{l.currency} {l.price.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Security deposit</span><span>{l.currency} {l.price.toLocaleString()}</span></div>
              <div className="flex justify-between font-semibold pt-2 border-t border-cream-200"><span>Move-in total</span><span>{l.currency} {(l.price * 2).toLocaleString()}</span></div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">Listed by</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-clay-500 text-white flex items-center justify-center text-sm font-semibold">
                {l.landlord.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                  {l.landlord.name}
                  {l.landlord.verified && <ShieldCheck size={12} className="text-leaf-600" />}
                </p>
                <p className="text-xs text-ink-500">Member since {l.landlord.joined}</p>
              </div>
            </div>
            <p className="text-xs text-ink-600 mb-3">Typically replies {l.landlord.replies.toLowerCase()}.</p>
            <Link href={`/messages?to=${l.landlord.initials}`} className="btn-ghost border border-cream-300 w-full text-sm">
              Message landlord
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="font-medium text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}

function AmenityIcon({ name }: { name: string }) {
  if (name.includes("Wi-Fi")) return <Wifi size={14} className="text-clay-500" />;
  if (name.includes("Heating")) return <Snowflake size={14} className="text-sky-600" />;
  if (name.includes("Furnished")) return <Sparkles size={14} className="text-amber-500" />;
  return <Check size={14} className="text-leaf-600" />;
}
