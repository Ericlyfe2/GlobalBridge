"use client";

import Link from "next/link";
import { useState } from "react";
import { Landmark, ArrowLeft, CheckCircle2, X, ExternalLink, FileText } from "lucide-react";

type Country = "ca" | "uk" | "de" | "us";

type Bank = {
  name: string; country: Country;
  noSSN: boolean; freeStudent: boolean; debitFreeAbroad: boolean;
  setupTime: string; deposit: string; notes: string; url: string;
};

const banks: Bank[] = [
  { name: "Scotiabank StartRight", country: "ca", noSSN: true,  freeStudent: true,  debitFreeAbroad: false, setupTime: "Same day",    deposit: "CAD 0",  notes: "Accepts students before arrival. CAD 10k GIC option.", url: "#" },
  { name: "RBC NewComer Advantage", country: "ca", noSSN: true,  freeStudent: true,  debitFreeAbroad: false, setupTime: "1 day",       deposit: "CAD 0",  notes: "Bundle: chequing + credit card without Canadian credit history.", url: "#" },
  { name: "Monzo",                  country: "uk", noSSN: false, freeStudent: true,  debitFreeAbroad: true,  setupTime: "1–2 days",     deposit: "£0",     notes: "Mobile-only. Free abroad spend up to £200/mo.", url: "#" },
  { name: "Barclays Student Additions", country: "uk", noSSN: false, freeStudent: true,  debitFreeAbroad: false, setupTime: "5–7 days",     deposit: "£0",     notes: "Free 5-year railcard worth £100. Accepts BRP.", url: "#" },
  { name: "N26",                    country: "de", noSSN: false, freeStudent: true,  debitFreeAbroad: true,  setupTime: "10 min app",  deposit: "€0",     notes: "Online onboarding with passport. Best for non-residents.", url: "#" },
  { name: "Deutsche Bank Student",  country: "de", noSSN: false, freeStudent: true,  debitFreeAbroad: false, setupTime: "1 week",      deposit: "€0",     notes: "Branch network. Requires Anmeldung (registration).", url: "#" },
  { name: "Chase College Checking", country: "us", noSSN: false, freeStudent: true,  debitFreeAbroad: false, setupTime: "Same day",    deposit: "$0",     notes: "Needs SSN or ITIN. Branch visit required.", url: "#" },
  { name: "Wise Multi-Currency",    country: "us", noSSN: true,  freeStudent: false, debitFreeAbroad: true,  setupTime: "10 min app",  deposit: "$0",     notes: "Hold 50+ currencies. Not a bank but FDIC-insured partners.", url: "#" },
];

const flags: Record<Country, string> = { ca: "ca", uk: "gb", de: "de", us: "us" };
const labels: Record<Country, string> = { ca: "Canada", uk: "United Kingdom", de: "Germany", us: "United States" };

export default function BankingPage() {
  const [country, setCountry] = useState<Country>("ca");
  const filtered = banks.filter((b) => b.country === country);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/toolkit" className="text-sm text-ink-600 hover:text-clay-600 inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={13} /> Back to Toolkit
      </Link>

      <header className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
          <Landmark size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-semibold text-ink-900">Banking Setup</h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Open an account from your origin country. Compare which banks accept international students with no local ID.
          </p>
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

      {/* Required documents */}
      <div className="card mb-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 mb-3">
          <FileText size={16} className="text-clay-500" /> Documents you&apos;ll usually need
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-700">
          {[
            "Valid passport (with student visa stamp once you arrive)",
            "University admission / acceptance letter",
            "Proof of address (lease, dorm assignment, or Anmeldung in Germany)",
            "Proof of funds (bank statement from origin country)",
            "Local ID / residency permit (only for some accounts)",
            "Tax ID — SSN (US), SIN (CA), or local equivalent",
          ].map((d) => (
            <li key={d} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-leaf-600 mt-0.5 shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Bank comparison */}
      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 border-b border-cream-200">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-600">
              <th className="px-5 py-3">Bank</th>
              <th className="px-5 py-3 text-center">No local ID</th>
              <th className="px-5 py-3 text-center">Free for students</th>
              <th className="px-5 py-3 text-center">Free abroad</th>
              <th className="px-5 py-3">Setup time</th>
              <th className="px-5 py-3 text-right">Min. deposit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {filtered.map((b) => (
              <tr key={b.name} className="hover:bg-cream-100">
                <td className="px-5 py-4">
                  <p className="font-medium text-ink-900">{b.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{b.notes}</p>
                  <a href={b.url} className="text-xs text-clay-600 font-medium hover:underline mt-1 inline-flex items-center gap-1">
                    Open account <ExternalLink size={10} />
                  </a>
                </td>
                <Mark v={b.noSSN} />
                <Mark v={b.freeStudent} />
                <Mark v={b.debitFreeAbroad} />
                <td className="px-5 py-4 text-ink-700">{b.setupTime}</td>
                <td className="px-5 py-4 text-right font-medium text-ink-900">{b.deposit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-500 mt-4">
        ⚠ This is a general reference guide and may be out of date. Always verify on the bank&apos;s official site before applying.
      </p>
    </div>
  );
}

function Mark({ v }: { v: boolean }) {
  return (
    <td className="px-5 py-4 text-center">
      {v ? <CheckCircle2 size={16} className="text-leaf-600 inline" /> : <X size={16} className="text-ink-400 inline" />}
    </td>
  );
}
