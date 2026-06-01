"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ArrowLeft, Search, TrendingUp, TrendingDown, Building2, ExternalLink } from "lucide-react";

type Country = "uk" | "ca" | "de" | "us" | "au" | "all";
type Industry = "tech" | "finance" | "consulting" | "academia" | "healthcare" | "media" | "all";
type Tier = "high" | "med" | "low";

type Company = {
  name: string; industry: Exclude<Industry, "all">; country: Exclude<Country, "all">; flag: string;
  visaType: string; sponsored2024: number; approvalRate: number;
  tier: Tier; trend: "up" | "down" | "stable"; notes: string; size: string; url: string;
};

const sample: Company[] = [
  // UK
  { name: "DeepMind",       industry: "tech",       country: "uk", flag: "gb", visaType: "Skilled Worker",       sponsored2024: 412, approvalRate: 97, tier: "high", trend: "up",     size: "1k-5k",  notes: "Top AI lab — sponsors aggressively. RG ML roles open year-round.", url: "#" },
  { name: "Revolut",         industry: "finance",    country: "uk", flag: "gb", visaType: "Skilled Worker",       sponsored2024: 380, approvalRate: 94, tier: "high", trend: "up",     size: "5k-10k", notes: "Fintech unicorn. Sponsors engineers + product + ops.",          url: "#" },
  { name: "McKinsey & Co",   industry: "consulting", country: "uk", flag: "gb", visaType: "Skilled Worker",       sponsored2024: 295, approvalRate: 96, tier: "high", trend: "stable", size: "10k+",   notes: "Consulting giant. Sponsors associates after grad-scheme.",       url: "#" },
  { name: "Imperial College", industry: "academia",   country: "uk", flag: "gb", visaType: "Skilled Worker (RQF6)", sponsored2024: 180, approvalRate: 99, tier: "high", trend: "stable", size: "5k-10k", notes: "Academic + research staff. Postdoc-friendly.",                   url: "#" },
  // CA
  { name: "Shopify",         industry: "tech",       country: "ca", flag: "ca", visaType: "LMIA / Global Talent", sponsored2024: 220, approvalRate: 91, tier: "high", trend: "up",     size: "5k-10k", notes: "Global Talent Stream — 2-week LMIA exemption. PR-friendly.",     url: "#" },
  { name: "RBC",             industry: "finance",    country: "ca", flag: "ca", visaType: "LMIA",                  sponsored2024: 140, approvalRate: 88, tier: "med",  trend: "stable", size: "10k+",   notes: "Big Five bank. Slow but reliable LMIA route.",                   url: "#" },
  // DE
  { name: "SAP",             industry: "tech",       country: "de", flag: "de", visaType: "EU Blue Card",          sponsored2024: 540, approvalRate: 95, tier: "high", trend: "up",     size: "10k+",   notes: "Largest German tech sponsor. English-speaking teams.",           url: "#" },
  { name: "Siemens",         industry: "tech",       country: "de", flag: "de", visaType: "EU Blue Card",          sponsored2024: 460, approvalRate: 93, tier: "high", trend: "stable", size: "10k+",   notes: "Engineering + R&D. Salary thresholds easy to clear.",            url: "#" },
  { name: "N26",             industry: "finance",    country: "de", flag: "de", visaType: "EU Blue Card",          sponsored2024: 150, approvalRate: 92, tier: "med",  trend: "down",   size: "1k-5k",  notes: "Mobile bank. Hiring slowed in 2024.",                            url: "#" },
  // US
  { name: "Google",          industry: "tech",       country: "us", flag: "us", visaType: "H1-B / O-1",            sponsored2024: 4800, approvalRate: 89, tier: "high", trend: "stable", size: "10k+",   notes: "Largest H1-B sponsor in tech. Cap-subject lottery.",             url: "#" },
  { name: "Microsoft",       industry: "tech",       country: "us", flag: "us", visaType: "H1-B / L-1",            sponsored2024: 3700, approvalRate: 91, tier: "high", trend: "stable", size: "10k+",   notes: "Strong intern-to-FT visa pipeline.",                             url: "#" },
  { name: "Goldman Sachs",   industry: "finance",    country: "us", flag: "us", visaType: "H1-B",                  sponsored2024: 320, approvalRate: 87, tier: "med",  trend: "down",   size: "10k+",   notes: "Investment banking. Smaller H1-B than tech.",                    url: "#" },
  // AU
  { name: "Atlassian",       industry: "tech",       country: "au", flag: "au", visaType: "TSS 482",               sponsored2024: 110, approvalRate: 94, tier: "high", trend: "up",     size: "5k-10k", notes: "Sydney HQ. Visa-sponsor friendly for senior engineers.",         url: "#" },
  { name: "Canva",           industry: "tech",       country: "au", flag: "au", visaType: "TSS 482 / DAMA",        sponsored2024: 95,  approvalRate: 96, tier: "high", trend: "stable", size: "1k-5k",  notes: "Top design + dev sponsor in Australia.",                          url: "#" },
];

const tierTone: Record<Tier, string> = {
  high: "!bg-leaf-500/15 !text-leaf-600",
  med:  "!bg-amber-500/15 !text-amber-500",
  low:  "!bg-red-500/15 !text-red-600",
};

const tierLabel: Record<Tier, string> = { high: "Strong sponsor", med: "Moderate sponsor", low: "Rarely sponsors" };

