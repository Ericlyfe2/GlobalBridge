"use client";

import Link from "next/link";
import { useState } from "react";
import { Stethoscope, ArrowLeft, CheckCircle2, ExternalLink, Pill, Activity, AlertTriangle } from "lucide-react";

type Country = "ca" | "uk" | "de" | "us" | "au";

type Plan = {
  country: Country; system: string; coverage: "public" | "private" | "mixed";
  free: boolean; cost: string;
  enroll: string[]; covers: string[]; notCovered: string[]; emergency: string;
};

const plans: Plan[] = [
  {
    country: "ca", system: "OHIP / provincial health card", coverage: "public", free: true, cost: "Free (Ontario, BC, Alberta after 3-month wait — most provinces)",
    enroll: ["Apply within 30 days of arrival", "Bring passport + study permit + lease", "Photo taken at ServiceOntario / equivalent", "Card mailed in 6–8 weeks"],
    covers: ["Doctor visits", "Hospital stays", "Emergency care", "Most lab tests"],
    notCovered: ["Dental, vision", "Prescription drugs (often), unless under 25 in Ontario"],
    emergency: "911",
  },
  {
    country: "uk", system: "NHS via Immigration Health Surcharge (IHS)", coverage: "public", free: false, cost: "£776/year (student rate) — paid w/ visa application",
    enroll: ["Register with a local GP after arrival", "Bring BRP + passport + proof of address", "Get NHS number in 2–3 weeks"],
    covers: ["GP visits", "Hospital", "Emergency", "Prescriptions (£9.90 in England, free in Scotland/Wales)"],
    notCovered: ["Most dental (NHS dental waitlist long)", "Optical"],
    emergency: "999 (or 112)",
  },
  {
    country: "de", system: "GKV statutory health insurance", coverage: "mixed", free: false, cost: "~€110/month (TK, AOK, Barmer student rates)",
    enroll: ["Mandatory for enrolment", "Pick TK / AOK / Barmer (TK is most popular)", "Submit certificate to university", "Card arrives in 2 weeks"],
    covers: ["Doctor visits", "Hospital", "Most prescriptions", "Mental health"],
    notCovered: ["Glasses (limited)", "Most dental beyond basic"],
    emergency: "112",
  },
  {
    country: "us", system: "University-provided plan (mandatory)", coverage: "private", free: false, cost: "$1,500–$3,000/year (varies by school)",
    enroll: ["Auto-enroll via university unless you waive with proof of own plan", "Cards issued at orientation"],
    covers: ["On-campus clinic", "Hospital (in-network)", "Mental health (limited)"],
    notCovered: ["Dental, vision (separate plan)", "Out-of-network can be very expensive"],
    emergency: "911",
  },
  {
    country: "au", system: "Overseas Student Health Cover (OSHC)", coverage: "private", free: false, cost: "AUD 600–800/year (Medibank, BUPA)",
    enroll: ["Mandatory for visa", "Buy before applying for visa", "Single / family / couples rates"],
    covers: ["GP visits", "Hospital", "Some prescriptions", "Ambulance"],
    notCovered: ["Dental, optical (separate extras)", "Pre-existing conditions for first 12 months"],
    emergency: "000",
  },
];

const flags: Record<Country, string> = { ca: "ca", uk: "gb", de: "de", us: "us", au: "au" };
const labels: Record<Country, string> = { ca: "Canada", uk: "United Kingdom", de: "Germany", us: "United States", au: "Australia" };

export default function HealthcarePage() {
  const [country, setCountry] = useState<Country>("ca");
  const p = plans.find((x) => x.country === country)!;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-leaf-500/15 text-leaf-600 flex items-center justify-center shrink-0">
          <Stethoscope size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Healthcare Navigation</h1>
          <p className="text-sm text-ink-600 mt-0.5">How the health system works, what it costs, and how to enroll.</p>
        </div>
      </header>

      {/* Country tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(labels) as Country[]).map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              country === c ? "bg-clay-500 text-white" : "bg-cream-100 text-ink-700 hover:bg-cream-200"
            }`}
          >
            <span className={`fi fi-${flags[c]}`} aria-hidden="true" />
            {labels[c]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-ink-900">{p.system}</h2>
          <p className="mt-2 text-sm text-ink-600">{p.cost}</p>
          <span className={`badge mt-3 ${p.free ? "badge-verified" : "!bg-amber-500/15 !text-amber-500"}`}>
            {p.free ? "Free at point of use" : "Paid plan required"}
          </span>

          <div className="mt-5 p-3 rounded-md bg-red-500/10 text-red-600 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle size={14} /> Emergency: <span className="font-mono">{p.emergency}</span>
          </div>
        </div>

        {/* Steps to enroll */}
        <div className="card lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-4">
            <Activity size={16} className="text-clay-500" /> How to enroll
          </h2>
          <ol className="space-y-3">
            {p.enroll.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-clay-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">{i + 1}</span>
                <span className="text-sm text-ink-700 pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Covers */}
        <div className="card">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-leaf-600 mb-3">
            <CheckCircle2 size={16} /> Covered
          </h3>
          <ul className="space-y-1.5 text-sm text-ink-700">
            {p.covers.map((c) => <li key={c}>• {c}</li>)}
          </ul>
        </div>

        {/* Not covered */}
        <div className="card lg:col-span-2">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-500 mb-3">
            <Pill size={16} /> Often NOT covered
          </h3>
          <ul className="space-y-1.5 text-sm text-ink-700 mb-4">
            {p.notCovered.map((c) => <li key={c}>• {c}</li>)}
          </ul>
          <a href="#" className="text-sm text-clay-600 font-medium hover:underline inline-flex items-center gap-1">
            Compare add-on dental + vision plans <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-6">
        ⚠ Verify enrolment deadlines on official sources. Missing a window can mean paying out of pocket for months.
      </p>
    </div>
  );
}
