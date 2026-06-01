"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, MapPin, DollarSign, BedDouble, Bath, ImagePlus, X, Loader2, ShieldCheck, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { authFetch, getToken } from "@/lib/auth";
import { uploadFile } from "@/lib/upload";

const CURRENCIES = ["GBP", "USD", "CAD", "EUR", "AUD", "GHS", "NGN", "INR"];

export default function NewListingPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [address, setAddress] = useState("");
  const [rent, setRent] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [furnished, setFurnished] = useState(false);
  const [nearUniversity, setNearUniversity] = useState("");
  const [tourUrl, setTourUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);

  async function onPhotos(files: FileList | null) {
    if (!files || !files.length) return;
    if (!getToken()) { setErr("Sign in to upload photos."); return; }
    setErr(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const { url } = await uploadFile(file, "housing");
        urls.push(url);
      }
      setPhotos((p) => [...p, ...urls]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((u) => u !== url));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!getToken()) { setErr("Sign in to post a listing."); return; }
    const rentNum = Number(rent);
    if (title.trim().length < 5) { setErr("Title must be at least 5 characters."); return; }
    if (!city.trim() || !country.trim()) { setErr("City and country are required."); return; }
    if (!rentNum || rentNum <= 0) { setErr("Enter a valid rent amount."); return; }

    setSubmitting(true);
    try {
      const res = await authFetch("/api/housing", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          city: city.trim(),
          country: country.trim(),
          address: address.trim() || undefined,
          rent_amount: rentNum,
          currency,
          bedrooms: Number(bedrooms) || undefined,
          bathrooms: Number(bathrooms) || undefined,
          furnished,
          near_university: nearUniversity.trim() || undefined,
          photos: photos.length ? photos : undefined,
          virtual_tour_url: tourUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details?.length
          ? ": " + data.details.map((d: { path: string[]; message: string }) => `${d.path.join(".")} — ${d.message}`).join("; ")
          : "";
        throw new Error((data?.error || `Failed (${res.status})`) + detail);
      }
      router.push(data.listing?.id ? `/housing/${data.listing.id}` : "/housing");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not post listing");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/housing" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to housing
      </Link>

      <header className="mb-8">
        <span className="badge badge-clay mb-3">Landlord</span>
        <h1 className="text-3xl font-display font-semibold text-ink-900">List a property</h1>
        <p className="text-sm text-ink-600 mt-1">
          Listings are reviewed before going live. Verified landlords rank higher and get the trusted badge.
        </p>
      </header>

      {err && <div className="card border-red-300 dark:border-red-900/40 text-sm text-red-600 mb-4">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basics */}
        <Section icon={<Home size={16} />} title="The basics">
          <div className="md:col-span-2">
            <Field label="Listing title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Bright studio 10 min from UofT" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px]" placeholder="Furnishings, bills, distance to campus, house rules..." />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section icon={<MapPin size={16} />} title="Location">
          <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="e.g. Toronto" /></Field>
          <Field label="Country">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              <option>United Kingdom</option><option>Canada</option><option>Germany</option>
              <option>United States</option><option>Australia</option><option>Ireland</option><option>Netherlands</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Address (kept private until booking)"><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="Street, postcode" /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Near university (optional)"><input value={nearUniversity} onChange={(e) => setNearUniversity(e.target.value)} className="input" placeholder="e.g. University of Toronto" /></Field>
          </div>
        </Section>

        {/* Price + rooms */}
        <Section icon={<DollarSign size={16} />} title="Price & rooms">
          <Field label="Rent per month">
            <input type="number" min="0" value={rent} onChange={(e) => setRent(e.target.value)} className="input" placeholder="900" />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Bedrooms">
            <div className="relative">
              <BedDouble size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input pl-9" />
            </div>
          </Field>
          <Field label="Bathrooms">
            <div className="relative">
              <Bath size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="input pl-9" />
            </div>
          </Field>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} className="accent-clay-500" />
            Furnished
          </label>
        </Section>

        {/* Photos */}
        <Section icon={<ImagePlus size={16} />} title="Photos & tour">
          <div className="md:col-span-2">
            <input
              ref={photoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => onPhotos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={uploading}
              className="btn-ghost border border-cream-300 text-sm disabled:opacity-50"
            >
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><ImagePlus size={14} /> Add photos</>}
            </button>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((url) => (
                  <div key={url} className="relative aspect-square rounded-md overflow-hidden border border-cream-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Listing photo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <Field label="Virtual tour link (optional)"><input value={tourUrl} onChange={(e) => setTourUrl(e.target.value)} className="input" placeholder="https://..." /></Field>
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3">
          <div className="flex-1 text-xs text-ink-500 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-leaf-600" /> Submitted listings are reviewed before publication.
          </div>
          <button type="submit" disabled={submitting || uploading} className="btn-accent disabled:opacity-50">
            {submitting ? <><Loader2 size={15} className="animate-spin" /> Posting...</> : "Post listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-4">
        <span className="text-clay-500">{icon}</span> {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