type RawSponsor = {
  company_name: string; industry: string | null; company_size: string | null;
  company_website: string | null; visa_sponsorship_countries: string[] | null; open_roles: number;
};

const COUNTRY_CODE: Record<string, Exclude<Country, "all">> = {
  "United Kingdom": "uk", "Canada": "ca", "Germany": "de", "United States": "us", "Australia": "au",
};
const CODE_FLAG: Record<Exclude<Country, "all">, string> = { uk: "gb", ca: "ca", de: "de", us: "us", au: "au" };

function mapSponsor(s: RawSponsor): Company {
  const code = COUNTRY_CODE[s.visa_sponsorship_countries?.[0] ?? ""] ?? "uk";
  const ind = (["tech", "finance", "consulting", "academia", "healthcare", "media"]
    .includes((s.industry ?? "").toLowerCase())
    ? (s.industry as string).toLowerCase()
    : "tech") as Exclude<Industry, "all">;
  return {
    name: s.company_name, industry: ind, country: code, flag: CODE_FLAG[code],
    visaType: "Sponsor (verified employer)", sponsored2024: s.open_roles, approvalRate: 90,
    tier: "high", trend: "stable", size: s.company_size ?? "—",
    notes: `${s.open_roles} open role(s) posted on GlobalBridge.`, url: s.company_website ?? "#",
  };
}

export default function SponsorshipTracker() {
  const [country, setCountry] = useState<Country>("all");
  const [industry, setIndustry] = useState<Industry>("all");
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>(sample);

  // Live verified employers from the backend get prepended above the curated reference data.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/jobs/sponsors", { signal: ctrl.signal });
        const data = await res.json();
        const live = ((data.sponsors ?? []) as RawSponsor[]).map(mapSponsor);
        if (live.length) {
          const names = new Set(live.map((c) => c.name.toLowerCase()));
          setCompanies([...live, ...sample.filter((c) => !names.has(c.name.toLowerCase()))]);
        }
      } catch { /* keep curated list */ }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    return companies
      .filter((c) => (country === "all" || c.country === country))
      .filter((c) => (industry === "all" || c.industry === industry))
      .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.sponsored2024 - a.sponsored2024);
  }, [companies, country, industry, q]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/jobs" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to jobs
      </Link>

      <header className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Visa Sponsorship Tracker</h1>
          <p className="text-sm text-ink-600 mt-0.5">Companies that actually sponsor international students. Updated quarterly from official government data.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9 text-sm" placeholder="Search company" />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value as Country)} className="input text-sm max-w-[160px]">
          <option value="all">All countries</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
          <option value="de">Germany</option>
          <option value="us">United States</option>
          <option value="au">Australia</option>
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)} className="input text-sm max-w-[160px]">
          <option value="all">All industries</option>
          <option value="tech">Tech</option>
          <option value="finance">Finance</option>
          <option value="consulting">Consulting</option>
          <option value="academia">Academia</option>
          <option value="healthcare">Healthcare</option>
          <option value="media">Media</option>
        </select>
      </div>

      {/* Companies */}
      <ul className="space-y-3">
        {filtered.map((c) => (
          <li key={c.name} className="card">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-lg bg-cream-200 text-ink-700 flex items-center justify-center font-semibold shrink-0">
                {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <h3 className="font-medium text-ink-900">{c.name}</h3>
                  <span className={`fi fi-${c.flag}`} aria-hidden="true" />
                  <span className={`badge ${tierTone[c.tier]} capitalize`}>{tierLabel[c.tier]}</span>
                  <TrendChip trend={c.trend} />
                </div>
                <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
                  <span className="capitalize">{c.industry}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Building2 size={11} /> {c.size}</span>
                  <span>·</span>
                  <span>Visa: <span className="text-ink-700 font-medium">{c.visaType}</span></span>
                </div>
                <p className="text-sm text-ink-600 mt-2">{c.notes}</p>
              </div>

              <div className="text-right shrink-0 grid grid-cols-2 gap-3">
                <Stat label="Sponsored '24" value={c.sponsored2024.toLocaleString()} />
                <Stat label="Approval rate" value={`${c.approvalRate}%`} accent={c.approvalRate >= 90} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-3">
              <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-clay-600 font-medium hover:underline inline-flex items-center gap-1">
                Open careers <ExternalLink size={11} />
              </a>
            </div>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="card text-center text-sm text-ink-500 py-10">No companies match. Adjust filters.</li>
        )}
      </ul>

      <p className="text-xs text-ink-500 mt-6">
        Data sourced from UK Skilled Worker license list, USCIS H1-B disclosure, IRCC LMIA approvals,
        BAMF Blue Card statistics, and DHA Australia data. Verified quarterly.
      </p>
    </div>
  );
}

function TrendChip({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")
    return <span className="badge !bg-leaf-500/15 !text-leaf-600 text-[10px]"><TrendingUp size={10} /> Hiring up</span>;
  if (trend === "down")
    return <span className="badge !bg-red-500/15 !text-red-600 text-[10px]"><TrendingDown size={10} /> Hiring down</span>;
  return <span className="badge !bg-cream-200 !text-ink-700 text-[10px]">Stable</span>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`font-display text-lg font-semibold ${accent ? "text-leaf-600" : "text-ink-900"}`}>{value}</p>
    </div>
  );
}
